import { handleOwnerResponse } from "./tenantBroadcasting";

export async function verificationOrder(text, userId, client) {
    const data = {};

    const lines = text.split('\n').map(item => item.toLowerCase().trim());

    for (const line of lines) {

        if (line.includes(':')) {
            const[key, value] = line.split(':');

            data[key.trim().replace(' ', '_')] = value.trim();
        }

    }

    await handleOwnerResponse(client, data, userId)
}

export async function verificationPayment(text, userId, client) {
    const data = {};

    const lines = text.split('\n').map(item => item.toLowerCase().trim());

    for (const line of lines) {

        if (line.includes(':')) {
            const[key, value] = line.split(':');

            data[key.trim()] = value.trim();
        }

    }

    if(data.status == "✅") {
        
    }
}