import { pendingOrders, paymentStatus, groupSession, editingOrder } from "../../settings/globalVariables";
import { rawDataUsers } from "../../settings/loadFiles";
import { sendOrderMessage, validationOrderMessage } from "../ordering/validationOrderText";

const users = rawDataUsers.trim() ? JSON.parse(rawDataUsers) : [];

function parsePrice(value) {
    const digits = String(value || '').replace(/[^\d]/g, '');

    return digits ? Number(digits) : 0;
}

export async function sendOrderToGroup(orderData, userId, client) {

    const orderId = Date.now().toString();

    pendingOrders[orderId] = {
        customer: userId,
        data: orderData
    };

    await client.sendMessage(
        '120363407187484870@g.us',
        sendOrderMessage(orderData)
    );

    await client.sendMessage(
        '120363407187484870@g.us',
        validationOrderMessage(orderId, orderData)
    );

    groupSession['120363407187484870@g.us'] = true;

    return orderId;
}

export async function handleGroupResponse(data, client) {
    const allDataStatus = {};

    for(const status in data) {
        if(status.includes('status_produk')) {
            const[status] = data[status];
        }
    }

    const orderId = data["order_id"];

    const order = pendingOrders[orderId];

    // Memeriksa Status Pesanan
    // ========================
    if (!order) {
        return {
            success: false,
            message: 'Pesanan tidak ditemukan. Pastikan Order ID sesuai dengan pesan konfirmasi.'
        };
    }

    // Jika Stok Barang Tersedia
    // =========================
    if (!Object.values(allDataStatus).includes("❌")) {
        const totalStatusProduk = Object.keys(allDataStatus).filter(key => key.includes("status_produk")).length;
        const totalPrice = parsePrice(data["total_harga"]);

        if(totalStatusProduk > 1) {
            for(let i = 1; i <= totalStatusProduk; i++) {
                const product_name_key = `produk_pesanan_${i}`;
                const total_product_key = `jumlah_pesanan_${i}`;

                const totalProduct = Number(order["data"][total_product_key]) || 1;

                users.push({
                    order_id : orderId,
                    user_id: order["customer"],
                    created_at: new Date().toISOString(),
                    customer_name: order["data"]["nama_pemesan"],
                    number: order["data"]["nomor_telepon_aktif"],
                    address: order["data"]["alamat_lengkap_pengantaran"],
                    product_name: order["data"][product_name_key],
                    tenant_name: data["toko_penerima"],
                    total_product: totalProduct,
                    product_unit_price: "Multiple Order",
                    total_price: totalPrice
                });

                await fs.writeFile(
                    './chatbot-structure/data/data_form_users.json',
                    JSON.stringify(users, null, 4)
                );
            }

        } else {
            const totalProduct = Number(order["data"]["jumlah_pesanan"]) || 1;

            users.push({
                order_id : orderId,
                user_id: order["customer"],
                created_at: new Date().toISOString(),
                customer_name: order["data"]["nama_pemesan"],
                number: order["data"]["nomor_telepon_aktif"],
                address: order["data"]["alamat_lengkap_pengantaran"],
                product_name: order["data"]["produk_pesanan"],
                tenant_name: data["toko_penerima"],
                total_product: totalProduct,
                product_unit_price: totalPrice / totalProduct,
                total_price: totalPrice
            });

            await fs.writeFile(
                './chatbot-structure/data/data_form_users.json',
                JSON.stringify(users, null, 4)
            );
        }

        await client.sendMessage(
            order["customer"],
            'Produk tersedia ✅\n\nUntuk informasi pembayarannya, kakak bisa pilih:\n\n[1] Cash (bayar di tempat)\n[2] QRIS\n\nSilahkan diinformasikan mau pakai metode yang mana ya kak?'
        );

        paymentStatus[order["customer"]] = true;
    }

    // Jika Stok Barang Tidak Tersedia
    // ===============================
    if (Object.values(allDataStatus).includes("❌")) {
        const keys = Object.keys(allDataStatus).filter(key => allDataStatus[key] === "❌");

        if(keys.length > 1) {
            const text = ["Mohon Maaf:\n"];

            for(const key of keys) {
                const key_number = key.match(/\d+$/)?.[0];
                text.push(`${order["data"][`produk_pesanan_${key_number}`]}  sedang tidak tersedia ❌\n`);
            }

            text.push("\nApakah kakak ingin mengganti produk?\n[1] Ya\n[2] Tidak");

            await client.sendMessage(
                order["customer"],
                text
            );
        } else {
            await client.sendMessage(
                order["customer"],
                `Mohon Maaf, ${order["data"]["produk_pesanan"]} sedang tidak tersedia ❌\n\nApakah kakak ingin mengganti produk?\n[1] Ya\n[2] Tidak`
            );
        }

        editingOrder[order["customer"]] = true;
    }

    delete pendingOrders[orderId];

    return {
        success: true
    };
}