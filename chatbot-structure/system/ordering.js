import fs from 'fs/promises';
import { sendOrderToGroup } from './broadcasting/sendOrder.js';
import { sessions } from '../settings/globalVariables.js';

export async function ordering(text, userId, client) {
    // Ekstraksi Form Pesanan Customer
    // ===============================
    try {
        const data = {};

        const lines = text.split('\n').map(item => item.toLowerCase().trim());

        for (const line of lines) {

            if (line.includes('📌')) {
                const [key, ...valueParts] = line.split(':');
                const normalizedKey = key
                    .replace('📌','')
                    .trim()
                    .replace(/\s+/g, '_')

                data[normalizedKey] = valueParts.join(':').trim();
            }

        }

        // Mengirim Informasi Pesanan Ke Group Tenant
        // ==========================================
        await sendOrderToGroup(data, userId, client);

        delete sessions[userId];

        return ('Mohon ditunggu sebantar ya kak, kami sedang memeriksa ketersediaan produk 😊');

    } catch(error) {
        console.log(error);

        return('Format yang dikirim tidak sesuai');

    }

}
