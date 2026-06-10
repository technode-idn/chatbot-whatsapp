import { pendingOrders } from "../../settings/globalVariables";

export async function editingOrder(orderId, userId, client) {
    const text = ["Silahkan Masukan Menu Pengganti:\n"];

    const orderData = pendingOrders[orderId]["data"];

    const allProductReject = Object.keys(orderData).filter(key => (key.includes("produk_pesanan")) && (orderData[key] === "❌"));

    if(allProductReject.length > 1) {
        for(let i = 0; i < allProductReject.length; i++) {
            text.push(`📌Produk Pesanan ${i}: \n`);
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