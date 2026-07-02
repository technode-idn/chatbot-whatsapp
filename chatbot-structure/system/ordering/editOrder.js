import { editingOrder, orderConfirmationSession, paymentStatus, pendingOrders } from "../../settings/globalVariables.js";
import { getResponse } from "../security/response.js";

const PRODUCT_AVAILABLE_MESSAGE = "✅ *PRODUK TERSEDIA*\n\nApakah kakak sudah yakin dengan pesanannya?\n\n[1] Belum (Mau Edit)\n[2] Lanjut Ke Pembayaran";

const PAYMENT_METHOD_MESSAGE = "Untuk informasi pembayarannya, kakak bisa pilih 🙏\n\n[1] Cash (bayar di tempat)\n[2] QRIS\n\nSilahkan diinformasikan mau pakai metode yang mana ya kak?";

function productNumberFromKey(key) {
    const number = key.match(/_(\d+)$/)?.[1];

    return number ? Number(number) : 0;
}

function quantityKeyFromProductKey(productKey) {
    const number = productKey.match(/_(\d+)$/)?.[1];

    return number ? `jumlah_pesanan_${number}` : "jumlah_pesanan";
}

function labelFromProductKey(productKey) {
    const number = productNumberFromKey(productKey);

    return number ? ` ${number}` : "";
}

function getProductKeys(orderData = {}) {
    return Object.keys(orderData)
        .filter(key => key === "id_produk" || /^id_produk_\d+$/.test(key))
        .sort((a, b) => productNumberFromKey(a) - productNumberFromKey(b));
}

function buildEditOrderForm(orderId, orderData = {}) {
    const text = [
        "📝 *EDIT PESANAN*",
        "===========================",
        `Order ID: ${orderId}`,
        "",
        `Nama Pemesan: ${orderData["nama_pemesan"] || ""}`
    ];

    const productKeys = getProductKeys(orderData);

    if(productKeys.length) {
        for(const productKey of productKeys) {
            const label = labelFromProductKey(productKey);
            const quantityKey = quantityKeyFromProductKey(productKey);

            text.push(`ID Produk${label}: ${orderData[productKey] || ""}`);
            text.push(`Jumlah Pesanan${label}: ${orderData[quantityKey] || ""}`);
        }
    } else {
        text.push("ID Produk: ");
        text.push("Jumlah Pesanan: ");
    }

    text.push(`Nomor Telepon Aktif: ${orderData["nomor_telepon_aktif"] || ""}`);
    text.push(`Alamat Lengkap Pengantaran: ${orderData["alamat_lengkap_pengantaran"] || ""}`);
    text.push("");
    text.push("Silahkan edit bagian yang ingin diubah, lalu kirim ulang form ini ya kak.");

    return text.join("\n");
}

export async function askOrderConfirmation(userId, orderId) {
    const response = getResponse();

    orderConfirmationSession[userId] = {
        status: true,
        order_id: orderId
    };

    await response.send(userId, PRODUCT_AVAILABLE_MESSAGE);
}

export async function handleOrderConfirmation(text, userId) {
    const response = getResponse();
    const session = orderConfirmationSession[userId];

    if(!session?.status) {
        return false;
    }

    const orderId = session["order_id"];
    const pendingOrder = pendingOrders[orderId];

    if(text === "1") {
        if(!pendingOrder?.data) {
            delete orderConfirmationSession[userId];

            await response.send(userId, "Data pesanan tidak ditemukan. Mohon kirim ulang pesanannya ya kak.");
            return true;
        }

        editingOrder[userId] = {
            status: true,
            order_id: orderId,
            data: pendingOrder.data,
            all_data_available: getProductKeys(pendingOrder.data)
        };

        delete orderConfirmationSession[userId];

        await response.send(userId, buildEditOrderForm(orderId, pendingOrder.data));
        return true;
    }

    if(text === "2") {
        paymentStatus[userId] = {
            status: true,
            order_id: orderId
        };

        delete orderConfirmationSession[userId];

        await response.send(userId, PAYMENT_METHOD_MESSAGE);
        return true;
    }

    await response.send(userId, "Mohon pilih salah satu ya kak:\n[1] Belum (Mau Edit)\n[2] Lanjut Ke Pembayaran");
    return true;
}
