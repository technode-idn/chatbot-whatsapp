import fs from 'fs/promises';
import { pendingOrders, paymentStatus, groupSession, deliverySession } from '../settings/globalVariables.js';
import { rawDataUsers, rawDataTenant } from '../settings/loadFiles.js';
import { orderId } from '../settings/globalVariables.js';

const tenants = rawDataTenant.trim() ? JSON.parse(rawDataTenant) : [];

const users = rawDataUsers.trim() ? JSON.parse(rawDataUsers) : [];

export async function sendOrderToGroup(client, orderData, userId) {
    // Membuat Data Pesanan
    // ====================
    orderId = Date.now();

    pendingOrders[orderId] = {
        customer: userId,
        data: orderData
    };

    await client.sendMessage(
        '120363407187484870@g.us',
        `📦 Pesanan Baru\n\nNama: ${orderData["nama_pemesan"]}\nProduk: ${orderData["produk_pesanan"]}\nJumlah Pesanan: ${orderData["jumlah_pesanan"]}\nAlamat Pengantaran: ${orderData["alamat_lengkap_pengantaran"]}\nNomor: ${orderData["nomor_telepon_aktif"]}`
    );

    await client.sendMessage(
        '120363407187484870@g.us',
        `MOHON KONFIRMASI PESANAN\n========================\nOrder ID: ${orderId}\n\nStatus Produk: \nToko Penerima: \nTotal Harga: \n\nProduk tersedia, berikan ✅\n| Total Harga = (isi)\nProduk tidak tersedia, berikan ❌\n| Total Harga = -`
    );

    groupSession['120363407187484870@g.us'] = true;

    return;
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

export async function sendProofToGroup(proof, client) {
    await client.sendMessage(
        '120363407187484870@g.us',
        proof
    );

    await client.sendMessage(
        '120363407187484870@g.us',
        `MOHON KONFIRMASI BUKTI PEMBAYARAN\n=================================\nOrder ID: ${orderId}\n\nStatus : \n\nJika valid, berikan ✅\nJika tidak valid, berikan ❌`
    );

    groupSession['120363407187484870@g.us'] = true;

    return;
}

export async function sendToGroup(data, client) {

    await client.sendMessage(
        '120363407187484870@g.us',
        `MOHON KONFIRMASI PENGIRIMAN\n==========================\nOrder ID: ${data["order_id"]}\n\nNama Pengirim: \nNomor Pengirim: `
    );

    deliverySession['120363407187484870@g.us'] = true;

    return;
}

export async function handleGroupResponse(text, client) {
    const data = {};

    const lines = text.split('\n').map(item => item.toLowerCase().trim());

    for (const line of lines) {

        if (line.includes(':')) {
            const[key, value] = line.split(':');

            data[key.trim().replace(' ', '_')] = value.trim();
        }

    }

    for (const user of users) {
        if(user["order_id"] == data["order_id"]) {
            const idOrder = user["order_id"];
        }
    }

    await client.sendMessage(
        idOrder,
        `Berikut informasi dari pengirimnya ya kak 😊🙏\nNama Pengirim: ${data["nama_pengirim"]}\nNomor Pengirim: ${data["nomor_pengirim"]}`
    );

    return;
}