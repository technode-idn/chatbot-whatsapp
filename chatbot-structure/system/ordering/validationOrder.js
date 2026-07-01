import fs from 'fs/promises';
import crypto from 'crypto';
import { DATABASE_PRODUCT_PATH, DATA_USERS_PATH, rawDatabaseProduct, rawDataUsers } from "../../settings/loadFiles.js";
import { editingOrder, paymentStatus, pendingOrders } from "../../settings/globalVariables.js";
import { getResponse } from '../security/response.js';

const database_product = JSON.parse(rawDatabaseProduct);
const users = rawDataUsers.trim() ? JSON.parse(rawDataUsers) : [];

function parsePrice(value) {
    const digits = String(value || '').replace(/[^\d]/g, '');

    return digits ? Number(digits) : 0;
}

function parseQuantity(value) {
    const digits = String(value || '').replace(/[^\d]/g, '');
    const quantity = digits ? Number(digits) : 1;

    return quantity > 0 ? quantity : 1;
}

function normalizeProductId(value) {
    return String(value || '').trim().toUpperCase();
}

function productNumberFromKey(key) {
    const number = key.match(/_(\d+)$/)?.[1];

    return number ? Number(number) : 0;
}

function quantityKeyFromProductKey(productKey) {
    const number = productKey.match(/_(\d+)$/)?.[1];

    return number ? `jumlah_pesanan_${number}` : 'jumlah_pesanan';
}

function getOrderItems(orderData) {
    return Object.keys(orderData)
        .filter(key => key === 'id_produk' || /^id_produk_\d+$/.test(key))
        .sort((a, b) => productNumberFromKey(a) - productNumberFromKey(b))
        .map(productKey => {
            const quantityKey = quantityKeyFromProductKey(productKey);
            const productNumber = productNumberFromKey(productKey);

            return {
                productKey,
                quantityKey,
                label: productNumber ? String(productNumber) : '',
                productId: normalizeProductId(orderData[productKey]),
                quantity: parseQuantity(orderData[quantityKey])
            };
        })
        .filter(item => item.productId);
}

function findProduct(productId) {
    if(Array.isArray(database_product)) {
        const product = database_product.find(product => (
            normalizeProductId(product["id_produk"] || product["id_product"]) === productId
        ));

        return product ? { product } : null;
    }

    for(const [tenantKey, tenant] of Object.entries(database_product || {})) {
        const products = tenant?.["products"] || {};

        for(const [id, product] of Object.entries(products)) {
            if(normalizeProductId(id) === productId || normalizeProductId(product["id_produk"] || product["id_product"]) === productId) {
                return {
                    product,
                    productId: id,
                    tenantName: tenant["tenant_name"] || tenant["store"] || tenantKey
                };
            }
        }
    }

    return null;
}

function getProductStock(product) {
    return Number(product?.["total_product"] ?? product?.["stock"] ?? 0) || 0;
}

function setProductStock(product, stock) {
    if(Object.prototype.hasOwnProperty.call(product, "stock")) {
        product["stock"] = stock;
        return;
    }

    product["total_product"] = stock;
}

function getProductPrice(product) {
    return parsePrice(product?.["product_unit_price"] ?? product?.["price"]);
}

function buildUnavailableMessage(unavailableItems) {
    const text = [];

    for(const item of unavailableItems) {
        text.push(`❌ Produk *${item.productName}* sedang tidak tersedia.\n`);
    }

    text.push('\nIngin mengganti produk:\n[1] Ya\n[2] Tidak');

    return text.join('');
}

async function persistData() {
    await fs.writeFile(
        DATA_USERS_PATH,
        JSON.stringify(users, null, 4)
    );

    await fs.writeFile(
        DATABASE_PRODUCT_PATH,
        JSON.stringify(database_product, null, 2)
    );
}

async function reserveStock({orderId, userId, orderData, orderItems}) {

    let pendingOrder = [orderId];

    if (!pendingOrder) {

        pendingOrder = {

            order_id: orderId,

            customer: userId,

            status: "PENDING_PAYMENT",

            created_at: new Date().toISOString(),

            customerInfo: {

                name: orderData["nama_pemesan"],

                phone: orderData["nomor_telepon_aktif"],

                address: orderData["alamat_lengkap_pengantaran"]

            },

            data: orderData,

            items: []

        };

    } else {

        pendingOrder.customer = userId;

        pendingOrder.status = "PENDING_PAYMENT";

        pendingOrder.data = orderData;

        pendingOrder.customerInfo = {

            name: orderData["nama_pemesan"],

            phone: orderData["nomor_telepon_aktif"],

            address: orderData["alamat_lengkap_pengantaran"]

        };

    }

    const unavailableItems = [];
    let reserved = false;

    for (const item of orderItems) {

        // produk sudah pernah berhasil di-reserve
        if (
            pendingOrder.items.some(
                reservedItem =>
                    reservedItem.productKey === item.productKey
            )
        ) {
            continue;
        }

        const productEntry = findProduct(item.productId);

        const product = productEntry?.product;

        if (!product) {

            unavailableItems.push({
                ...item,
                productName: item.productId
            });

            continue;
        }

        const stock = getProductStock(product);

        if (stock < item.quantity) {

            unavailableItems.push({

                ...item,

                productName:

                    product.product_name ||

                    product.name ||

                    item.productId

            });

            continue;
        }

        // reserve stok
        setProductStock(
            product,
            stock - item.quantity
        );

        pendingOrder.items.push({

            productKey: item.productKey,

            quantityKey: item.quantityKey,

            productId: item.productId,

            productName:

                product.product_name ||

                product.name ||

                item.productId,

            tenantName:

                product.tenant_name ||

                productEntry?.tenantName ||

                null,

            quantity: item.quantity,

            unitPrice: getProductPrice(product),

            reservedAt: new Date().toISOString()

        });

        reserved = true;

    }

    pendingOrders[orderId] = pendingOrder;

    if (reserved) {
        await persistData();
    }

    return {

        success: unavailableItems.length === 0,

        unavailableItems

    };

}

export async function validationOrder(orderData, userId, editingStatus) {
    const response = getResponse();

    const orderId = editingStatus ? (orderData.order_id || editingOrder[userId]?.order_id) : `ORD-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;

    if (!orderId) {
        await response.send(
            userId,
            "Order ID tidak ditemukan. Mohon kirim ulang form penggantinya."
        );

        return { success: false };
    }

    const existingPendingOrder = pendingOrders[orderId];

    const orderDataFinal = {
        ...(editingStatus ? existingPendingOrder?.data : {}),
        ...orderData,
        order_id: orderId
    };

    const orderItems = getOrderItems(orderDataFinal);

    if (!orderItems.length) {
        delete pendingOrders[orderId];
        delete editingOrder[userId];

        await response.send(
            userId,
            "Tidak ada produk yang bisa diproses."
        );

        return { success: false };
    }

    const reserveResult = await reserveStock({
        orderId,
        userId,
        orderData: orderDataFinal,
        orderItems,
        editingStatus
    });

    if (!reserveResult.success) {

        editingOrder[userId] = {
            status: true,
            order_id: orderId,
            data: orderDataFinal,
            all_data_available: reserveResult.unavailableItems.map(
                item => item.productKey
            )
        };

        await response.send(
            userId,
            buildUnavailableMessage(reserveResult.unavailableItems)
        );

        return {
            success: false,
            requiresEditing: true,
            order_id: orderId
        };
    }

    delete editingOrder[userId];

    paymentStatus[userId] = {
        status: true,
        order_id: orderId
    };

    await response.send(
        userId,
        "✅ *PRODUK TERSEDIA*\n\nUntuk informasi pembayarannya, kakak bisa pilih 🙏\n\n[1] Cash (bayar di tempat)\n[2] QRIS\n\nSilahkan diinformasikan mau pakai metode yang mana ya kak?"
    );

    return {
        success: true,
        order_id: orderId
    };
}

export async function completeOrder(orderId) {

    const pendingOrder = pendingOrders[orderId];

    if (!pendingOrder) {
        return {
            success: false,
            message: "Order tidak ditemukan."
        };
    }

    const completedAt = new Date().toISOString();

    for (const item of pendingOrder.items) {

        users.push({

            order_id: pendingOrder.order_id,

            user_id: pendingOrder.customer,

            created_at: completedAt,

            customer_name: pendingOrder.customerInfo.name,

            number: pendingOrder.customerInfo.phone,

            address: pendingOrder.customerInfo.address,

            tenant_name: item.tenantName,

            product_id: item.productId,

            total_product: item.quantity,

            product_unit_price: item.unitPrice,

            total_price: item.unitPrice * item.quantity

        });

        const productEntry = findProduct(item.productId);

        if (productEntry?.product) {

            productEntry.product.qty_sold =
                (Number(productEntry.product.qty_sold) || 0)
                + item.quantity;

        }

    }

    pendingOrder.status = "COMPLETED";
    pendingOrder.completed_at = completedAt;

    await persistData();

    delete pendingOrders[orderId];

    return {
        success: true,
        order_id: orderId
    };

}

export async function cancelOrder(orderId) {

    const pendingOrder = pendingOrders[orderId];

    if (!pendingOrder) {
        return {
            success: false,
            message: "Order tidak ditemukan."
        };
    }

    for (const item of pendingOrder.items) {

        const productEntry = findProduct(item.productId);

        if (!productEntry?.product) {
            continue;
        }

        const product = productEntry.product;

        const currentStock = getProductStock(product);

        setProductStock(
            product,
            currentStock + item.quantity
        );

    }

    pendingOrder.status = "CANCELLED";
    pendingOrder.cancelled_at = new Date().toISOString();

    await persistData();

    delete paymentStatus[pendingOrder.customer];
    delete editingOrder[pendingOrder.customer];
    delete pendingOrders[orderId];

    return {
        success: true,
        order_id: orderId
    };

}