import fs from 'fs/promises';
import { deliverySession, groupSession } from "../../settings/globalVariables.js";
import { DATA_DELIVERY_PATH, DATA_USERS_PATH } from '../../settings/loadFiles.js';
import { getResponse } from '../security/response.js';

const GROUP_ID = '120363407187484870@g.us';

async function loadJsonFile(path) {
    const rawData = await fs.readFile(path, 'utf8');

    return rawData.trim() ? JSON.parse(rawData) : [];
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

            if(key) {
                data[key] = match[2].trim();
            }
        }
    }

    return data;
}

export async function inputDelivery(orderId, client) {
    const response = getResponse();

    await response.send(
        GROUP_ID,
        `🛵 *KONFIRMASI PENGIRIMAN*\n==========================\nOrder ID: ${orderId}\n\nNIM Pengirim: `,
        "normal"
    );

    deliverySession[GROUP_ID] = orderId;
    groupSession[GROUP_ID] = true;
}

export async function handleDeliveryResponse(text, client, fallbackOrderId = null) {
    const response = getResponse();
    const data = parseKeyValueText(text);
    const users = await loadJsonFile(DATA_USERS_PATH);
    const deliveries = await loadJsonFile(DATA_DELIVERY_PATH);
    const orderId = data["order_id"] || fallbackOrderId;
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

    const deliveryPerson = deliveries.find(delivery => (
        String(delivery["id_delivery"]) === String(data["id_pengirim"])
    ));

    if(!deliveryPerson) {
        return {
            success: false,
            message: 'Data pengirim tidak ditemukan. Pastikan ID Pengirim sesuai database delivery.'
        };
    }

    const deliveryName = deliveryPerson["name"];
    const deliveryPhone = deliveryPerson["phone"];

    await response.send(
        customerId,
        `Informasi Pengiriman:\n\nNama Pengirim: ${deliveryName}\nNomor Pengirim: ${deliveryPhone}`
    );

    delete deliverySession[GROUP_ID];
    delete groupSession[GROUP_ID];

    return {
        success: true,
        message: 'Informasi pengiriman sudah dikirim ke customer.'
    };
}
