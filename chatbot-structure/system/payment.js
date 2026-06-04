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
    const dataUsers = await loadDataUsers();

    for(let index = dataUsers.length - 1; index >= 0; index--) {
        const dataUser = dataUsers[index];

        if(dataUser["user_id"] == userId) {
            const qrisPhoto = findTenantQris(dataUser["tenant_name"]);

            if(!qrisPhoto) {
                return null;
            }

            return {
                qris_photo: qrisPhoto,
                total_price: Number(dataUser["total_price"]) || 0
            };
        }
    }

    return null;
}
