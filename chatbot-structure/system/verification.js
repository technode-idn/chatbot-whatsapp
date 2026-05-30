import { handleOwnerResponse, sendToGroup } from "./broadcasting.js";
import { rawDataUsers } from "../settings/loadFiles.js";

export async function verificationOrder(text, userId, client) {
    const data = {};

    const lines = text.split('\n').map(item => item.toLowerCase().trim());

    for (const line of lines) {

        if (line.includes(':')) {
            const[key, value] = line.split(':');

            data[key.trim().replace(' ', '_')] = value.trim();
        }

    }

    await handleOwnerResponse(client, data, userId);

    return;
}

export async function verificationPayment(text, client) {
    const data = {};

    const users = rawDataUsers.trim() ? JSON.parse(rawDataUsers) : [];

    const lines = text.split('\n').map(item => item.toLowerCase().trim());

    for (const line of lines) {

        if (line.includes(':')) {
            const[key, value] = line.split(':');

            data[key.trim()] = value.trim();
        }

    }

    for (const user of users) {
        if(user.order_id == data.order_id) {
            const idOrder = user.order_id;
        }
    }

    if(data.status == "✅") {
        await client.sendMessage(
            idOrder,
            "Terima kasih, pesanan akan segera kami proses 🙏🏻"
        );
    } else if(data.status == "❌") {
        await client.sendMessage(
            idOrder,
            "Bukti pembayaran Anda tidak valid, tolong kirim ulang 🙏🏻"
        );
    }

    await sendToGroup(users, client);

    return;
}