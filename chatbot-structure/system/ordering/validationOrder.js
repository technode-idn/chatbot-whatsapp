import fs from 'fs/promises';
import crypto from 'crypto';
import { DATABASE_PRODUCT_PATH, DATA_USERS_PATH, rawDatabaseProduct, rawDataUsers } from "../../settings/loadFiles.js";
import { editingOrder, paymentStatus, pendingOrders } from "../../settings/globalVariables.js";

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
    return database_product.find(product => (
        normalizeProductId(product["id_produk"] || product["id_product"]) === productId
    ));
}

function buildUnavailableMessage(unavailableItems) {
    const text = ['Mohon Maaf:\n'];

    for(const item of unavailableItems) {
        const label = item.label ? ` ${item.label}` : '';
        text.push(`Produk${label} (${item.productId}) sedang tidak tersedia.\n`);
    }

    text.push('\nApakah kakak ingin mengganti produk?\n[1] Ya\n[2] Tidak');

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

export async function validationOrder(orderData, userId, editingStatus, client) {
    const orderId = editingStatus
        ? (orderData["order_id"] || editingOrder[userId]?.["order_id"])
        : "ORD-" + crypto.randomBytes(5).toString("hex").toUpperCase();

    if(!orderId) {
        await client.sendMessage(
            userId,
            'Order ID tidak ditemukan. Mohon kirim ulang form penggantinya.'
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

    if(!orderItems.length) {
        delete pendingOrders[orderId];
        delete editingOrder[userId];

        await client.sendMessage(
            userId,
            'Tidak ada produk yang bisa diproses di pesanan ini.'
        );

        return { success: false };
    }

    const pendingOrder = pendingOrders[orderId] || {};
    pendingOrder.customer = userId;
    pendingOrder.order_id = orderId;
    pendingOrder.data = orderDataFinal;
    pendingOrder.processed_product_keys = pendingOrder.processed_product_keys || [];
    pendingOrders[orderId] = pendingOrder;

    const unavailableItems = [];
    let hasNewAvailableProduct = false;

    for(const item of orderItems) {
        if(pendingOrder.processed_product_keys.includes(item.productKey)) {
            continue;
        }

        const product = findProduct(item.productId);
        const stock = Number(product?.["total_product"]) || 0;

        if(!product || stock < item.quantity) {
            unavailableItems.push(item);
            continue;
        }

        const unitPrice = parsePrice(product["product_unit_price"]);

        users.push({
            order_id: orderId,
            user_id: userId,
            product_id: item.productId,
            created_at: new Date().toISOString(),
            customer_name: orderDataFinal["nama_pemesan"],
            number: orderDataFinal["nomor_telepon_aktif"],
            address: orderDataFinal["alamat_lengkap_pengantaran"],
            tenant_name: product["tenant_name"],
            total_product: item.quantity,
            product_unit_price: unitPrice,
            total_price: unitPrice * item.quantity
        });

        product["total_product"] = stock - item.quantity;
        pendingOrder.processed_product_keys.push(item.productKey);
        hasNewAvailableProduct = true;
    }

    if(hasNewAvailableProduct) {
        await persistData();
    }

    if(unavailableItems.length > 0) {
        editingOrder[userId] = {
            status: true,
            order_id: orderId,
            data: orderDataFinal,
            all_data_available: unavailableItems.map(item => item.productKey)
        };

        await client.sendMessage(
            userId,
            buildUnavailableMessage(unavailableItems)
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

    await client.sendMessage(
        userId,
        'Produk tersedia.\n\nUntuk informasi pembayarannya, kakak bisa pilih:\n\n[1] Cash (bayar di tempat)\n[2] QRIS\n\nSilahkan diinformasikan mau pakai metode yang mana ya kak?'
    );

    return {
        success: true,
        order_id: orderId
    };
}
