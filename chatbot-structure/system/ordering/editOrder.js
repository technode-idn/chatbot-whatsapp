import { editingOrder, orderConfirmationSession, pendingOrders } from "../../settings/globalVariables.js";
import { getResponse } from "../security/response.js";
import { cancelOrder } from "./validationOrder.js";
import { sendQrisPayment } from './qrisPayment.js';
import { payment } from '../payment.js';
import { ongkir } from '../ongkir.js';
import { getOrderWeatherCharge } from '../weather.js';

function productNumberFromKey(key) {
    const number = key.match(/_(\d+)$/)?.[1];

    return number ? Number(number) : 0;
}

function quantityKeyFromProductKey(productKey) {
    const number = productKey.match(/_(\d+)$/)?.[1];

    return number ? `jumlah_pesanan_${number}` : "jumlah_pesanan";
}

function labelFromProductKey(productKey) {
    const number = productNumberFromKey(productKey);

    return number ? ` ${number}` : "";
}

function getProductKeys(orderData = {}) {
    return Object.keys(orderData)
        .filter(key => key === "id_produk" || /^id_produk_\d+$/.test(key))
        .sort((a, b) => productNumberFromKey(a) - productNumberFromKey(b));
}

function formatRupiah(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

async function buildOrderConfirmationMessage(userId, orderId) {
    const pendingOrder = pendingOrders[orderId];
    await getOrderWeatherCharge(orderId);
    const paymentData = await payment(orderId);
    const shippingCost = Number(await ongkir(userId, orderId)) || 0;
    const quantityCharge = Number(paymentData?.quantity_charge) || 0;
    const weatherCharge = Number(paymentData?.weather_charge) || 0;
    const productLines = (pendingOrder?.items || [])
        .map(item => {
            const productTotal = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);

            return `- ${item.productName || item.productId} (${item.quantity}) = ${formatRupiah(productTotal)}`;
        })
        .join('\n') || '-';
    const totalPrice = (Number(paymentData?.total_price) || 0) + shippingCost;

    return [
        '✅ *PRODUK TERSEDIA*',
        '=============================',
        '📦 *Rincian Pesanan*',
        productLines,
        '',
        `Ongkir: ${formatRupiah(shippingCost)}`,
        `Charge Pesanan: ${formatRupiah(quantityCharge)}`,
        `Charge Cuaca: ${formatRupiah(weatherCharge)}`,
        `*Total Harga: ${formatRupiah(totalPrice)}*`,
        '=============================',
        '',
        'Apakah kakak sudah yakin dengan pesanannya?',
        '',
        '[1] Belum (Mau Edit)',
        '[2] Lanjut Ke Pembayaran',
        '[3] Batalkan Pesanan'
    ].join('\n');
}

function buildEditOrderForm(orderId, orderData = {}) {
    const text = [
        "📝 *EDIT PESANAN*",
        "===========================",
        `Order ID: ${orderId}`,
        "",
        `Nama Pemesan: ${orderData["nama_pemesan"] || ""}`
    ];

    const productKeys = getProductKeys(orderData);

    if(productKeys.length) {
        for(const productKey of productKeys) {
            const label = labelFromProductKey(productKey);
            const quantityKey = quantityKeyFromProductKey(productKey);

            text.push(`ID Produk${label}: ${orderData[productKey] || ""}`);
            text.push(`Jumlah Pesanan${label}: ${orderData[quantityKey] || ""}`);
        }
    } else {
        text.push("ID Produk: ");
        text.push("Jumlah Pesanan: ");
    }

    text.push(`Nomor Telepon Aktif: ${orderData["nomor_telepon_aktif"] || ""}`);
    text.push(`Alamat Lengkap Pengantaran: ${orderData["alamat_lengkap_pengantaran"] || ""}`);
    text.push("");
    text.push("Silahkan edit bagian yang ingin diubah, lalu kirim ulang form ini ya kak.");

    return text.join("\n");
}

export async function askOrderConfirmation(userId, orderId) {
    const response = getResponse();

    orderConfirmationSession[userId] = {
        status: true,
        order_id: orderId
    };

    await response.send(userId, await buildOrderConfirmationMessage(userId, orderId));
}

export async function handleOrderConfirmation(text, userId) {
    const response = getResponse();
    const session = orderConfirmationSession[userId];

    if(!session?.status) {
        return false;
    }

    const orderId = session["order_id"];
    const pendingOrder = pendingOrders[orderId];

    if(text === "1") {
        if(!pendingOrder?.data) {
            delete orderConfirmationSession[userId];

            await response.send(userId, "Data pesanan tidak ditemukan. Mohon kirim ulang pesanannya ya kak.");
            return true;
        }

        editingOrder[userId] = {
            status: true,
            order_id: orderId,
            data: pendingOrder.data,
            all_data_available: getProductKeys(pendingOrder.data)
        };

        delete orderConfirmationSession[userId];

        await response.send(userId, buildEditOrderForm(orderId, pendingOrder.data));
        return true;
    } else if(text === "2") {
        delete orderConfirmationSession[userId];

        await sendQrisPayment(userId, orderId);
        return true;
    } else if(text === "3") {
        await cancelOrder(orderId);
        
        await response.send(userId, "Silahkan ketik 'keluar'.");
    } else {
        await response.send(userId, "Mohon pilih salah satu yang ada di menu ya kak");
    }

    return true;
}
