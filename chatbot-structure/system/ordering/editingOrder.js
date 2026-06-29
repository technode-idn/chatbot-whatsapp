import { getResponse } from "../security/response.js";

export async function editingOrder(orderDataUnavailable = [], orderId, userId, client) {
    const response = getResponse();
    const unavailableKeys = Array.isArray(orderDataUnavailable)
        ? orderDataUnavailable
        : [];
    const text = [
        "Silahkan masukkan produk pengganti:\n",
        `Order ID: ${orderId}\n\n`
    ];

    for(const key of unavailableKeys) {
        const number = key.match(/_(\d+)$/)?.[1];
        const label = number ? ` ${number}` : '';

        text.push(
            `Produk${label}\n=============================\n` +
            `ID Produk${label}: \n` +
            `Jumlah Pesanan${label}: \n\n`
        );
    }

    if(!unavailableKeys.length) {
        text.push("ID Produk: \nJumlah Pesanan: ");
    }

    await response.send(
        userId,
        text.join("")
    );
}
