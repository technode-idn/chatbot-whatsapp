import { deliverySession } from "../../settings/globalVariables";
import { rawDataUsers } from "../../settings/loadFiles";

const users = rawDataUsers.trim() ? JSON.parse(rawDataUsers) : [];

export async function inputDelivery(orderId, client) {

    await client.sendMessage(
        '120363407187484870@g.us',
        `MOHON KONFIRMASI PENGIRIMAN\n==========================\nOrder ID: ${orderId}\n\nNama Pengirim: \nNomor Pengirim: `
    );

    deliverySession['120363407187484870@g.us'] = true;

    return;
}

export async function handleDeliveryResponse(text, client) {

    const data = {};

    const lines = text.split('\n');

    for(const line of lines) {

        if(line.includes(':')) {

            const [key, value] = line.split(':');

            data[key.trim().toLowerCase().replaceAll(' ', '_')] =
                value.trim();
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

    delete deliverySession['120363407187484870@g.us'];
}