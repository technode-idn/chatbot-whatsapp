import { pendingOrders } from "../../settings/globalVariables";

export async function editingOrder(orderDataAvailable, orderId, userId, client) {
    const text = ["Silahkan Masukan Produk Pengganti:\n", `Order ID: ${orderId}`];

    if(orderDataAvailable.length > 1) {
        for(const dataAvailable of orderDataAvailable) {
            const number = dataAvailable.match(/\d+$/)[0];
            text.push(`📌Produk Pesanan ${number}: \n`);
        }
    } else {
        text.push("📌Produk Pesanan: \n");
    }

    await client.sendMessage(
        userId,
        text.join("")
    );

    return;
}