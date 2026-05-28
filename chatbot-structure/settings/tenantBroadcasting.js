import fs from 'fs/promises';
import { paymentStatus } from '../system/payment.js';

export const pendingOrders = {};

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
    const rawData = await fs.readFile('./chatbot-structure/data/tenant_owners.json', 'utf8');

    const owners = JSON.parse(rawData);

    for (const owner of owners) {
        await client.sendMessage(
            owner.phone,
            `
            📦 Pesanan Baru
            ID:
            ${orderId}
            Nama:
            ${orderData["Nama pemesan"]}
            Menu:
            ${orderData["Menu & jumlah pesanan"]}
            Alamat:
            ${orderData["Alamat lengkap pengantaran"]}
            Nomor:
            ${orderData["Nomor Telepon aktif"]}
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
        const fileDataUsers = await fs.readFile('./chatbot-structure/data/data_form_users.json', 'utf8');
        const fileDataTenant = await fs.readFile('./chatbot-structure/data/tenant_owners.json', 'utf8');

        const users = fileDataUsers.trim() ? JSON.parse(fileDataUsers) : [];
        const tenants = fileDataTenant.trim() ? JSON.parse(fileDataTenant) : [];

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

        paymentStatus = true;

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