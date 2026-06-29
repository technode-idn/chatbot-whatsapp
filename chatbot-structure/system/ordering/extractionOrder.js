import { validationOrder } from './validationOrder.js';
import { sessions } from '../../settings/globalVariables.js';

export async function extractionOrder(text, userId, editingStatus = false, client) {
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

        // Mengirim Informasi Pesanan Ke Group Tenant
        // ==========================================
        await validationOrder(data, userId, editingStatus, client);

        delete sessions[userId];

        return;
    } catch(error) {
        console.log(error);

        return 'Maaf kak, pesanan belum bisa diproses karena ada kendala sistem. Silakan coba beberapa saat lagi atau hubungi admin.';
    }
}
