import fs from 'fs/promises';
import { allNumberOwnerTenant, tenantSession } from "../../settings/globalVariables";
import { rawDatabaseProduct, rawDataDailyStock, rawDataTenant } from "../../settings/loadFiles";

const database_product = JSON.parse(rawDatabaseProduct);
const tenants = JSON.parse(rawDataTenant)

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formStock(tenant) {
    if(status === "editStock") {
        const formStock = [`Tenant: ${tenant["store"]}\n`, "Silahkan perbarui stok.\n\n", "Kosongkan untuk yang tidak ingin diperbarui\n\n"];
    } else {
        const formStock = [`Tenant: ${tenant["store"]}\n`, "Mohon lakukan pengisian segera.\n\n"];
    }

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

export async function broadcastForm(client) {
    for(const tenant of tenants) {
        if(!tenant?.status_stock) {
            continue;
        }

        if(tenant["status_stock"] === "complete") {
            continue;
        }
        
        await client.sendMessage(
            tenant["owner_phone"],
            formStock(tenant)
        );

        await delay(Math.floor(Math.random() * 5000) + 3000);
    }

    tenantSession["status"] = true;

    return;
}

export async function editStockForm(userId, client) {
    const tenant = tenants.find(t => t["owner_phone"] === userId);

    await client.sendMessage(
        userId,
        formStock(tenant, "editStock")
    );

    return;
}