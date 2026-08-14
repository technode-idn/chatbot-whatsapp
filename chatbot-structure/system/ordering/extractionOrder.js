import { validationOrder } from './validationOrder.js';
import { sessions } from '../../settings/globalVariables.js';

function productLabel(productKey) {
    const number = productKey.match(/_(\d+)$/)?.[1];

    return number ? ` ${number}` : '';
}

function getMissingOrderFields(data) {
    const requiredFields = [
        ['nama_pemesan', 'Nama Pemesan'],
        ['nomor_telepon_aktif', 'Nomor Telepon Aktif'],
        ['alamat_lengkap_pengantaran', 'Alamat Lengkap Pengantaran']
    ];
    const missingFields = requiredFields
        .filter(([key]) => !String(data[key] || '').trim())
        .map(([, label]) => label);
    const productKeys = Object.keys(data)
        .filter(key => key === 'id_produk' || /^id_produk_\d+$/.test(key));

    if(!productKeys.length) {
        missingFields.push('ID Produk');
    }

    for(const productKey of productKeys) {
        const label = productLabel(productKey);
        const quantityKey = label ? `jumlah_pesanan${label.replace(' ', '_')}` : 'jumlah_pesanan';

        if(!String(data[productKey] || '').trim()) {
            missingFields.push(`ID Produk${label}`);
        }

        if(!String(data[quantityKey] || '').trim()) {
            missingFields.push(`Jumlah Pesanan${label}`);
        }
    }

    return missingFields;
}

export async function extractionOrder(text, userId, editingStatus = false) {
    // Ekstraksi Form Pesanan Customer
    // ===============================
    try {
        const data = {};
        const lines = text.split('\n').map(item => item.trim());

        for(const line of lines) {
            if(!line.includes(':')) {
                continue;
            }

            const [key, ...valueParts] = line.split(':');
            const normalizedKey = key
                .toLowerCase()
                .trim()
                .replace(/^[^a-z0-9]+/i, '')
                .replace(/\s+/g, '_');

            if(normalizedKey) {
                data[normalizedKey] = valueParts.join(':').trim();
            }
        }

        if(!Object.keys(data).length) {
            return 'Format yang dikirim tidak sesuai, silahkan isi ulang kembali';
        }

        if(editingStatus) {
            const emptyProductIds = Object.entries(data)
                .filter(([key]) => key === 'id_produk' || /^id_produk_\d+$/.test(key))
                .some(([, value]) => !String(value || '').trim());

            if(emptyProductIds) {
                return 'ID Produk belum diisi. Mohon isi ID Produk pengganti pada kolom yang tersedia.';
            }
        }

        if(!editingStatus) {
            const missingFields = getMissingOrderFields(data);

            if(missingFields.length) {
                return `Mohon lengkapi data formulir berikut (belum terisi):\n- ${missingFields.join('\n- ')}\n\n_*Salin formulir sebelumnya dan lengkapi bagian yang masih kosong*_`;
            }
        }

        // Mengirim Informasi Pesanan Ke Group Tenant
        // ==========================================
        await validationOrder(data, userId, editingStatus);

        delete sessions[userId];

        return;
    } catch(error) {
        console.log(error);

        return 'Maaf kak, pesanan belum bisa diproses karena ada kendala sistem. Silakan coba beberapa saat lagi atau hubungi admin.';
    }
}
