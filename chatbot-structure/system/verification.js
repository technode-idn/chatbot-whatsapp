import fs from 'fs/promises';
import { handleGroupResponse } from "./broadcasting/sendOrder.js";
import { pendingProof } from "../settings/globalVariables.js";
import { inputDelivery } from "./broadcasting/sendDelivery.js";

const DATA_USERS_PATH = './chatbot-structure/data/data_form_users.json';

async function loadDataUsers() {
    const rawDataUsers = await fs.readFile(DATA_USERS_PATH, 'utf8');

    return rawDataUsers.trim()
        ? JSON.parse(rawDataUsers)
        : [];
}

function parseKeyValueText(text) {
    const data = {};
    const lines = text.split('\n').map(item => item.toLowerCase().trim());

    for(const line of lines) {
        if(line.includes(':')) {
            const [key, ...valueParts] = line.split(':');

            data[key.trim().replaceAll(' ', '_')] = valueParts.join(':').trim();
        }
    }

    return data;
}

export async function verificationOrder(text, client) {
    const data = parseKeyValueText(text);

    return await handleGroupResponse(data, client);
}

export async function verificationPayment(text, client) {
    const data = parseKeyValueText(text);
    const users = await loadDataUsers();

    let customerId = null;

    for(const user of users) {
        if(String(user["order_id"]) === String(data["order_id"])) {
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

    if(String(data["status"] || '').includes('\u2705')) {
        await inputDelivery(data["order_id"], client);

        delete pendingProof[customerId];

        return {
            success: true
        };
    }

    await client.sendMessage(
        customerId,
        "Bukti pembayaran tidak valid, silakan kirim ulang."
    );

    return {
        success: true
    };
}
