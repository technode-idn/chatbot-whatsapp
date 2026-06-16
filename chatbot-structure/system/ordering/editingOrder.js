import { pendingOrders } from "../../settings/globalVariables";

export async function editingOrder(orderDataAvailable, orderId, userId, client) {
    const text = ["Silahkan Masukan Produk Pengganti:\n", `Order ID: ${orderId}\n\n`];

    if(orderDataAvailable.length > 1) {
        for(const dataAvailable of orderDataAvailable) {
            const number = dataAvailable.match(/\d+$/)[0];
            text.push(`Produk ${number}\n=============================\n📌Produk Pesanan ${number}: \n📌Jumlah Pesanan ${number}:\n\n`);
        }
    } else {
        text.push("📌Produk Pesanan: \nJumlah Pesanan: ");
    }

    await client.sendMessage(
        userId,
        text.join("")
    );

    return;
}