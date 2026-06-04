import { rawDataUsers } from "../settings/loadFiles.js";
import {
    handleGroupResponse,
    sendToGroup
} from "./broadcasting.js";

export async function verificationOrder(text, userId, client) {

    const data = {};

    const lines = text.split('\n');

    for(const line of lines) {

        if(line.includes(':')) {

            const [key, ...valueParts] = line.split(':');

            data[
                key.trim()
                .toLowerCase()
                .replaceAll(' ', '_')
            ] = valueParts.join(':').trim();
        }
    }

    console.log(data);

    return await handleGroupResponse(client, data, userId);
}

export async function verificationPayment(text, client) {

    const data = {};

    const users = rawDataUsers.trim()
        ? JSON.parse(rawDataUsers)
        : [];

    const lines = text.split('\n');

    for(const line of lines) {

        if(line.includes(':')) {

            const [key, value] = line.split(':');

            data[key.trim().toLowerCase()] =
                value.trim();
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

        await sendToGroup(selectedUser, client);

    } else {

        await client.sendMessage(
            customerId,
            "Bukti pembayaran tidak valid, silakan kirim ulang 🙏🏻"
        );
    }
}
