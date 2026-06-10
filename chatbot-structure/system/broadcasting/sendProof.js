import { groupSession } from "../../settings/globalVariables.js";

export async function sendProofToGroup(proof, orderId, client) {

    await client.sendMessage(
        '120363407187484870@g.us',
        proof,
        {
            caption: `MOHON KONFIRMASI PEMBAYARAN\n===========================\nOrder ID: ${orderId}\n\nStatus: \n\nJika Sesuai\n|Status -> ✅\nJika Tidak Sesuai\n| Status -> ❌`
        }
    );

    groupSession['120363407187484870@g.us'] = true;
}