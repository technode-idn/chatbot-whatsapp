import fs from 'fs/promises';
import { DATA_USERS_PATH, rawDataTenant } from '../settings/loadFiles.js';

const tenants = rawDataTenant.trim() ? JSON.parse(rawDataTenant) : [];

async function loadDataUsers() {
    const dataUsers = await fs.readFile(DATA_USERS_PATH, 'utf8');

    return dataUsers.trim() ? JSON.parse(dataUsers) : [];
}

function normalizeTenantName(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
}

function findTenantQris(tenantName) {
    const normalizedTenantName = normalizeTenantName(tenantName);
    const selectedTenant = tenants.find(tenant => (
        normalizeTenantName(tenant["store"]) === normalizedTenantName
    ));

    return selectedTenant?.["qris"];
}

function getMultiTenantQris() {
    return tenants.find(tenant => !tenant["store"])?.["qris"] || tenants[tenants.length - 1]?.["qris"];
}

export async function payment(orderId) {
    const users = await loadDataUsers();
    const orderRows = users.filter(user => String(user["order_id"]) === String(orderId));

    if(!orderRows.length) {
        return null;
    }

    const totalPrice = orderRows.reduce((total, user) => (
        total + (Number(user["total_price"]) || 0)
    ), 0);
    const tenantNames = [...new Set(orderRows.map(user => user["tenant_name"]).filter(Boolean))];
    const qrisPhoto = tenantNames.length === 1
        ? findTenantQris(tenantNames[0])
        : getMultiTenantQris();

    return {
        order_id: orderId,
        qris_photo: qrisPhoto || null,
        total_price: totalPrice
    };
}
