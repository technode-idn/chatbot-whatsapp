import { allNumberOwnerTenant, formTenantSession, userMode } from '../../settings/globalVariables.js';
import { broadcastMenu, generateFormStock, sendStockInputMenu, validationFormStock } from '../../system/owner-tenant/broadcastForm.js';
import { addUniformStock, displayStock, resetStock } from '../../system/owner-tenant/stock.js';
import { extraction } from '../../system/owner-tenant/extraction.js';
import { addTenantProduct, deleteTenantProduct } from '../../system/owner-tenant/catalog.js';
import { handleTenantOrderConfirmation } from '../../system/ordering/tenantOrderConfirmation.js';

const welcomedTenant = new Set();
const TENANT_MENU_MESSAGE = "🏪 Halo Pemilik Tenant!\n\nAda yang bisa kami bantu?\n[1] Isi Ulang Stok\n[2] Lihat Stok\n[3] Update/Restok Produk\n[4] Tambah Produk\n[5] Hapus Produk\n\n_Gunakan fitur dibawah jika hanya tidak ingin isi ulang stok harian_\n[6] Gunakan Stok Sisa Kemarin";
const ADD_PRODUCT_FORM = '📝 *TAMBAH PRODUK*\n=============================\nID Produk: \nNama Produk: \nHarga Produk: \nStok Awal: ';
const DELETE_PRODUCT_FORM = '🗑️ *HAPUS PRODUK*\n=============================\nID Produk: ';

export function isTenant(userId) {
    return allNumberOwnerTenant.includes(userId);
}

function parseUniformStock(text) {
    const value = String(text || '')
        .replace(/^jumlah\s*stok\s*:\s*/i, '')
        .trim();

    return /^\d+$/.test(value) ? Number(value) : null;
}

export async function handleTenantSession({ userId, text, response }) {
    if(!isTenant(userId)) return false;

    if(await handleTenantOrderConfirmation(userId, text, response)) return true;

    if(['keluar', 'kembali', 'menu'].includes(text.toLocaleLowerCase())) {
        delete formTenantSession[userId];
        delete userMode[userId];
        welcomedTenant.add(userId);
        await response.send(userId, TENANT_MENU_MESSAGE);
        return true;
    }

    if(formTenantSession[userId]?.mode === 'choice') {
        if(text === '1') {
            formTenantSession[userId] = { mode: 'uniform' };
            await response.send(userId, 'Masukkan jumlah stok yang akan ditambahkan ke seluruh produk.');
            return true;
        }

        if(text === '2') {
            await generateFormStock(userId);
            return true;
        }

        await response.send(userId, 'Mohon pilih metode pengisian stok yang tersedia.');
        return true;
    }

    if(formTenantSession[userId]?.mode === 'uniform') {
        const quantity = parseUniformStock(text);

        if(quantity === null) {
            await response.send(userId, 'Mohon isi jumlah stok dengan angka.');
            return true;
        }

        const responseStock = await addUniformStock(userId, quantity);

        if(responseStock === 'Stok seluruh produk berhasil ditambahkan.') {
            delete formTenantSession[userId];

            const hasActiveTenantSession = Object.keys(formTenantSession)
                .some(key => key !== 'status' && formTenantSession[key]);

            if(!hasActiveTenantSession) {
                formTenantSession.status = false;
            }
        }

        await response.send(userId, responseStock);
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

    if(userMode[userId] === 'tenant-add-product') {
        const result = await addTenantProduct(userId, text);

        if(result.success) delete userMode[userId];

        await response.send(userId, result.message);
        return true;
    }

    if(userMode[userId] === 'tenant-delete-product') {
        const result = await deleteTenantProduct(userId, text);

        if(result.success) delete userMode[userId];

        await response.send(userId, result.message);
        return true;
    }

    if(!welcomedTenant.has(userId)) {
        welcomedTenant.add(userId);
        await response.send(userId, TENANT_MENU_MESSAGE);
        return true;
    }

    switch(text) {
        case '1': await resetStock(true); await sendStockInputMenu(userId); return true;
        case '2': await response.send(userId, await displayStock(userId)); return true;
        case '3':
            await response.send(userId, "📝 *SILAKAN PERBARUI STOK*\n=============================\nID Produk: \nJumlah Stok: \nStatus: \n\n_*Status diisi dengan tambah/kurang/reset secara text*_");
            userMode[userId] = 'tenant-update-stock';
            return true;
        case '4':
            await response.send(userId, ADD_PRODUCT_FORM);
            userMode[userId] = 'tenant-add-product';
            return true;
        case '5':
            await response.send(userId, DELETE_PRODUCT_FORM);
            userMode[userId] = 'tenant-delete-product';
            return true;
        case 'PERBARUI': await response.send(userId, await extraction(text, 'edit')); return true;
        case '6': await response.send(userId, 'Baik, stok sisa kemarin digunakan.'); return true;
        default: await response.send(userId, 'Anda memilih pilihan diluar menu.'); return true;
    }
}

export { broadcastMenu, TENANT_MENU_MESSAGE };
