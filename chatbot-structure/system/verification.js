import fs from 'fs/promises';
import { paymentVerificationSession, pendingOrders, pendingProof } from "../settings/globalVariables.js";
import { inputDelivery } from "./broadcasting/sendDelivery.js";
import { DATA_USERS_PATH } from '../settings/loadFiles.js';
import { getResponse } from './security/response.js';

async function loadDataUsers() {
    const dataUsers = await fs.readFile(DATA_USERS_PATH, 'utf8');

    return dataUsers.trim() ? JSON.parse(dataUsers) : [];
}

function parseKeyValueText(text) {
    const data = {};
    const lines = text.split('\n').map(item => item.trim());

    for(const line of lines) {
        const match = line.match(/^\s*([^:]+?)\s*:\s*(.*)$/)
            || line.match(/^\s*([^>-]+?)\s*->\s*(.*)$/);

        if(match) {
            const key = match[1]
                .trim()
                .toLowerCase()
                .replace(/^[^a-z0-9]+/i, '')
                .replace(/\s+/g, '_');

            if(key && key.startsWith('status') && data[key]) {
                continue;
            }

            if(key) {
                data[key] = match[2].trim();
            }
        }
    }

    return data;
}

function readPaymentStatus(status) {
    const rawStatus = String(status || '').trim();
    const normalizedStatus = rawStatus.toLowerCase();
    const compactStatus = normalizedStatus.replace(/[^a-z0-9]/g, '');
    const firstLineStatus = rawStatus
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(Boolean);

    if(!rawStatus) {
        return 'unknown';
    }

    if(firstLineStatus && firstLineStatus !== rawStatus) {
        const firstLineResult = readPaymentStatus(firstLineStatus);

        if(firstLineResult !== 'unknown') {
            return firstLineResult;
        }
    }

    if(/[❌✖✗]/.test(rawStatus)) {
        return 'invalid';
    }

    if(['x', 'no', 'n', 'tidak', 'invalid', 'gagal', 'salah', 'batal'].includes(compactStatus)) {
        return 'invalid';
    }

    if(/\b(tidak|invalid|gagal|salah|batal)\b/.test(normalizedStatus)) {
        return 'invalid';
    }

    if(/[✅✔]/.test(rawStatus)) {
        return 'valid';
    }

    if(['ok', 'oke', 'valid', 'sesuai', 'benar', 'lunas', 'ya', 'yes', 'y', 'done', 'paid', 'sudah', 'berhasil'].includes(compactStatus)) {
        return 'valid';
    }

    if(/\b(ok|oke|valid|sesuai|benar|lunas|paid|done|sudah|berhasil)\b/.test(normalizedStatus)) {
        return 'valid';
    }

    return 'unknown';
}

export async function verificationPayment(text, client, fallbackOrderId = null) {
    const response = getResponse();
    const data = parseKeyValueText(text);
    const users = await loadDataUsers();
    const orderId = data["order_id"] || fallbackOrderId;
    const firstLineStatus = String(text || '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(Boolean);
    const paymentVerificationStatus = readPaymentStatus(
        data["status"] || data["status_pembayaran"] || (fallbackOrderId ? text : firstLineStatus)
    );

    if(!orderId) {
        return {
            success: false,
            message: 'Order ID pembayaran belum terbaca. Pastikan formatnya berisi "Order ID: ..."'
        };
    }

    let customerId = null;

    for(const user of users) {
        if(String(user["order_id"]) === String(orderId)) {
            customerId = user["user_id"];
            break;
        }
    }

    if(!customerId) {
        return {
            success: false,
            message: 'Data customer tidak ditemukan untuk Order ID tersebut.'
        };
    }

    if(paymentVerificationStatus === 'valid') {
        await inputDelivery(orderId, client);

        delete pendingProof[customerId];
        delete pendingOrders[orderId];
        delete paymentVerificationSession['120363407187484870@g.us'];

        await response.send(customerId, 'Pembayaran berhasil diverifikasi. Pesanan akan segera kami proses.');

        return {
            success: true,
            message: 'Pembayaran valid. Permintaan pengiriman sudah dikirim.'
        };
    }

    if(paymentVerificationStatus === 'unknown') {
        return {
            success: false,
            message: 'Status pembayaran belum terbaca. Gunakan "Status: OK" untuk valid atau "Status: X" untuk tidak valid.'
        };
    }

    await response.send(customerId, "Bukti pembayaran tidak valid, silakan kirim ulang.");

    delete paymentVerificationSession['120363407187484870@g.us'];

    return {
        success: false,
        message: 'Pembayaran ditandai tidak valid. Customer diminta mengirim ulang bukti.'
    };
}
