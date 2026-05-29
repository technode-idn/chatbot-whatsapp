import fs from 'fs/promises';
import { paymentStatus } from '../system/payment.js';

export const pendingOrders = {};
export const pendingProof = {};

const rawDataTenant = await fs.readFile('./chatbot-structure/data/tenant_owners.json', 'utf8');
const tenants = rawDataTenant.trim() ? JSON.parse(rawDataTenant) : [];

const rawDataUsers = await fs.readFile('./chatbot-structure/data/data_form_users.json', 'utf8');
const users = rawDataUsers.trim() ? JSON.parse(rawDataUsers) : [];

export async function sendOrderToOwner(client, orderData, userId) {
    // Membuat Data Pesanan
    // ====================
    const orderId = Date.now();

    pendingOrders[orderId] = {
        customer: userId,
        data: orderData
    };

    // Mengirim Data Pesanan Ke Owner Tenant
    // =====================================
    const owners = tenants;

    for (const owner of owners) {
        await client.sendMessage(
            owner.phone,
            `
            📦 Pesanan Baru
            ID:
            ${orderId}
            Nama:
            ${orderData["nama_pemesan"]}
            Menu:
            ${orderData["menu_&_jumlah_pesanan"]}
            Alamat:
            ${orderData["alamat_lengkap_pengantaran"]}
            Nomor:
            ${orderData["nomor_telepon_aktif"]}
            Balas:
            tersedia ${orderId}
            atau
            tidak tersedia ${orderId}
            `
        );

    }

    return;
}

export async function handleOwnerResponse(client, text, userId) {
    const[status, orderId] = text.split(' ');

    const order = pendingOrders[orderId];

    // Memeriksa Status Pesanan
    // ========================
    if (!order) {
        return ('Pesanan tidak ditemukan');
    }

    // Jika Stok Barang Tersedia
    // =========================
    if (status === "tersedia") {

        for(const tenant of tenants) {
            if(tenant["phone"] == userId) {
                data_tenant = tenant
            }
        }

        users.push({
            user_id: order.customer,
            created_at: new Date().toISOString(),
            tenant_name: data_tenant,
            ...order.data
        });

        await fs.writeFile(
            './chatbot-structure/data/data_form_users.json',
            JSON.stringify(users, null, 4)
        );

        await client.sendMessage(
            order.customer,
            'Produk tersedia ✅'
        );

        paymentStatus[order.customer] = true;

        await client.sendMessage(
            order.customer,
            'Untuk informasi pembayarannya, kakak bisa pilih:\n\n[1] Cash (bayar di tempat)\n[2] QRIS\n\nSilahkan diinformasikan mau pakai metode yang mana ya kak?'
        );
    }

    // Jika Stok Barang Tidak Tersedia
    // ===============================
    if (status === "tidak tersedia") {
        await client.sendMessage(
            order.customer,
            'Mohon Maaf, produk sedang tidak tersedia ❌'
        );
    }

    delete pendingOrders[orderId];

    return;
}

export async function sendProofToOwner(proof, userId, client) {
    for(const user of users) {
        if(user[user_id] == userId) {
            tenant = user[tenant_name];
        }
    }

    await client.sendMessage(
        tenant.phone,
        proof
    );

    pendingProof[userId] = true;

    return;
}