import {
    courierAvailabilitySession,
    courierDecisionSession,
    groupSession,
    pendingOrders
} from '../../settings/globalVariables.js';
import { cancelOrder } from '../ordering/validationOrder.js';
import { sendQrisPayment } from '../ordering/qrisPayment.js';
import { getResponse } from '../security/response.js';

// Grup operasional kurir yang juga digunakan saat informasi pengiriman dikirim.
const GROUP_ID = '120363431265939870@g.us';

function getDeliveryAddress(orderId) {
    const order = pendingOrders[orderId];

    return order?.customerInfo?.address
        || order?.data?.['alamat_lengkap_pengantaran']
        || '-';
}

export async function startCourierAvailability(userId, orderId) {
    const response = getResponse();

    if(!pendingOrders[orderId]) {
        await response.send(userId, 'Data pesanan tidak ditemukan. Mohon kirim ulang pesanan kakak.');
        return false;
    }

    if(courierAvailabilitySession[GROUP_ID]) {
        await response.send(userId, 'Mohon ditunggu sebentar ya ka. Kami sedang memeriksa ketersediaan kurir untuk pesanan sebelumnya.');
        return false;
    }

    courierAvailabilitySession[GROUP_ID] = { orderId, customerId: userId };
    courierDecisionSession[userId] = { status: 'checking', order_id: orderId };
    groupSession[GROUP_ID] = true;

    await response.send(userId, 'Mohon ditunggu sebentar ya ka. kami sedang memeriksa ketersediaan kurir');
    await response.send(
        GROUP_ID,
        [
            `Ada pesanan masuk untuk pengiriman ke ${getDeliveryAddress(orderId)}. Adakah kurir yang bersedia mengantar?`,
            '[1] Ada',
            '[2] Tidak Ada',
            '*Rincian pesanan akan diberikan jika ada kurir yang bersedia*'
        ].join('\n')
    );

    return true;
}

export async function handleCourierAvailabilityResponse(text, groupId = GROUP_ID) {
    const response = getResponse();
    const availability = courierAvailabilitySession[groupId];

    if(!availability) return { success: false };

    const { customerId, orderId } = availability;
    delete courierAvailabilitySession[groupId];
    delete groupSession[groupId];

    if(!pendingOrders[orderId]) {
        delete courierDecisionSession[customerId];
        return { success: false, message: 'Pesanan ini sudah tidak aktif.' };
    }

    if(String(text).trim() === '1') {
        courierDecisionSession[customerId] = { status: 'courier-available', order_id: orderId };
        await response.send(customerId, 'Kurir Tersedia. Ingin lanjutkan pesanan?\n\n[1] Ya\n[2] Tidak');
        return { success: true, message: 'Customer telah diberi tahu bahwa kurir tersedia.' };
    }

    courierDecisionSession[customerId] = { status: 'pickup-offer', order_id: orderId };
    await response.send(customerId, 'Tidak ada kurir yang bersedia mengantar saat ini. Ingin batalkan pesanan?\n\n[1] Ya\n[2] Tidak, saya ambil sendiri saja ke tempat');
    return { success: true, message: 'Customer telah diberi pilihan pembatalan atau ambil sendiri.' };
}

export async function handleCourierDecision(text, userId) {
    const response = getResponse();
    const session = courierDecisionSession[userId];

    if(!session?.status) return false;

    if(session.status === 'checking') {
        await response.send(userId, 'Mohon ditunggu sebentar ya ka. Kami masih memeriksa ketersediaan kurir.');
        return true;
    }

    if(text !== '1' && text !== '2') {
        await response.send(userId, 'Mohon pilih salah satu pilihan yang tersedia.');
        return true;
    }

    const shouldPay = (session.status === 'courier-available' && text === '1')
        || (session.status === 'pickup-offer' && text === '2');

    delete courierDecisionSession[userId];

    if(shouldPay) {
        await sendQrisPayment(userId, session.order_id);
        return true;
    }

    await cancelOrder(session.order_id);
    await response.send(userId, 'Pesanan dibatalkan.');
    return true;
}
