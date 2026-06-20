import { rawDatabaseProduct, rawDataTenant } from "../../settings/loadFiles.js";

const database_product = JSON.parse(rawDatabaseProduct);
const tenants = JSON.parse(rawDataTenant);

export async function formStock(userId, client) {
    const tenant = tenants.find(tenant => tenant["owner_phone"] === userId);

    if(!tenant) {
        return;
    }

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

    formStock.push("Terima kasih sudah melakukan pengisian 🙏😊");

    await client.sendMessage(
        userId,
        formStock
    );

    return;
}

export async function addStock(dataStock) {
    const tenantKey = Object.keys(database_product).find(key => key === dataStock["tenant"]);

    if(!tenantKey) {
        return "Gagal Memperbarui Stock!";
    }

    const productTenant = Object.keys(database_product[tenantKey]["products"]);

    for(const product in productTenant) {
        if(database_product[tenantKey]["products"][product]["product_name"].toLowerCase().trim() in dataStock) {
            database_product[tenantKey]["products"][product]["stock"] += dataStock[database_product[tenantKey]["products"][product]["product_name"].toLowerCase().trim()];
        }
    }

    return "Stock Berhasil Diperbarui!";
}