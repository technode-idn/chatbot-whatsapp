import { allNumberDriverAdmin, userMode } from '../../settings/globalVariables.js';
import { addDelivery, deleteDelivery, displayDeliveries } from '../../system/driver-admin/deliveryCatalog.js';

const DRIVER_ADMIN_MENU =
    'Halo Admin Driver!\n\nAda yang bisa kami bantu?\n[1] Tambah Data Kurir\n[2] Hapus Data Kurir\n[3] Lihat Data Kurir\n\n_Ketik menu untuk menampilkan menu ini kembali._';

const ADD_DELIVERY_FORM =
    '📝 *TAMBAH DATA KURIR*\n=============================\nNIM: \nNomor Telepon: \nNama: \n\n_Isi form sesuai data kurir, lalu kirim kembali._';

const DELETE_DELIVERY_FORM =
    '🗑️ *HAPUS DATA KURIR*\n=============================\nNIM: \n\n_Isi NIM kurir yang akan dihapus, lalu kirim kembali._';

export function isDriverAdmin(userId) {
    return allNumberDriverAdmin.includes(userId);
}

export async function handleDriverAdminSession({ userId, text, response }) {
    if(!isDriverAdmin(userId)) return false;

    const normalizedText = String(text || '').trim().toLowerCase();

    if(['menu', 'kembali', 'keluar'].includes(normalizedText)) {
        delete userMode[userId];
        await response.send(userId, DRIVER_ADMIN_MENU);
        return true;
    }

    if(userMode[userId] === 'driver-add-delivery') {
        const result = await addDelivery(text);

        if(result.success) delete userMode[userId];
        await response.send(userId, result.message);
        return true;
    }

    if(userMode[userId] === 'driver-delete-delivery') {
        const result = await deleteDelivery(text);

        if(result.success) delete userMode[userId];
        await response.send(userId, result.message);
        return true;
    }

    switch(String(text || '').trim()) {
        case '1':
            userMode[userId] = 'driver-add-delivery';
            await response.send(userId, ADD_DELIVERY_FORM);
            return true;
        case '2':
            userMode[userId] = 'driver-delete-delivery';
            await response.send(userId, DELETE_DELIVERY_FORM);
            return true;
        case '3':
            await response.send(userId, await displayDeliveries());
            return true;
        default:
            await response.send(userId, DRIVER_ADMIN_MENU);
            return true;
    }
}
