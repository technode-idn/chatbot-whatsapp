import fs from 'fs/promises';
import { allNumberOwnerTenant, tenantSession } from "../../settings/globalVariables";
import { rawDatabaseProduct, rawDataDailyStock, rawDataTenant } from "../../settings/loadFiles";
import { getResponse } from '../security/response';

const database_product = JSON.parse(rawDatabaseProduct);
const tenants = JSON.parse(rawDataTenant);
const response = getResponse();

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formStock(tenant) {
    const formStock = [`Tenant: ${tenant["store"]}\n`, "Mohon lakukan pengisian segera.\n\n"];

    for(const tenantName in database_product) {
        if(tenantName === tenant["tenant_name"]) {
            const tenantKey = Object.keys(database_product).find(key => key === tenantName);
            const productTenant = Object.keys(database_product[tenantKey]["products"]);

            for(const product of productTenant) {
                formStock.push(`${database_product[tenantKey]["products"][product]["product_name"]}: \n`);
            }
        }
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
        
        await response.send(tenant["owner_phone"], "Halo Pemilik Tenant!\n\nTolong Lakukan Pengisian Stok\n\n[1] Isi Ulang Stok", "normal");

        await delay(Math.floor(Math.random() * 5000) + 3000);
    }

    tenantSession["status"] = true;

    return;
}

export function generateFormStock(userId) {
    const tenant = tenants.find(t => t["owner_phone"] === userId);

    formStock(tenant);
}