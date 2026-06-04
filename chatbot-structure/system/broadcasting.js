import fs from 'fs/promises';
import { rawDataUsers, rawDataTenant } from '../settings/loadFiles.js';
import {
    pendingOrders,
    paymentStatus,
    groupSession,
    deliverySession,
    lastOrderId
} from '../settings/globalVariables.js';

const tenants = rawDataTenant.trim() ? JSON.parse(rawDataTenant) : [];

const users = rawDataUsers.trim() ? JSON.parse(rawDataUsers) : [];

export async function sendOrderToGroup(client, orderData, userId) {

    const orderId = Date.now().toString();

    pendingOrders[orderId] = {
        customer: userId,
        data: orderData
    };

    await client.sendMessage(
        '120363407187484870@g.us',
        `📦 PESANAN BARU
        Nama: ${orderData["nama_pemesan"]}
        Produk: ${orderData["produk_pesanan"]}
        Jumlah Pesanan: ${orderData["jumlah_pesanan"]}
        Alamat Pengantaran: ${orderData["alamat_lengkap_pengantaran"]}
        Nomor: ${orderData["nomor_telepon_aktif"]}`
    );

    await client.sendMessage(
        '120363407187484870@g.us',
        `MOHON KONFIRMASI PESANAN
        Order ID: ${orderId}

        Status Produk:
        Toko Penerima:
        Total Harga:`
    );

    groupSession['120363407187484870@g.us'] = true;

    return orderId;
}

export async function handleGroupResponse(client, data, userId) {
    const status = data["status_produk"];
    const orderId = data["order_id"];

    const order = pendingOrders[orderId];

    // Memeriksa Status Pesanan
    // ========================
    if (!order) {
        return ('Pesanan tidak ditemukan');
    }

    // Jika Stok Barang Tersedia
    // =========================
    if (status === "✅") {
        users.push({
            order_id : orderId,
            user_id: order["customer"],
            created_at: new Date().toISOString(),
            customer_name: order["data"]["nama_pemesan"],
            number: order["data"]["nomor_telepon_aktif"],
            address: order["data"]["alamat_lengkap_pengantaran"],
            product_name: order["data"]["produk_pesanan"],
            tenant_name: data["toko_penerima"],
            total_product: order["data"]["jumlah_pesanan"],
            product_unit_price: data["total_harga"] / order["data"]["jumlah_pesanan"],
            total_price: data["total_harga"]
        });

        await fs.writeFile(
            './chatbot-structure/data/data_form_users.json',
            JSON.stringify(users, null, 4)
        );

        await client.sendMessage(
            order.customer,
            'Produk tersedia ✅'
        );

        paymentStatus[order["customer"]] = true;

        await client.sendMessage(
            order["customer"],
            'Untuk informasi pembayarannya, kakak bisa pilih:\n\n[1] Cash (bayar di tempat)\n[2] QRIS\n\nSilahkan diinformasikan mau pakai metode yang mana ya kak?'
        );
    }

    // Jika Stok Barang Tidak Tersedia
    // ===============================
    if (status === "❌") {
        await client.sendMessage(
            order["customer"],
            'Mohon Maaf, produk sedang tidak tersedia ❌'
        );
    }

    delete pendingOrders[orderId];

    return;
}

export async function sendProofToGroup(proof, orderId, client) {

    await client.sendMessage(
        '120363407187484870@g.us',
        proof
    );

    await client.sendMessage(
        '120363407187484870@g.us',
        `MOHON KONFIRMASI PEMBAYARAN

        Order ID: ${orderId}

        Status:`
    );

    groupSession['120363407187484870@g.us'] = true;
}

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