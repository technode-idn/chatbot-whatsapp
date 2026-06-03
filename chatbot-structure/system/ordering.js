import fs from 'fs/promises';
import { sendOrderToGroup } from './broadcasting.js';
import { sessions } from '../settings/globalVariables.js';

export async function ordering(client, text, userId) {
    // Ekstraksi Form Pesanan Customer
    // ===============================
    try {
        const data = {};

        const lines = text.split('\n').map(item => item.toLowerCase().trim());

        for (const line of lines) {

            if (line.includes('📌')) {
                const[key, value] = line.split(':');

                data[key.replace('📌','').trim().replace(' ', '_')] = value.trim();
            }

        }

        // Mengirim Informasi Pesanan Ke Group Tenant
        // ==========================================
        await sendOrderToGroup(client, data, userId);

        delete sessions[userId];

        return ('Mohon ditunggu sebantar ya kak, kami sedang memeriksa ketersediaan produk 😊');

    } catch(error) {
        console.log(error);

        return('Format yang dikirim tidak sesuai');

    }

}