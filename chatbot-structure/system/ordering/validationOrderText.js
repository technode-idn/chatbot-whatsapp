export async function sendOrderMessage(orderData) {
    if(orderData["produk_pesanan_1"]) {
        let num = 1

        const orderMessage = ["📦 PESANAN BARU\n\n",`Nama: ${orderData["nama_pemesan"]}\n`, `Alamat Pengantaran: ${orderData["alamat_lengkap_pengantaran"]}\n`, `Nomor: ${orderData["nomor_telepon_aktif"]}`];

        for(const key in orderData) {
            if(key.includes("produk")) {
                orderMessage.push(`\n\nProduk ${num}\n=============================\n📌Produk Pesanan ${num}: ${orderData[`produk_pesanan_${num}`]}\n📌Jumlah Pesanan ${num}: ${orderData[`jumlah_pesanan_${num}`]}`);
            }

            num += 1;
        }

        return orderMessage.join("");
    } else {
        return `📦 PESANAN BARU\n\nNama: ${orderData["nama_pemesan"]}\nProduk Pesanan: ${orderData["produk_pesanan"]}\nJumlah Pesanan: ${orderData["jumlah_pesanan"]}\nAlamat Pengantaran: ${orderData["alamat_lengkap_pengantaran"]}\nNomor: ${orderData["nomor_telepon_aktif"]}`;
    }
}

export async function validationOrderMessage(orderId, orderData) {
    if(orderData["produk_pesanan_1"]) {
        let num = 1

        const validationMessage = ["MOHON KONFIRMASI PESANAN\n", "========================\n", `Order ID: ${orderId}\n\n`];

        for(const key in orderData){
            if(key.includes("produk")) {
                validationMessage.push(`Status Produk ${num}: \n`)
            }

            num += 1;
        }

        validationMessage.push("Toko Penerima: \nTotal Harga: \n\nJika Tersedia\n| Status Produk -> ✅\n| Total Harga -> Isi\nJika Tidak Tersedia\n| Status Produk -> ❌\n| Total Harga -> -");

        return validationMessage.join("");
    } else {
        return `MOHON KONFIRMASI PESANAN\n========================\nOrder ID: ${orderId}\n\nStatus Produk: \nToko Penerima: \nTotal Harga: \n\nJika Tersedia\n| Status Produk -> ✅\n| Total Harga -> Isi\nJika Tidak Tersedia\n| Status Produk -> ❌\n| Total Harga -> -`
    }
}