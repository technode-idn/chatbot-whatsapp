import fs from 'fs/promises';
import { DATABASE_PRODUCT_PATH, DATA_TENANT_PATH, rawDatabaseProduct, rawDataTenant } from "../../settings/loadFiles.js";

let database_product = JSON.parse(rawDatabaseProduct);
let tenants = JSON.parse(rawDataTenant);

function normalizeKey(value) {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/^\[\d+\]\s*/, "")
        .replace(/^[^a-z0-9]+/i, '')
        .replace(/[^a-z0-9]+$/i, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function parseStock(value) {
    const stock = Number(String(value || '').replace(/[^\d-]/g, ''));

    return Number.isFinite(stock) ? stock : 0;
}

async function loadJsonFile(path) {
    const rawData = await fs.readFile(path, 'utf8');

    return rawData.trim() ? JSON.parse(rawData) : [];
}

async function refreshStockData() {
    database_product = await loadJsonFile(DATABASE_PRODUCT_PATH);
    tenants = await loadJsonFile(DATA_TENANT_PATH);
}

async function persistStockData() {
    await fs.writeFile(
        DATABASE_PRODUCT_PATH,
        JSON.stringify(database_product, null, 2)
    );

    await fs.writeFile(
        DATA_TENANT_PATH,
        JSON.stringify(tenants, null, 4)
    );

    return;
}

export async function addStock(dataStock, userId) {
    await refreshStockData();

    const tenant = tenants.find(item => item["owner_phone"] === userId);
    const tenantKey = tenant?.["store"];

    if(!tenantKey) {
        return "Gagal Menambah Stok!";
    }

    let updatedProducts = 0;

    for(const product of Object.values(database_product[tenantKey]["products"])) {
        const productKey = normalizeKey(product["product_name"]);

        if(Object.prototype.hasOwnProperty.call(dataStock, productKey)) {
            if(String(dataStock[productKey] || '').trim() === '') {
                continue;
            }

            const stockToAdd = parseStock(dataStock[productKey]);

            if(stockToAdd < 0) {
                return "Stok tidak boleh bernilai negatif.";
            }

            product["stock"] += stockToAdd;
            updatedProducts++;
        }
    }

    if(updatedProducts === 0) {
        return "Tidak ada stok produk yang berhasil dibaca. Mohon isi angka stok pada form.";
    }

    if(tenant) {
        tenant["status_stock"] = "complete";
    }

    await persistStockData();

    return "Stok Berhasil Ditambahkan!";
}

export async function addUniformStock(userId, quantity) {
    await refreshStockData();

    const stockToAdd = parseStock(quantity);
    const tenant = tenants.find(tenant => tenant["owner_phone"] === userId);
    const tenantKey = tenant?.["store"];

    if(!tenantKey || !database_product[tenantKey]?.["products"]) {
        return 'Data tenant atau produk tidak ditemukan.';
    }

    for(const product of Object.values(database_product[tenantKey]["products"])) {
        product["stock"] += stockToAdd;
    }

    tenant["status_stock"] = "complete";
    await persistStockData();

    return 'Stok seluruh produk berhasil ditambahkan.';
}

export async function editStock(dataEditStock, userId) {
    await refreshStockData();

    const tenant = tenants.find(item => item["owner_phone"] === userId);
    const tenantKey = tenant?.["store"];
    const stockChange = parseStock(dataEditStock["jumlah_stok"]);
    const editedProductId = String(dataEditStock["id_produk"] || '').trim().toUpperCase();
    const status = String(dataEditStock["status"] || '').trim().toLowerCase();

    if(!tenantKey || !database_product[tenantKey]?.products) {
        return "Data tenant atau produk tidak ditemukan.";
    }

    if(stockChange < 0) {
        return "Jumlah stok tidak boleh bernilai negatif.";
    }

    const product = database_product[tenantKey].products[editedProductId];

    if(!product) {
        return "ID Produk tidak ditemukan pada katalog tenant Anda.";
    }

    if(status === "tambah") {
        product.stock += stockChange;
    } else if(status === "kurang") {
        if(product.stock < stockChange) {
            return "Stok tidak cukup untuk dikurangi.";
        }
        product.stock -= stockChange;
    } else if(status === "reset") {
        product.stock = stockChange;
    } else {
        return "Status tidak valid. Gunakan tambah, kurang, atau reset.";
    }

    await persistStockData();
    return "Stok Berhasil Diperbarui";
}

export async function resetTenantStock(userId) {
    await refreshStockData();

    const tenant = tenants.find(item => item["owner_phone"] === userId);
    const products = database_product[tenant?.["store"]]?.products;

    if(!products) {
        return 'Data tenant atau produk tidak ditemukan.';
    }

    for(const product of Object.values(products)) {
        product.stock = 0;
    }

    await persistStockData();
    return 'Stok tenant berhasil dikosongkan.';
}

export async function resetStock(fill) {
    await refreshStockData();

    Object.values(database_product).forEach(value => {
        for(const product of Object.values(value["products"])) {
            product["qty_sold"] = 0;
            if(fill) {
                product["stock"] = 0;
            }
        }
    });

    if(!fill) {
        for(const tenant of tenants) {
            tenant["status_stock"] = "pending";
            tenant["stock_broadcast_sent"] = false;
        }
    }

    await persistStockData();

    return;
}

export async function displayStock(userId) {
    await refreshStockData();

    const text = ["📦 *RINCIAN STOK SAAT INI*\n", "===========================\n"];

    const tenant = tenants.find(t => t["owner_phone"] === userId);

    if(!tenant) {
        return 'Data tenant tidak ditemukan.';
    }

    const tenantKey = Object.keys(database_product).find(key => key === tenant["store"]);

    if(!tenantKey) {
        return 'Data produk tenant tidak ditemukan.';
    }

    let num = 1;

    for(const product of Object.values(database_product[tenantKey]["products"])) {
        text.push(`\n[${num}] ${product["product_name"]}: ${product["stock"]}\n`);
        num += 1;
    }

    return text.join("");
}
