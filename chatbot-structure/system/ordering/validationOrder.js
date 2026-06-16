import fs from 'fs/promises';
import crypto from 'crypto';
import { rawDatabaseProduct, rawDataUsers } from "../../settings/loadFiles.js";
import { editingOrder, paymentStatus, pendingOrders } from "../../settings/globalVariables.js";

const database_product = JSON.parse(rawDatabaseProduct);
const users = rawDataUsers.trim() ? JSON.parse(rawDataUsers) : [];
let orderDataFinal = null;

function parsePrice(value) {
    const digits = String(value || '').replace(/[^\d]/g, '');

    return digits ? Number(digits) : 0;
}

export async function validationOrder(orderData, userId, editingStatus, client) {
    // Membuat Order ID
    // ================
    let orderId = null;

    if(editingStatus) {
        orderId = orderData["order_id"];
    } else {
        orderId = "ORD-" + crypto.randomBytes(5).toString("hex").toUpperCase();
    }

    // Mengambil Data Produk Pesanan
    // =============================
    const allProductOrder = Object.keys(orderData).filter(key => String(orderData[key]).includes("id_produk"));

    // Mengambil Data Jumlah Pesanan
    // =============================
    const allTotalProductOrder = Object.keys(orderData).filter(key => String(orderData[key]).includes("jumlah_pesanan"));

    // Menyimpan Data Produk Pesanan Yang Tidak Tersedia
    // =================================================
    const allProductNotAvailable = [];

    // Menyimpan Data Pesanan Yang Tersedia
    // ====================================
    if(orderDataFinal && editingStatus) {
        for(const orderDataEdit in orderData) {
            if(orderDataEdit in orderDataFinal) {
                orderDataFinal[orderDataEdit] = orderData[orderDataEdit];
            }
        }
    } else {
        orderDataFinal = orderData;
    }

    // Memeriksa Setiap Produk Pesanan, Apakah Tersedia
    // ================================================
    for(let i = 0; i < allProductOrder.length; i++) {
        if(database_product.some(product => product["id_product"] === allProductOrder[i])) {

            // Mengambil Data Produk Dari Database
            // ===================================
            const product = database_product.find(p => p["id_product"] === allProductOrder[i]);

            // Memeriksa Jumlah Produk Pesanan Yang Masih Tersedia
            // ===================================================
            if(product["total_product"] > allTotalProductOrder[i]) {

                // Memasukkan Data Pesanan Ke Dalam Object
                // =======================================
                users.push({
                    order_id : orderId,
                    user_id: userId,
                    product_id: orderData[allProductOrder[i]],
                    created_at: new Date().toISOString(),
                    customer_name: orderData["nama_pemesan"],
                    number: orderData["nomor_telepon_aktif"],
                    address: orderData["alamat_lengkap_pengantaran"],
                    tenant_name: product["tenant_name"],
                    total_product: allTotalProductOrder[i],
                    product_unit_price: product["product_unit_price"],
                    total_price: parsePrice(product["product_unit_price"] * allTotalProductOrder[i])
                });

                // Menyimpan Data Pesanan Ke Dalam Database
                // ========================================
                await fs.writeFile(
                    './chatbot-structure/data/data_form_users.json',
                    JSON.stringify(users, null, 4)
                );

                // Memperbarui Jumlah Produk Dalam Database
                // ========================================
                product["total_product"] -= allTotalProductOrder[i];

                fs.writeFile(
                    './chatbot-structure/data/database_produk.json',
                    JSON.stringify(database_product, null, 2)
                );
            } else {
                // Mendata Produk Pesanan Yang Tidak Tersedia
                // ==========================================
                allProductNotAvailable.push(allProductOrder[i]);
            }
        }
    }

    pendingOrders[orderId] = {
        customer: userId,
        order_id: orderId,
        data: orderDataFinal
    }

    // Jika ada produk yang tidak tersedia
    // ===================================
    if(allProductNotAvailable.length > 0) {
        const text = ["Mohon Maaf:\n"];

        for(const productNotAvailable of allProductNotAvailable) {
            text.push(`Produk ${productNotAvailable} sedang tidak tersedia ❌\n`);
        }

        text.push("Apakah kakak ingin mengganti produk?\n[1] Ya\n[2] Tidak");

        await client.sendMessage(
            userId,
            text.join("")
        );

        editingOrder[userId] = {
            status: true,
            all_data_available = allProductNotAvailable
        };

        allProductNotAvailable.length = 0;
    }

    // Jika semua produk tersedia
    // ==========================
    if(allProductNotAvailable.length === 0) {

        await client.sendMessage(
            userId,
            'Produk tersedia ✅\n\nUntuk informasi pembayarannya, kakak bisa pilih:\n\n[1] Cash (bayar di tempat)\n[2] QRIS\n\nSilahkan diinformasikan mau pakai metode yang mana ya kak?'
        );

        paymentStatus[userId] = {
            status: true,
            order_id: orderId
        };
    }
}