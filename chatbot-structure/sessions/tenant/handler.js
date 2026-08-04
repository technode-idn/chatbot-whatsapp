import { allNumberOwnerTenant, formTenantSession, userMode } from '../../settings/globalVariables.js';
import { broadcastMenu, generateFormStock, validationFormStock } from '../../system/owner-tenant/broadcastForm.js';
import { displayStock, resetStock } from '../../system/owner-tenant/stock.js';
import { extraction } from '../../system/owner-tenant/extraction.js';

const welcomedTenant = new Set();
const TENANT_MENU_MESSAGE = "🏪 Halo Pemilik Tenant!\n\nAda yang bisa kami bantu?\n[1] Isi Ulang Stok\n[2] Lihat Stok\n[3] Update/Restok Produk\n\n_Gunakan fitur dibawah jika hanya tidak ingin isi ulang stok harian_\n[4] Gunakan Stok Sisa Kemarin";

export function isTenant(userId) {
    return allNumberOwnerTenant.includes(userId);
}

export async function handleTenantSession({ userId, text, response }) {
    if(!isTenant(userId)) return false;

    if(['keluar', 'kembali'].includes(text.toLocaleLowerCase())) {
        delete formTenantSession[userId];
        delete userMode[userId];
        welcomedTenant.add(userId);
        await response.send(userId, TENANT_MENU_MESSAGE);
        return true;
    }

    if(formTenantSession[userId]) {
        await response.send(userId, await validationFormStock(text, userId));
        return true;
    }

    if(userMode[userId] === 'tenant-update-stock') {
        const responseStock = await extraction(text, 'edit');
        if(responseStock === 'Stok Berhasil Diperbarui') delete userMode[userId];
        await response.send(userId, responseStock);
        return true;
    }

    if(!welcomedTenant.has(userId)) {
        welcomedTenant.add(userId);
        await response.send(userId, TENANT_MENU_MESSAGE);
        return true;
    }

    switch(text) {
        case '1': await resetStock(true); await generateFormStock(userId); return true;
        case '2': await response.send(userId, await displayStock(userId)); return true;
        case '3':
            await response.send(userId, "📝 *SILAKAN PERBARUI STOK*\n=============================\nID Produk: \nJumlah Stok: \nStatus: \n\n_Status diisi dengan tambah/kurang/reset secara text_");
            userMode[userId] = 'tenant-update-stock';
            return true;
        case 'PERBARUI': await response.send(userId, await extraction(text, 'edit')); return true;
        case '4': await response.send(userId, 'Baik, stok sisa kemarin digunakan.'); return true;
        default: await response.send(userId, 'Anda memilih pilihan diluar menu.'); return true;
    }
}

export { broadcastMenu, TENANT_MENU_MESSAGE };
