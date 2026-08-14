export async function generateFormMultipleOrder(text) {
    const multipleOrderForm = [
        "Baik kak, supaya kami bisa proses pesanannya, mohon info ya.\n\n📌Nama Pemesan : \n📌Nomor Telepon Aktif : "
    ];

    for(let j = 0; j < text; j++) {
        multipleOrderForm.push(`\n\nProduk ${j + 1}\n=============================\n📌ID Produk ${j + 1}: \n📌Jumlah Pesanan ${j + 1}: `);
    }

    multipleOrderForm.push("\n\n🏠 *TUJUAN PENGANTARAN*\n=============================\n_Tolong isi alamat pengantaran secara lengkap, jika berlokasi diluar gedung/kawasan (Gymnas, Zeta, CA/CB/LAB, Dll) SV IPB_\n\n- Perumahan/Tempat\n- Jalan + Nomor\n- Kelurahan/Desa\n- Kecamatan\n- Kota/Kabupaten\n- Gunakan koma sebagai pemisah\n\n*Cth: Kos Lodaya, Jl. Lodaya II N0.15, Babakan, Bogor Tengah, Kota Bogor*\n\nIsi alamat Anda di bawah 👇\n📌Alamat Lengkap Pengantaran: \n\n_Jika tidak jadi memesan, ketik *keluar*_");

    return multipleOrderForm.join("");
}

