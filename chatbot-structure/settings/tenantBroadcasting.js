import fs from 'fs/promises';

export const pendingOrders = {};

export async function sendOrderToOwner(client, orderData, userId) {
    const orderId = Date.now();

    pendingOrders[orderId] = {
        customer: userId,
        data: orderData
    };

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
            tidak ${orderId}
            `
        );

    }

}

export async function handleOwnerResponse(client, text) {
    const[status, orderId] = text.split(' ');

    const order = pendingOrders[orderId];

    if (!order) {
        return ('Pesanan tidak ditemukan');
    }

    if (status === "tersedia") {
        const fileData = await fs.readFile('./chatbot-structure/data/data_form_users.json', 'utf8');

        const users = fileData.trim() ? JSON.parse(fileData) : [];

        users.push({
            user_id: order.customer,
            created_at: new Date().toISOString(),
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

    }

    if (status === "tidak") {
        await client.sendMessage(
            order.customer,
            'Produk tidak tersedia ❌'
        );
    }

    delete pendingOrders[orderId];

    return ('Status pesanan berhasil diproses');

}