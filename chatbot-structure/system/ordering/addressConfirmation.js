import { addressConfirmationSession, sessions, userMode } from '../../settings/globalVariables.js';
import { welcomedUsers } from '../../settings/runtimeUsers.js';

function productNumberFromKey(key) {
    const number = key.match(/_(\d+)$/)?.[1];

    return number ? Number(number) : 0;
}

function getProductKeys(orderData = {}) {
    return Object.keys(orderData)
        .filter(key => key === 'id_produk' || /^id_produk_\d+$/.test(key))
        .sort((a, b) => productNumberFromKey(a) - productNumberFromKey(b));
}

function buildOrderForm(orderData = {}) {
    const lines = [
        'Silakan kirim ulang formulir pesanan dengan alamat pengantaran yang benar.',
        '',
        `Nama Pemesan: ${orderData['nama_pemesan'] || ''}`
    ];

    for(const productKey of getProductKeys(orderData)) {
        const number = productNumberFromKey(productKey);
        const suffix = number ? ` ${number}` : '';
        const quantityKey = number ? `jumlah_pesanan_${number}` : 'jumlah_pesanan';

        lines.push(`ID Produk${suffix}: ${orderData[productKey] || ''}`);
        lines.push(`Jumlah Pesanan${suffix}: ${orderData[quantityKey] || ''}`);
    }

    lines.push(`Nomor Telepon Aktif: ${orderData['nomor_telepon_aktif'] || ''}`);
    lines.push(`Alamat Lengkap Pengantaran: ${orderData['alamat_lengkap_pengantaran'] || ''}`);

    return lines.join('\n');
}

export function startAddressConfirmation(userId, orderData, reason) {
    addressConfirmationSession[userId] = { orderData, reason };
}

export async function handleAddressConfirmation(userId, text, response) {
    const session = addressConfirmationSession[userId];

    if(!session) return false;

    if(text === '1') {
        delete addressConfirmationSession[userId];
        sessions[userId] = true;
        delete userMode[userId];
        await response.send(userId, buildOrderForm(session.orderData));
        return true;
    }

    if(text === '2') {
        delete addressConfirmationSession[userId];
        welcomedUsers.delete(userId);
        await response.send(userId, 'Pesanan dibatalkan.');
        return true;
    }

    await response.send(userId, 'Mohon pilih salah satu\n[1] untuk ubah alamat\n[2] untuk batalkan pesanan.');
    return true;
}
