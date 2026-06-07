import { rawDataUsers } from "../settings/loadFiles.js";
import { handleGroupResponse } from "./broadcasting/sendOrder.js";
import { pendingProof } from "../settings/globalVariables.js";
import { inputDelivery } from "./broadcasting/sendDelivery.js";

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

            data[key.trim().replaceAll(' ', '_')] = value.trim();
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

    if(data.status === "✅") {

        await inputDelivery(data.order_id, client)

        delete pendingProof[customerId];

    } else {

        await client.sendMessage(
            customerId,
            "Bukti pembayaran tidak valid, silakan kirim ulang 🙏🏻"
        );
    }
}
