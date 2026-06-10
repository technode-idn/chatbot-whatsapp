import fs from 'fs/promises';
import { deliverySession } from "../../settings/globalVariables.js";

const GROUP_ID = '120363407187484870@g.us';
const DATA_USERS_PATH = './chatbot-structure/data/data_form_users.json';

async function loadDataUsers() {
    const rawDataUsers = await fs.readFile(DATA_USERS_PATH, 'utf8');

    return rawDataUsers.trim()
        ? JSON.parse(rawDataUsers)
        : [];
}

export async function inputDelivery(orderId, client) {

    await client.sendMessage(
        GROUP_ID,
        `MOHON KONFIRMASI PENGIRIMAN\n==========================\nOrder ID: ${orderId}\n\nNama Pengirim: \nNomor Pengirim: `
    );

    deliverySession[GROUP_ID] = true;

    return;
}

export async function handleDeliveryResponse(text, client) {

    const data = {};
    const users = await loadDataUsers();

    const lines = text.split('\n');

    for(const line of lines) {

        if(line.includes(':')) {

            const [key, ...valueParts] = line.split(':');

            data[key.trim().toLowerCase().replaceAll(' ', '_')] =
                valueParts.join(':').trim();
        }
    }

    let customerId = null;

    for(const user of users) {

        if(String(user.order_id) === String(data.order_id)) {

            customerId = user.user_id;
            break;
        }
    }

    if(!customerId) {
        return;
    }

    await client.sendMessage(
        customerId,
        `Informasi Pengiriman:\n\nNama Pengirim: ${data.nama_pengirim}\nNomor Pengirim: ${data.nomor_pengirim}`
    );

    delete deliverySession[GROUP_ID];
}
