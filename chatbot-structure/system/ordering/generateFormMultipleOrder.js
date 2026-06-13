export async function generateFormMultipleOrder(text) {
    const multipleOrderForm = ["Baik kak, supaya kami bisa proses pesanannya, mohon info ya.\n\n📌Nama Pemesan : \n📌Alamat Lengkap Pengantaran : \n📌Nomor Telepon Aktif : "];

    for(let j = 0; j < text; j++) {
        multipleOrderForm.push(`\n\nProduk ${j + 1}\n=============================\n📌ID Produk ${j + 1}: \n📌Jumlah Pesanan ${j + 1}: `);
    }

    multipleOrderForm.push("\n\nTerima Kasih🙏😊\n\n_*Jika ingin keluar, ketik menu/keluar_");

    return multipleOrderForm.join("");
}