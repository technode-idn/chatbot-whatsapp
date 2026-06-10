import fs from 'fs/promises';
import { rawDataTenant } from '../settings/loadFiles.js';

const tenants = rawDataTenant.trim() ? JSON.parse(rawDataTenant) : [];
const DATA_USERS_PATH = './chatbot-structure/data/data_form_users.json';

async function loadDataUsers() {
    const rawDataUsers = await fs.readFile(DATA_USERS_PATH, 'utf8');

    return rawDataUsers.trim()
        ? JSON.parse(rawDataUsers)
        : [];
}

function findTenantQris(tenantName) {
    const normalizedTenantName = String(tenantName || '').trim().toLowerCase();

    const selectedTenant = tenants.find((tenant) => (
        String(tenant.store || '').trim().toLowerCase() === normalizedTenantName
    ));

    return selectedTenant?.qris || tenants[tenants.length - 1]?.qris;
}

export async function payment(userId) {
    const users = await loadDataUsers();

    for(let index = users.length - 1; index >= 0; index--) {
        const user = users[index];

        if(user["user_id"] == userId) {
            const qrisPhoto = findTenantQris(user["tenant_name"]);

            if(!qrisPhoto) {
                return null;
            }

            return {
                order_id: user["order_id"],
                qris_photo: qrisPhoto,
                total_price: Number(user["total_price"]) || 0
            };
        }
    }

    return null;
}
