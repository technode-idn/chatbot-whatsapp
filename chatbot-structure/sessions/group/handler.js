import { paymentVerificationSession, groupSession, deliverySession } from '../../settings/globalVariables.js';
import { verificationPayment } from '../../system/verification.js';
import { handleDeliveryResponse } from '../../system/broadcasting/sendDelivery.js';

function isPaymentResponse(text) {
    return /^\s*order id\s*(?::|->)/im.test(text)
        && (text.toLowerCase().includes('pembayaran') || /^\s*(?:\|\s*)?status\s*(?::|->)/im.test(text));
}

function isDeliveryResponse(text) {
    const hasOrderId = /^\s*order id\s*(?::|->)/im.test(text);
    const hasDeliveryField = /^\s*(?:id|nim|nama|nomor) pengirim\s*(?::|->)/im.test(text);

    return hasDeliveryField || (hasOrderId && text.toLowerCase().includes('pengiriman'));
}

function isPaymentDecision(text) {
    const rawText = String(text || '').trim();
    const firstLine = rawText.split(/\r?\n/).map(line => line.trim()).find(Boolean);
    const statusMatch = rawText.match(/^\s*(?:\|\s*)?status(?:\s+pembayaran)?\s*(?::|->)\s*(.+)$/im);
    const knownStatuses = ['ok', 'oke', 'valid', 'sesuai', 'benar', 'lunas', 'ya', 'yes', 'y', 'done', 'paid', 'sudah', 'berhasil', 'x', 'no', 'n', 'tidak', 'invalid', 'gagal', 'salah', 'batal'];

    return [firstLine, statusMatch?.[1], rawText].some(candidate =>
        knownStatuses.includes(String(candidate || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
    );
}

export async function handleGroupSession({ userId, text, message, client }) {
    if(!userId.endsWith('@g.us')) return false;
    if(!groupSession[userId]) return true;

    if(paymentVerificationSession[userId] && isPaymentDecision(text)) {
        await verificationPayment(text, client, paymentVerificationSession[userId]);
        return true;
    }

    if(isPaymentResponse(text)) {
        await verificationPayment(message.body, client);
        return true;
    }

    if(deliverySession[userId] && isDeliveryResponse(text)) {
        await handleDeliveryResponse(text, client, deliverySession[userId]);
    }

    return true;
}
