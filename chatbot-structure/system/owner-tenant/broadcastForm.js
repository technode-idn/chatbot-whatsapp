import fs from 'fs/promises';
import { allNumberOwnerTenant, tenantSession } from "../../settings/globalVariables";
import { rawDataDailyStock, rawDataTenant } from "../../settings/loadFiles";

const tenants = JSON.parse(rawDataTenant)

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function createPendingStatus(tenant) {
    const statuses = JSON.parse(rawDataDailyStock);
    const today = new Date().toISOString().split("T");
    const alreadyExist = statuses.find(item => item["tenant_id"] === tenant["tenant_id"] && item["date"] === today);

    if(alreadyExist) {
        return;
    }

    statuses.push({
        tenant_id: tenant["tenant_id"],
        tenant_name: tenant["tenant_name"],
        date: today,
        status: 'pending'
    });

    await fs.readFile(
        './chatbot-structure/data/daily_stock_status.json',
        JSON.stringify(statuses, null, 4)
    );

    return;
}

export async function broadcastForm(client) {
    const menuTenants = "Halo Pemilik Tenant\n\nTolong lakukan pengisian jumlah stok produk hari ini.\n\n[1] Isi Stok Harian Produk\n[2] Update/Restok Produk\n[3] Rekapan Penjualan Hari Ini";

    for(const tenant of tenants) {
        await client.sendMessage(
            tenant["owner_phone"],
            menuTenants
        );

        createPendingStatus(tenant);

        allNumberOwnerTenant.push(tenant["owner_phone"])

        await delay(Math.floor(Math.random() * 5000) + 3000);
    }

    tenantSession["status"] = true;

    return;
}