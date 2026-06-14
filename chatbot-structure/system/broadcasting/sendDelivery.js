import fs from 'fs/promises';
import { deliverySession, groupSession } from "../../settings/globalVariables.js";
import { rawDataUsers, rawDataUsers } from '../../settings/loadFiles.js';

const GROUP_ID = '120363407187484870@g.us';

async function loadDataUsers() {
    const dataUsers = await fs.readFile(rawDataUsers, 'utf8');

    return dataUsers.trim() ? JSON.parse(dataUsers) : [];
}

export async function inputDelivery(orderId, client) {

    await client.sendMessage(
        GROUP_ID,
        `MOHON KONFIRMASI PENGIRIMAN\n==========================\nOrder ID: ${orderId}\n\nID Pengirim: \nNomor Pengirim: `
    );

    deliverySession[GROUP_ID] = true;

    return;
}

export async function handleDeliveryResponse(text, client) {
    const data = {};
    const users = await loadDataUsers();
    const lines = text.split('\n');
    let customerId = null;

    for(const line of lines) {

        if(line.includes(':')) {

            const [key, ...valueParts] = line.split(':');

            data[key.trim().toLowerCase().replaceAll(' ', '_')] =
                valueParts.join(':').trim();
        }
    }

    for(const user of users) {

        if(String(user["order_id"]) === String(data["order_id"])) {

            customerId = user["user_id"];
            break;
        }
    }

    if(!customerId) {
        return;
    }

    const deliveryName = data.find(name => String(name["id_delivery"]) === data["id_pengirim"]);

    await client.sendMessage(
        customerId,
        `Informasi Pengiriman:\n\nNama Pengirim: ${deliveryName["name"]}\nNomor Pengirim: ${data["nomor_pengirim"]}`
    );

    delete deliverySession[GROUP_ID];

    delete groupSession[GROUP_ID];
}
