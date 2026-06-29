import { allNumberOwnerTenant, tenantSession } from "../../settings/globalVariables.js";
import { rawDatabaseProduct, rawDataTenant } from "../../settings/loadFiles.js";
import { getResponse } from '../security/response.js';

const database_product = JSON.parse(rawDatabaseProduct);
const tenants = JSON.parse(rawDataTenant);

for(const tenant of tenants) {
    if(tenant?.owner_phone && !allNumberOwnerTenant.includes(tenant.owner_phone)) {
        allNumberOwnerTenant.push(tenant.owner_phone);
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formStock(tenant) {
    if(!tenant) {
        return 'Data tenant tidak ditemukan. Mohon hubungi admin.';
    }

    const formStock = [`Tenant: ${tenant["store"]}\n`, "Mohon lakukan pengisian segera.\n\n"];
    const tenantKey = Object.keys(database_product).find(key => key === tenant["store"]);

    if(!tenantKey) {
        return 'Data produk tenant tidak ditemukan. Mohon hubungi admin.';
    }

    const productTenant = Object.keys(database_product[tenantKey]["products"]);

    for(const product of productTenant) {
        formStock.push(`${database_product[tenantKey]["products"][product]["product_name"]}: \n`);
    }

    return formStock.join("");
}

export async function broadcastMenu() {
    const response = getResponse();

    for(const tenant of tenants) {
        if(!tenant?.status_stock) {
            continue;
        }

        if(tenant["status_stock"] === "complete") {
            continue;
        }
        
        await response.send(tenant["owner_phone"], "Halo Pemilik Tenant!\n\nTolong Lakukan Pengisian Stok\n\n[1] Isi Ulang Stok", "normal");

        await delay(Math.floor(Math.random() * 5000) + 3000);
    }

    tenantSession["status"] = true;

    return;
}

export async function generateFormStock(userId) {
    const response = getResponse();
    const tenant = tenants.find(t => t["owner_phone"] === userId);
    const form = formStock(tenant);

    await response.send(userId, form, "normal");

    return form;
}
