import whatsappWeb from 'whatsapp-web.js';
import { payment } from '../payment.js';
import { ongkir } from '../ongkir.js';
import { getResponse } from '../security/response.js';
import { pendingProof, paymentStatus } from '../../settings/globalVariables.js';

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

    const shippingCost = Number(await ongkir(userId, orderId)) || 0;
    const totalPayment = (Number(paymentData.total_price) || 0) + shippingCost;
    const quantityCharge = Number(paymentData.quantity_charge) || 0;
    const quantityChargeMessage = quantityCharge
        ? `\nBiaya tambahan ${paymentData.extra_item_quantity} barang: *Rp ${quantityCharge}*`
        : '';

    await response.sendMedia(
        userId,
        MessageMedia.fromFilePath(paymentData.qris_photo),
        `Total harga yang harus dibayar sejumlah *Rp ${totalPayment}*\n\nTotal harga produk: *Rp ${paymentData.product_total}*${quantityChargeMessage}\nOngkir: *Rp ${shippingCost}*\n\nMohon konfirmasi dan screenshot jika pembayaran sudah dilakukan.`
    );

    pendingProof[userId] = orderId;
    delete paymentStatus[userId];

    return true;
}
