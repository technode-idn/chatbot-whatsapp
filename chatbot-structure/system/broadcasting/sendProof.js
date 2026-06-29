import { groupSession, paymentVerificationSession } from "../../settings/globalVariables.js";
import { sendOrderMessage } from "../ordering/textOrder.js";
import { getResponse } from "../security/response.js";

const GROUP_ID = '120363407187484870@g.us';

export async function sendProofToGroup(proof, orderId, orderData, client) {
    const response = getResponse();
    const orderMessage = orderData
        ? sendOrderMessage(orderData)
        : 'Detail pesanan tidak ditemukan.';

    await response.sendMedia(
        GROUP_ID,
        proof,
        "MOHON KONFIRMASI PEMBAYARAN\n===========================\n" +
        `Order ID: ${orderId}\n\n` +
        orderMessage +
        "\n\nStatus: \n\nJika sesuai, balas: OK\nJika tidak sesuai, balas: X",
        "normal"
    );

    groupSession[GROUP_ID] = true;
    paymentVerificationSession[GROUP_ID] = orderId;
}
