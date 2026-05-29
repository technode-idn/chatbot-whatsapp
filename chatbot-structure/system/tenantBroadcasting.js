import fs from 'fs/promises';
import { pendingOrders, paymentStatus, tenantSession } from '../settings/globalVariables.js';
import { rawDataUsers, rawDataTenant } from '../settings/loadFiles.js';

const tenants = rawDataTenant.trim() ? JSON.parse(rawDataTenant) : [];

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
            `📦 Pesanan Baru\n\nID:\n${orderId}\nNama:\n${orderData["nama_pemesan"]}\nProduk:\n${orderData["produk_pesanan"]}\nJumlah Pesanan:\n${orderData["jumlah_pesanan"]}\nAlamat Pengantaran:\n${orderData["alamat_lengkap_pengantaran"]}\nNomor:\n${orderData["nomor_telepon_aktif"]}`
        );

        await client.sendMessage(
            owner.phone,
            `MOHON KONFIRMASI PESANAN\n========================\nOrder ID: ${orderId}\n\nStatus Produk: \nTotal Harga: \n\nProduk tersedia,berikan ✅\n| Total Harga = (isi)\nProduk tidak tersedia, berikan ❌\n| Total Harga = -`
        );
    }

    tenantSession[owner.phone] = true;

    return;
}

export async function handleOwnerResponse(client, data, userId) {
    const status = data.status_produk;
    const orderId = data.order_id;

    const order = pendingOrders[orderId];

    // Memeriksa Status Pesanan
    // ========================
    if (!order) {
        return ('Pesanan tidak ditemukan');
    }

    // Jika Stok Barang Tersedia
    // =========================
    if (status === "✅") {

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
    if (status === "❌") {
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

    await client.sendMessage(
        tenant.phone,
        "MOHON KONFIRMASI BUKTI PEMBAYARAN\n=================================\nStatus : \n\nJika valid, berikan ✅\nJika tidak valid, berikan ❌"
    );

    tenantSession[tenant.phone] = true;

    return;
}