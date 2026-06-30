import { allNumberOwnerTenant, formTenantSession } from "../../settings/globalVariables.js";
import { rawDatabaseProduct, rawDataTenant } from "../../settings/loadFiles.js";
import { getResponse } from '../security/response.js';
import { extraction } from "./extraction.js";

const database_product = JSON.parse(rawDatabaseProduct);
const tenants = JSON.parse(rawDataTenant);
const response = getResponse();

// for(const tenant of tenants) {
//     if(tenant?.owner_phone && !allNumberOwnerTenant.includes(tenant.owner_phone)) {
//         allNumberOwnerTenant.push(tenant.owner_phone);
//     }
// }

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formStock(tenant) {
    if(!tenant) {
        return 'Data tenant tidak ditemukan. Mohon hubungi admin.';
    }

    const formStock = [`🏪 *Tenant: ${tenant["store"]}*\n\n`, "Tolong lakukan pengisian segera.\n\n", "*BERIKUT DAFTAR PRODUK ANDA*\n", "==========================="];
    const tenantKey = Object.keys(database_product).find(key => key === tenant["store"]);

    if(!tenantKey) {
        return 'Data produk tenant tidak ditemukan. Mohon hubungi admin.';
    }

    const productTenant = Object.keys(database_product[tenantKey]["products"]);
    let num = 1;

    for(const product of productTenant) {
        formStock.push(`[${num}] ${database_product[tenantKey]["products"][product]["product_name"]}: \n`);
        num += 1;
    }

    return formStock.join("");
}

export async function broadcastMenu() {
    for(const tenant of tenants) {
        if(!tenant?.status_stock) {
            continue;
        }

        if(tenant["status_stock"] === "complete") {
            continue;
        }
        
        await response.send(tenant["owner_phone"], formStock(tenant), "normal");

        await delay(Math.floor(Math.random() * 5000) + 3000);
    }

    formTenantSession["status"] = true;

    return;
}

export async function generateFormStock(userId) {
    const tenant = tenants.find(t => t["owner_phone"] === userId);
    const form = formStock(tenant);

    await response.send(userId, form, "normal");

    return;
}

export async function validationFormStock(form) {
    if(!form.includes("pengisian")) {
        return "Tolong lakukan pengisian stok hari ini segera.";
    }

    const responseStock = await extraction(form);

    formTenantSession["status"] = false;

    return responseStock;
}
