import { groupSession, paymentVerificationSession } from "../../settings/globalVariables.js";
import fs from 'fs/promises';
import { DATABASE_PRODUCT_PATH } from "../../settings/loadFiles.js";
import { getResponse } from "../security/response.js";

const GROUP_ID = '120363407187484870@g.us';

function productNumberFromKey(key) {
    const number = key.match(/_(\d+)$/)?.[1];

    return number ? Number(number) : 0;
}

function quantityKeyFromProductKey(productKey) {
    const number = productKey.match(/_(\d+)$/)?.[1];

    return number ? `jumlah_pesanan_${number}` : "jumlah_pesanan";
}

function getProductKeys(orderData = {}) {
    return Object.keys(orderData)
        .filter(key => key === "id_produk" || /^id_produk_\d+$/.test(key))
        .sort((a, b) => productNumberFromKey(a) - productNumberFromKey(b));
}

async function loadJsonFile(path) {
    const rawData = await fs.readFile(path, 'utf8');

    return rawData.trim() ? JSON.parse(rawData) : {};
}

function getProductName(productId, databaseProduct) {
    const normalizedProductId = String(productId || '').trim().toUpperCase();

    for(const tenant of Object.values(databaseProduct)) {
        const product = tenant?.products?.[normalizedProductId];

        if(product?.product_name) {
            return product.product_name;
        }
    }

    return productId || "-";
}

async function buildProofCaption(orderId, orderData) {
    if(!orderData) {
        return "Data pesanan tidak ditemukan.";
    }

    const databaseProduct = await loadJsonFile(DATABASE_PRODUCT_PATH);

    const text = [
        "📌 *KONFIRMASI PEMBAYARAN*",
        "",
        `Order ID: ${orderId}`,
        "=============================",
        `Nama: ${orderData["nama_pemesan"] || "-"}`,
        `Alamat Pengantaran: ${orderData["alamat_lengkap_pengantaran"] || "-"}`,
        `Nomor: ${orderData["nomor_telepon_aktif"] || "-"}`,
        "=============================",
        "",
        "📦 *PRODUK*"
    ];

    let num = 1;

    for(const productKey of getProductKeys(orderData)) {
        const quantityKey = quantityKeyFromProductKey(productKey);
        const productName = getProductName(orderData[productKey], databaseProduct);

        text.push(`[${num}] ${productName} * ${orderData[quantityKey] || 1}`);
        num += 1;
    }

    text.push("", "Pembayaran Valid:", "", "*_Berikan OK atau X_*");

    return text.join("\n");
}

export async function sendProofToGroup(message, orderId, orderData, client) {
    const caption = await buildProofCaption(orderId, orderData);
    const response = getResponse();
    
    await response.sendMedia(GROUP_ID, message, caption);

    groupSession[GROUP_ID] = true;
    paymentVerificationSession[GROUP_ID] = orderId;
}
