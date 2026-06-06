import { rawDataUsers } from "../settings/loadFiles.js";
import { handleGroupResponse } from "./broadcasting/sendOrder.js";
import { pendingProof } from "../settings/globalVariables.js";

export async function verificationOrder(text, client) {

    const data = {};

    const lines = text.split('\n').map(item => item.toLowerCase().trim());

    for(const line of lines) {

        if(line.includes(':')) {

            const [key, ...valueParts] = line.split(':');

            data[key.trim().replaceAll(' ', '_')] = valueParts.join(':').trim();
        }
    }

    return await handleGroupResponse(data, client);
}

export async function verificationPayment(text, client) {

    const data = {};

    const users = rawDataUsers.trim() ? JSON.parse(rawDataUsers) : [];

    const lines = text.split('\n').map(item => item.toLowerCase().trim());

    for(const line of lines) {

        if(line.includes(':')) {

            const [key, value] = line.split(':');

            data[key.trim()] = value.trim();
        }
    }

    let customerId = null;
    let selectedUser = null;

    for(const user of users) {

        if(String(user.order_id) === String(data.order_id)) {

            customerId = user.user_id;
            selectedUser = user;
            break;
        }
    }

    if(!customerId) {
        return;
    }

    if(data.status === "✅") {

        await client.sendMessage(
            customerId,
            "Terima kasih, pesanan akan segera kami proses 🙏🏻"
        );

        delete pendingProof[customerId];

    } else {

        await client.sendMessage(
            customerId,
            "Bukti pembayaran tidak valid, silakan kirim ulang 🙏🏻"
        );
    }
}
