import { groupSession } from "../../settings/globalVariables.js";
import { sendOrderMessage } from "../ordering/textOrder.js";

export async function sendProofToGroup(proof, orderId, orderData, client) {

    await client.sendMessage(
        '120363407187484870@g.us',
        proof,
        {
            caption: "MOHON KONFIRMASI PEMBAYARAN\n===========================\n" + `Order ID: ${orderId}\n\n` + sendOrderMessage(orderData) + "\n\nStatus: \n\nJika Sesuai\n|Status -> ✅\nJika Tidak Sesuai\n| Status -> ❌"
        }
    );

    groupSession['120363407187484870@g.us'] = true;
}