import fs from 'fs/promises';
import { sendOrderToOwner } from '../settings/tenantBroadcasting.js';

export const sessions = {};

export async function ordering(text, userId, client) {
    try {
        const data = {};

        const lines = text.split('\n').map(item => item.trim());

        for (const line of lines) {

            if (line.includes(':')) {
                const[key, value] = line.split(':');

                data[key.replace('📌','').trim()] = value.trim();
            }

        }

        await sendOrderToOwner(client, data, userId);

        delete sessions[userId];

        return ('Mohon ditunggu sebantar ya kak, kami sedang memeriksa ketersediaan produk 😊');

    } catch(error) {
        console.log(error);

        return('Format yang dikirim tidak sesuai');

    }

}