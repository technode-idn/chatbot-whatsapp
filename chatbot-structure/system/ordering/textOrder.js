function productNumberFromKey(key) {
    const number = key.match(/_(\d+)$/)?.[1];

    return number ? Number(number) : 0;
}

function quantityKeyFromProductKey(productKey) {
    const number = productKey.match(/_(\d+)$/)?.[1];

    return number ? `jumlah_pesanan_${number}` : 'jumlah_pesanan';
}

function getProductItems(orderData) {
    const productKeys = Object.keys(orderData || {})
        .filter(key => key === 'id_produk' || /^id_produk_\d+$/.test(key))
        .sort((a, b) => productNumberFromKey(a) - productNumberFromKey(b));

    if(productKeys.length) {
        return productKeys.map(productKey => {
            const number = productNumberFromKey(productKey);

            return {
                number,
                product: orderData[productKey],
                quantity: orderData[quantityKeyFromProductKey(productKey)]
            };
        });
    }

    const legacyProductKeys = Object.keys(orderData || {})
        .filter(key => key === 'produk_pesanan' || /^produk_pesanan_\d+$/.test(key))
        .sort((a, b) => productNumberFromKey(a) - productNumberFromKey(b));

    return legacyProductKeys.map(productKey => {
        const number = productNumberFromKey(productKey);
        const quantityKey = number ? `jumlah_pesanan_${number}` : 'jumlah_pesanan';

        return {
            number,
            product: orderData[productKey],
            quantity: orderData[quantityKey]
        };
    });
}

export function sendOrderMessage(orderData = {}) {
    const orderMessage = [
        `Nama: ${orderData["nama_pemesan"] || '-'}\n`,
        `Alamat Pengantaran: ${orderData["alamat_lengkap_pengantaran"] || '-'}\n`,
        `Nomor: ${orderData["nomor_telepon_aktif"] || '-'}`
    ];
    const productItems = getProductItems(orderData);

    if(!productItems.length) {
        return orderMessage.join("");
    }

    for(const item of productItems) {
        const label = item.number ? ` ${item.number}` : '';

        orderMessage.push(
            `\n\nProduk${label}\n=============================\n` +
            `ID Produk${label}: ${item.product || '-'}\n` +
            `Jumlah Pesanan${label}: ${item.quantity || '-'}`
        );
    }

    return orderMessage.join("");
}

export function validationOrderMessage(orderId, orderData = {}) {
    const validationMessage = [
        "MOHON KONFIRMASI PESANAN\n",
        "========================\n",
        `Order ID: ${orderId}\n\n`
    ];
    const productItems = getProductItems(orderData);

    if(productItems.length > 1) {
        for(const item of productItems) {
            validationMessage.push(`Status Produk ${item.number}: \n`);
        }
    } else {
        validationMessage.push("Status Produk: \n");
    }

    validationMessage.push(
        "Toko Penerima: \n" +
        "Total Harga: \n\n" +
        "Jika Tersedia\n| Status Produk -> OK\n| Total Harga -> Isi\n" +
        "Jika Tidak Tersedia\n| Status Produk -> X\n| Total Harga -> -"
    );

    return validationMessage.join("");
}
