import { deliverySession } from "../../settings/globalVariables";
import { rawDataUsers } from "../../settings/loadFiles";

const users = rawDataUsers.trim() ? JSON.parse(rawDataUsers) : [];

export async function sendToGroup(data, client) {

    await client.sendMessage(
        '120363407187484870@g.us',
        `MOHON KONFIRMASI PENGIRIMAN\n==========================\nOrder ID: ${data["order_id"]}\n\nNama Pengirim: \nNomor Pengirim: `
    );

    deliverySession['120363407187484870@g.us'] = true;

    return;
}

export async function handleGroupResponse2(text, client) {

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
        `Berikut informasi pengirim:

        Nama Pengirim: ${data.nama_pengirim}
        Nomor Pengirim: ${data.nomor_pengirim}`
    );
}