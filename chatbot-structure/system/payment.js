import fs from 'fs/promises';
import { DATA_TENANT_PATH, DATA_USERS_PATH } from '../settings/loadFiles.js';
import { pendingOrders } from '../settings/globalVariables.js';

async function loadDataUsers() {
    const dataUsers = await fs.readFile(DATA_USERS_PATH, 'utf8');

    return dataUsers.trim() ? JSON.parse(dataUsers) : [];
}

async function loadTenants() {
    const rawDataTenant = await fs.readFile(DATA_TENANT_PATH, 'utf8');

    return rawDataTenant.trim() ? JSON.parse(rawDataTenant) : [];
}

function normalizeTenantName(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
}

function findTenantQris(tenants, tenantName) {
    const normalizedTenantName = normalizeTenantName(tenantName);
    const selectedTenant = tenants.find(tenant => (
        normalizeTenantName(tenant["store"]) === normalizedTenantName
    ));

    return selectedTenant?.["qris"];
}

function getMultiTenantQris(tenants) {
    const multiTenantQris = tenants.find(tenant => (
        String(tenant["qris"] || "").includes("qris_tenant_8") ||
        String(tenant["tenant_id"] || "").toUpperCase() === "TEN007" ||
        normalizeTenantName(tenant["store"]) === "klikbi"
    ));

    return multiTenantQris?.["qris"] || null;
}

export async function payment(orderId) {
    const users = await loadDataUsers();
    const tenants = await loadTenants();
    const orderRows = users.filter(user => String(user["order_id"]) === String(orderId));

    const pendingOrder = pendingOrders[orderId];
    const paymentRows = orderRows.length
        ? orderRows
        : (pendingOrder?.items || []).map(item => ({
            tenant_name: item.tenantName,
            total_price: (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)
        }));

    if(!paymentRows.length) {
        return null;
    }

    const totalPrice = paymentRows.reduce((total, row) => (
        total + (Number(row["total_price"]) || 0)
    ), 0);
    const tenantNames = [...new Set(paymentRows.map(row => row["tenant_name"]).filter(Boolean))];
    const qrisPhoto = tenantNames.length === 1
        ? findTenantQris(tenants, tenantNames[0])
        : getMultiTenantQris(tenants);

    return {
        order_id: orderId,
        qris_photo: qrisPhoto || null,
        total_price: totalPrice
    };
}
