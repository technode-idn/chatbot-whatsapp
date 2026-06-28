import { rawDatabaseProduct, rawDataTenant } from "../../settings/loadFiles.js";

const database_product = JSON.parse(rawDatabaseProduct);
const tenants = JSON.parse(rawDataTenant);

export function addStock(dataStock) {
    const tenantKey = Object.keys(database_product).find(key => key === dataStock["tenant"]);

    if(!tenantKey) {
        return "Gagal Menambah Stok!";
    }

    const productTenant = Object.keys(database_product[tenantKey]["products"]);

    for(const product in productTenant) {
        if(database_product[tenantKey]["products"][product]["product_name"].toLowerCase().trim() in dataStock) {
            database_product[tenantKey]["products"][product]["stock"] += dataStock[database_product[tenantKey]["products"][product]["product_name"].toLowerCase().trim()];
        }
    }

    return "Stok Berhasil Ditambahkan!";
}

export function editStock(dataEditStock) {
    const productKey = Object.keys(database_product);

    for(const key of productKey) {
        const productTenant = Object.keys(database_product[key]["products"]);

        for(const productKey of productTenant) {
            if(productKey === dataEditStock["id_produk"]) {
                if(dataEditStock["status"] === "tambah") {
                    database_product[key]["products"][productKey]["stok"] += dataEditStock["jumlah_stok"];
                } else if(dataEditStock["status"] === "kurang") {
                    database_product[key]["products"][productKey]["stok"] -= dataEditStock["jumlah_stok"];
                } else if(dataEditStock["status"] === "reset") {
                    database_product[key]["products"][productKey]["stok"] = dataEditStock["jumlah_stok"];
                }

                return "Stok Berhasil Diperbarui";
            }
        }
    }
}

export function resetStock() {
    Object.values(database_product).forEach(value => {
        for(const [productId, product] of Object.entries(value["products"])) {
            product["qty_sold"] = 0;
        }
    });

    for(const tenant of tenants) {
        tenant["status_stock"] = "pending";
    }

    return;
}

export async function displayStock(userId) {
    const text = ["Berikut adalah rincian stok saat ini:\n"];

    const tenant = tenants.find(t => t["owner_phone"] === userId);

    const tenantKey = Object.keys(database_product).find(key => key === tenant["store"]);

    const productTenant = Object.keys(database_product[tenantKey]["products"]);
    
    for(const [productId, product] of Object.entries(productTenant)) {
        text.push(`${product["product_name"]}: ${product["stock"]}\n`);
    }

    return text.join("");
}