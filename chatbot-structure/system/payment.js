import fs from 'fs/promises';
import { rawDataTenant, rawDataUsers } from '../settings/loadFiles.js';

const tenants = rawDataTenant.trim() ? JSON.parse(rawDataTenant) : [];

async function loadDataUsers() {
    const dataUsers = await fs.readFile(rawDataUsers, 'utf8');

    return dataUsers.trim() ? JSON.parse(dataUsers) : [];
}

// function findTenantQris(tenantName) {
//     const normalizedTenantName = String(tenantName || '').trim().toLowerCase();

//     const selectedTenant = tenants.find((tenant) => (
//         String(tenant.store || '').trim().toLowerCase() === normalizedTenantName
//     ));

//     return selectedTenant?.qris || tenants[tenants.length - 1]?.qris;
// }

export async function payment(orderId) {
    const users = await loadDataUsers();
    let tenantName = null;
    let qrisPhoto = null;
    let totalOrder = null;
    let totalPrice = null;

    for(const user of users) {
        if(user["order_id"] === orderId) {
            tenantName = user["tenant_name"];
            totalPrice += user["total_price"];
            totalOrder += 1;
        }
    }

    if(totalOrder > 1) {
        qrisPhoto = tenants[7]["qris"];
    } else if(totalOrder === 1) {
        const selectedTenant = tenants.find(tenant => String(tenant["store"]) === tenantName);
        qrisPhoto = selectedTenant["qris"];
    }

    if(qrisPhoto) {
        return {
            order_id: orderId,
            qris_photo: qrisPhoto,
            total_price: Number(totalPrice) || 0
        };
    } else {
        return null;
    }

    // for(let index = users.length - 1; index >= 0; index--) {
    //     const user = users[index];

    //     if(user["user_id"] == userId) {
    //         const qrisPhoto = findTenantQris(user["tenant_name"]);

    //         if(!qrisPhoto) {
    //             return null;
    //         }

    //         return {
    //             order_id: user["order_id"],
    //             qris_photo: qrisPhoto,
    //             total_price: Number(user["total_price"]) || 0
    //         };
    //     }
    // }
}
