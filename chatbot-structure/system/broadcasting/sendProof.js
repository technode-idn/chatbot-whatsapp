import { groupSession, paymentVerificationSession } from "../../settings/globalVariables.js";
import { sendOrderMessage } from "../ordering/textOrder.js";
import { getResponse } from "../security/response.js";

const GROUP_ID = '120363407187484870@g.us';

export async function sendProofToGroup(proof, orderId, orderData, client) {
    const text = orderData ? ["📌*KONFIRMASI PEMBAYARAN*\n\n", `Order ID: ${orderId}\n`, "=============================\n", `Nama: ${orderData["nama_pemesan"]}\n`, `Alamat Pengantaran: ${orderData["alamat_lengkap_pengantaran"]}\n`, `Nomor: ${orderData["nomor_telepon_aktif"]}\n`, "=============================\n\n", "*PRODUK*\n"] : "Data pesanan tidak ditemukan.";

    const response = getResponse();

    let num = 1;

    for(const data of Object.keys(orderData)) {
        const number = /_\d+$/.test(data) ? Number(data.match(/_(\d+)$/)?.[1]) : null;

        const id_product = number ? `id_produk_${number}` : "id_produk";
        const order_total = number ? `jumlah_pesanan_${number}` : "jumlah_pesanan";

        text.push(`[${num}] ${orderData[id_product]} * ${orderData[order_total]}`);

        num += 1;
    }

    num = 1;

    text.push("Pembayaran Valid: \n\n*_Berikan ✅ atau ❌_*");

    await response.sendMedia(
        GROUP_ID,
        proof,
        text,
        "normal"
    );

    groupSession[GROUP_ID] = true;
    paymentVerificationSession[GROUP_ID] = orderId;
}