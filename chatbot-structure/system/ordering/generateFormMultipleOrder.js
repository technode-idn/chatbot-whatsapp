export async function generateFormMultipleOrder(text) {
    const multipleOrderForm = [
        "Baik kak, supaya kami bisa proses pesanannya, mohon info ya.\n\n📌Nama Pemesan : \n📌Nomor Telepon Aktif : "
    ];

    for(let j = 0; j < text; j++) {
        multipleOrderForm.push(`\n\nProduk ${j + 1}\n=============================\n📌ID Produk ${j + 1}: \n📌Jumlah Pesanan ${j + 1}: `);
    }

    multipleOrderForm.push("\n\n🏠 *TUJUAN PENGANTARAN*\n=============================\n_Tolong isi alamat pengantaran secara lengkap, jika berlokasi diluar SV IPB_\n\n- Jalan/Perumahan/Tempat + Nomor\n- Kelurahan/Desa\n- Kecamatan\n- Kota/Kabupaten\n\n*Cth: Jl. Lodaya II N0.15, Babakan, Bogor Tengah, Kota Bogor*\n\nIsi alamat Anda di bawah 👇\n📌Alamat Lengkap Pengantaran: \n\nTerima Kasih🙏😊\n\n_*Jika ingin keluar, ketik menu/keluar_");

    return multipleOrderForm.join("");
}

