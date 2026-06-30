import fs from 'fs/promises';
import { DATABASE_PRODUCT_PATH, DATA_TENANT_PATH, rawDatabaseProduct, rawDataTenant } from "../../settings/loadFiles.js";

const database_product = JSON.parse(rawDatabaseProduct);
const tenants = JSON.parse(rawDataTenant);

function normalizeKey(value) {
    return String(value || '').toLowerCase().trim().replace(/\s+/g, '_');
}

function parseStock(value) {
    const stock = Number(String(value || '').replace(/[^\d-]/g, ''));

    return Number.isFinite(stock) ? stock : 0;
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

export async function addStock(dataStock) {
    const tenantKey = Object.keys(database_product).find(key => key === dataStock["tenant"]);

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

            product["stock"] += parseStock(dataStock[productKey]);
            updatedProducts++;
        }
    }

    if(updatedProducts === 0) {
        return "Tidak ada stok produk yang berhasil dibaca. Mohon isi angka stok pada form.";
    }

    const tenant = tenants.find(tenant => tenant["store"] === tenantKey);

    if(tenant) {
        tenant["status_stock"] = "complete";
    }

    await persistStockData();

    return "Stok Berhasil Ditambahkan!";
}

export async function editStock(dataEditStock) {
    const productKey = Object.keys(database_product);
    const stockChange = parseStock(dataEditStock["jumlah_stok"]);
    const editedProductId = String(dataEditStock["id_produk"] || '').trim().toUpperCase();
    const status = String(dataEditStock["status"] || '').trim().toLowerCase();

    for(const key of productKey) {
        const productTenant = Object.keys(database_product[key]["products"]);

        for(const productKey of productTenant) {
            if(productKey === editedProductId) {
                if(status === "tambah") {
                    database_product[key]["products"][productKey]["stock"] += stockChange;
                } else if(status === "kurang") {
                    database_product[key]["products"][productKey]["stock"] -= stockChange;
                } else if(status === "reset") {
                    database_product[key]["products"][productKey]["stock"] = stockChange;
                } else {
                    return "Status tidak valid. Gunakan tambah, kurang, atau reset.";
                }

                await persistStockData();

                return "Stok Berhasil Diperbarui";
            }
        }
    }

    return "ID Produk tidak ditemukan.";
}

export async function resetStock(fill) {
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
        }
    }

    await persistStockData();

    return;
}

export async function displayStock(userId) {
    const text = ["📦 *RINCIAN STOK SAAT INI*\n", "==========================="];

    const tenant = tenants.find(t => t["owner_phone"] === userId);

    const tenantKey = Object.keys(database_product).find(key => key === tenant["store"]);

    if(!tenantKey) {
        return 'Data produk tenant tidak ditemukan.';
    }

    let num = 1;

    for(const product of Object.values(database_product[tenantKey]["products"])) {
        text.push(`[${num}] ${product["product_name"]}: ${product["stock"]}\n`);
        num += 1;
    }

    return text.join("");
}
