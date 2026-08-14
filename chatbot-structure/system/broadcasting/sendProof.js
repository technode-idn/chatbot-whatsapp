import { groupSession, paymentVerificationSession, pendingOrders } from "../../settings/globalVariables.js";
import fs from 'fs/promises';
import { DATABASE_PRODUCT_PATH } from "../../settings/loadFiles.js";
import { getResponse } from "../security/response.js";
import { payment } from '../payment.js';
import { ongkir } from '../ongkir.js';

const GROUP_ID = "120363405226602187@g.us";

function productNumberFromKey(key) {
    const number = key.match(/_(\d+)$/)?.[1];

    return number ? Number(number) : 0;
}

function getProductKeys(orderData = {}) {
    return Object.keys(orderData)
        .filter(key => key === "id_produk" || /^id_produk_\d+$/.test(key))
        .sort((a, b) => productNumberFromKey(a) - productNumberFromKey(b));
}

function quantityKeyFromProductKey(productKey) {
    const number = productKey.match(/_(\d+)$/)?.[1];

    return number ? `jumlah_pesanan_${number}` : 'jumlah_pesanan';
}

function formatQuantity(value) {
    const quantity = Number(String(value || '').replace(/[^\d]/g, ''));

    return quantity > 0 ? quantity : 1;
}

async function loadJsonFile(path) {
    const rawData = await fs.readFile(path, 'utf8');

    return rawData.trim() ? JSON.parse(rawData) : {};
}

function getProductName(productId, databaseProduct) {
    const normalizedProductId = String(productId || '').trim().toUpperCase();

    for(const tenant of Object.values(databaseProduct)) {
        const product = tenant?.products?.[normalizedProductId];

        if(product?.product_name) return product.product_name;
    }

    return productId || '-';
}

function formatRupiah(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

async function buildProofCaption(orderId, orderData) {
    if(!orderData) return 'Data pesanan tidak ditemukan.';

    const order = pendingOrders[orderId];
    const orderItems = order?.items || [];
    const paymentData = await payment(orderId);
    const shippingCost = Number(await ongkir(order?.customer, orderId)) || 0;
    const totalPrice = (Number(paymentData?.total_price) || 0) + shippingCost;
    const tenantLines = [...new Set(
        orderItems.map(item => item.tenantName).filter(Boolean)
    )]
        .map(tenantName => `- ${tenantName}`)
        .join('\n') || '-';

    let productLines = orderItems
        .map(item => `- ${item.productName || item.productId} (${formatQuantity(item.quantity)})`)
        .join('\n');

    if(!productLines) {
        const databaseProduct = await loadJsonFile(DATABASE_PRODUCT_PATH);
        productLines = getProductKeys(orderData)
            .map(productKey => (
                `- ${getProductName(orderData[productKey], databaseProduct)} (${formatQuantity(orderData[quantityKeyFromProductKey(productKey)])})`
            ))
            .join('\n') || '-';
    }

    return [
        '📌 *KONFIRMASI PEMBAYARAN*',
        '',
        '=============================',
        `Order ID: ${orderId}`,
        `*Nama:* ${orderData['nama_pemesan'] || '-'}`,
        `*Total:* ${formatRupiah(totalPrice)}`,
        '=============================',
        '',
        '🏪 *TENANT*',
        tenantLines,
        '',
        '📦 *PRODUK PESANAN*',
        productLines,
        '',
        '👇🏻 _Pengisian Validasi_',
        'Pembayaran Valid:',
        '',
        '*Berikan OK atau X*'
    ].join('\n');
}

export async function sendProofToGroup(proofPhoto, orderId, orderData) {
    const response = getResponse();
    const caption = await buildProofCaption(orderId, orderData);

    await response.sendMedia(GROUP_ID, proofPhoto, caption);

    groupSession[GROUP_ID] = true;
    paymentVerificationSession[GROUP_ID] = orderId;
}
