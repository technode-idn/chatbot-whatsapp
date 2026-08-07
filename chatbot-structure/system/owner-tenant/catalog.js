import fs from 'fs/promises';
import { DATABASE_PRODUCT_PATH, DATA_TENANT_PATH } from '../../settings/loadFiles.js';

async function loadJsonFile(path) {
    const rawData = await fs.readFile(path, 'utf8');

    return rawData.trim() ? JSON.parse(rawData) : [];
}

function normalizeKey(value) {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/^[^a-z0-9]+/i, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function parseForm(text) {
    const data = {};

    for(const line of String(text || '').split('\n')) {
        if(!line.includes(':')) continue;

        const [key, ...valueParts] = line.split(':');
        const normalizedKey = normalizeKey(key);

        if(normalizedKey) {
            data[normalizedKey] = valueParts.join(':').trim();
        }
    }

    return data;
}

function parseNumber(value) {
    const digits = String(value || '').replace(/[^\d]/g, '');

    return digits ? Number(digits) : NaN;
}

function getTenant(tenants, userId) {
    return tenants.find(tenant => tenant['owner_phone'] === userId);
}

function isProductIdUsed(databaseProduct, productId) {
    return Object.values(databaseProduct).some(tenant => (
        Object.prototype.hasOwnProperty.call(tenant?.products || {}, productId)
    ));
}

async function saveDatabase(databaseProduct) {
    await fs.writeFile(DATABASE_PRODUCT_PATH, JSON.stringify(databaseProduct, null, 2));
}

export async function addTenantProduct(userId, text) {
    const [databaseProduct, tenants] = await Promise.all([
        loadJsonFile(DATABASE_PRODUCT_PATH),
        loadJsonFile(DATA_TENANT_PATH)
    ]);
    const tenant = getTenant(tenants, userId);

    if(!tenant || !databaseProduct[tenant.store]?.products) {
        return { success: false, message: 'Data tenant atau produk tidak ditemukan.' };
    }

    const data = parseForm(text);
    const productId = String(data.id_produk || '').trim().toUpperCase();
    const productName = String(data.nama_produk || '').trim();
    const price = parseNumber(data.harga_produk);
    const stock = data.stok_awal === undefined ? 0 : parseNumber(data.stok_awal);

    if(!productId || !productName || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < 0) {
        return {
            success: false,
            message: 'Mohon isi form produk dengan ID Produk, Nama Produk, Harga Produk, dan Stok Awal yang valid.'
        };
    }

    if(!/^[A-Z0-9_-]+$/.test(productId)) {
        return { success: false, message: 'ID Produk hanya boleh berisi huruf, angka, tanda hubung, atau garis bawah.' };
    }

    if(isProductIdUsed(databaseProduct, productId)) {
        return { success: false, message: 'ID Produk sudah digunakan. Mohon gunakan ID Produk lain.' };
    }

    databaseProduct[tenant.store].products[productId] = {
        product_name: productName,
        price,
        stock,
        qty_sold: 0
    };

    await saveDatabase(databaseProduct);

    return { success: true, message: `Produk *${productName}* berhasil ditambahkan.` };
}

export async function deleteTenantProduct(userId, text) {
    const [databaseProduct, tenants] = await Promise.all([
        loadJsonFile(DATABASE_PRODUCT_PATH),
        loadJsonFile(DATA_TENANT_PATH)
    ]);
    const tenant = getTenant(tenants, userId);

    if(!tenant || !databaseProduct[tenant.store]?.products) {
        return { success: false, message: 'Data tenant atau produk tidak ditemukan.' };
    }

    const formData = parseForm(text);
    const productId = String(formData.id_produk || text || '').trim().toUpperCase();
    const product = databaseProduct[tenant.store].products[productId];

    if(!product) {
        return { success: false, message: 'ID Produk tidak ditemukan pada katalog tenant Anda.' };
    }

    delete databaseProduct[tenant.store].products[productId];
    await saveDatabase(databaseProduct);

    return { success: true, message: `Produk *${product.product_name}* berhasil dihapus.` };
}
