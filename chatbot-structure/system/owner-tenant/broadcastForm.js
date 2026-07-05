import { allNumberOwnerTenant, formTenantSession } from "../../settings/globalVariables.js";
import fs from 'fs/promises';
import { DATABASE_PRODUCT_PATH, DATA_TENANT_PATH, rawDatabaseProduct, rawDataTenant } from "../../settings/loadFiles.js";
import { getResponse } from '../security/response.js';
import { extraction } from "./extraction.js";

let database_product = JSON.parse(rawDatabaseProduct);
let tenants = JSON.parse(rawDataTenant);

async function loadJsonFile(path) {
    const rawData = await fs.readFile(path, 'utf8');

    return rawData.trim() ? JSON.parse(rawData) : [];
}

async function refreshBroadcastData() {
    database_product = await loadJsonFile(DATABASE_PRODUCT_PATH);
    tenants = await loadJsonFile(DATA_TENANT_PATH);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formStock(tenant) {
    if(!tenant) {
        return 'Data tenant tidak ditemukan. Mohon hubungi admin.';
    }

    const formStock = [`🏪 *Tenant: ${tenant["store"]}*\n\n`, "Tolong lakukan pengisian segera.\n\n", "📦 *DAFTAR PRODUK ANDA*\n", "==========================="];
    const tenantKey = Object.keys(database_product).find(key => key === tenant["store"]);

    if(!tenantKey) {
        return 'Data produk tenant tidak ditemukan. Mohon hubungi admin.';
    }

    const productTenant = Object.keys(database_product[tenantKey]["products"]);
    let num = 1;

    for(const product of productTenant) {
        formStock.push(`\n[${num}] ${database_product[tenantKey]["products"][product]["product_name"]}: \n`);
        num += 1;
    }

    return formStock.join("");
}

export async function broadcastMenu() {
    await refreshBroadcastData();

    const response = getResponse();

    for(const tenant of tenants) {
        if(!tenant?.status_stock) {
            continue;
        }

        if(tenant["status_stock"] === "complete") {
            continue;
        }
        
        await response.send(tenant["owner_phone"], formStock(tenant), "normal");
        
        formTenantSession[tenant["owner_phone"]] = true;

        await delay(Math.floor(Math.random() * 5000) + 3000);
    }

    formTenantSession["status"] = true;

    return;
}

export async function generateFormStock(userId) {
    await refreshBroadcastData();

    const response = getResponse();
    const tenant = tenants.find(t => t["owner_phone"] === userId);
    const form = formStock(tenant);

    await response.send(userId, form, "normal");
    formTenantSession[userId] = true;

    return;
}

export async function validationFormStock(form, userId = null) {
    if(!/tenant\s*:/i.test(form)) {
        return "Format stok tidak sesuai. Mohon kirim form stok yang berisi Tenant dan daftar produk.";
    }

    const responseStock = await extraction(form, "add");

    if(userId) {
        delete formTenantSession[userId];
    }

    const hasActiveTenantSession = Object.keys(formTenantSession)
        .some(key => key !== "status" && formTenantSession[key]);

    if(!hasActiveTenantSession) {
        formTenantSession["status"] = false;
    }

    return responseStock;
}
