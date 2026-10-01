import whatsappWeb from 'whatsapp-web.js';
import { payment } from '../payment.js';
import { ongkir } from '../ongkir.js';
import { getResponse } from '../security/response.js';
import { pendingOrders, pendingProof, paymentStatus } from '../../settings/globalVariables.js';

const { MessageMedia } = whatsappWeb;

export async function sendQrisPayment(userId, orderId) {
    const response = getResponse();
    const paymentData = await payment(orderId);

    if(!paymentData) {
        await response.send(userId, 'Data pembayaran belum ditemukan. Mohon coba lagi setelah pesanan dikonfirmasi.');
        return false;
    }

    if(!paymentData.qris_photo) {
        await response.send(userId, 'QRIS tenant belum ditemukan. Mohon hubungi admin.');
        return false;
    }

    const isPickup = pendingOrders[orderId]?.fulfillment === 'PICKUP';
    const shippingCost = isPickup ? 0 : Number(await ongkir(userId, orderId)) || 0;
    const totalPayment = (Number(paymentData.total_price) || 0) + shippingCost;
    const weatherCharge = Number(paymentData.weather_charge) || 0;
    const weatherChargeMessage = weatherCharge
        ? `\n\nCharge cuaca (${paymentData.weather_condition}): *Rp ${weatherCharge}*`
        : '';

    await response.sendMedia(
        userId,
        MessageMedia.fromFilePath(paymentData.qris_photo),
        `Total harga yang harus dibayar sejumlah *Rp ${totalPayment}*${weatherChargeMessage}${isPickup ? '\n\nPesanan akan diambil sendiri di tenant terkait.' : ''}\n\nMohon konfirmasi dan screenshot jika pembayaran sudah dilakukan.`
    );

    pendingProof[userId] = orderId;
    if(pendingOrders[orderId]) {
        pendingOrders[orderId].updated_at = new Date().toISOString();
    }
    delete paymentStatus[userId];

    return true;
}
