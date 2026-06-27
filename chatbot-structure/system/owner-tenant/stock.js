import { rawDatabaseProduct, rawDataTenant } from "../../settings/loadFiles.js";

const database_product = JSON.parse(rawDatabaseProduct);
const tenants = JSON.parse(rawDataTenant);

export async function addStock(dataStock) {
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

export async function editStock(dataStock) {
    const tenantKey = Object.keys(database_product).find(key => key === dataStock["tenant"]);

    if(!tenantKey) {
        return "Gagal Memperbarui Stock!";
    }

    const productTenant = Object.keys(database_product[tenantKey]["products"]);

    for(const product in productTenant) {
        if(database_product[tenantKey]["products"][product]["product_name"].toLowerCase().trim() in dataStock) {
            if(dataStock[database_product[tenantKey]["products"][product]["product_name"].toLowerCase().trim()] === "") {
                continue;
            }
            
            database_product[tenantKey]["products"][product]["stock"] = dataStock[database_product[tenantKey]["products"][product]["product_name"].toLowerCase().trim()];
        }
    }

    return "Stock Berhasil Diperbarui!";
}

export async function resetStock() {
    Object.values(database_product).forEach(value => {
        for(const [productId, product] of Object.entries(value["products"])) {
            product["stock"] = 0;
            product["qty_sold"] = 0;
        }
    });

    for(const tenant of tenants) {
        tenant["status_stock"] = "pending";
    }
}