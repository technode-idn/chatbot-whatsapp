import { rawDataTenant, rawDataUsers } from '../settings/loadFiles.js';

const tenants = rawDataTenant.trim() ? JSON.parse(rawDataTenant) : [];
const DATA_USERS_PATH = './chatbot-structure/data/data_form_users.json';

function findTenantQris(tenantName) {
    const normalizedTenantName = String(tenantName || '').trim().toLowerCase();

    const selectedTenant = tenants.find((tenant) => (
        String(tenant.store || '').trim().toLowerCase() === normalizedTenantName
    ));

    return selectedTenant?.qris || tenants[tenants.length - 1]?.qris;
}

export async function payment(userId) {
    const users = rawDataUsers.trim() ? JSON.parse(rawDataUsers) : [];

    for(let index = users.length - 1; index >= 0; index--) {
        const user = users[index];

        if(user["user_id"] == userId) {
            const qrisPhoto = findTenantQris(user["tenant_name"]);

            if(!qrisPhoto) {
                return null;
            }

            return {
                qris_photo: qrisPhoto,
                total_price: Number(user["total_price"]) || 0
            };
        }
    }

    return null;
}
