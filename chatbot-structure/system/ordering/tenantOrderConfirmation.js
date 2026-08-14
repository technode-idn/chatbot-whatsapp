import fs from 'fs/promises';
import { DATA_TENANT_PATH } from '../../settings/loadFiles.js';
import { pendingOrders, tenantOrderConfirmation } from '../../settings/globalVariables.js';
import { getResponse } from '../security/response.js';

function normalizeTenantName(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

async function loadTenants() {
    const rawData = await fs.readFile(DATA_TENANT_PATH, 'utf8');

    return rawData.trim() ? JSON.parse(rawData) : [];
}

function clearOrderConfirmation(orderId) {
    for(const [ownerId, confirmations] of Object.entries(tenantOrderConfirmation)) {
        delete confirmations[orderId];

        if(!Object.keys(confirmations).length) delete tenantOrderConfirmation[ownerId];
    }
}

function buildTenantMessage(orderId, customerInfo, tenantName, items) {
    const productLines = items
        .map(item => `- ${item.productName || item.productId} (${item.quantity})`)
        .join('\n');

    return [
        '📦 *KONFIRMASI KETERSEDIAAN PESANAN*',
        '',
        `Order ID: ${orderId}`,
        `Customer: ${customerInfo.name || '-'}`,
        '',
        `🏪 *TENANT: ${tenantName}*`,
        productLines,
        '',
        'Balas salah satu:',
        'OK = semua produk tersedia',
        'X = ada produk yang tidak tersedia'
    ].join('\n');
}

export async function requestTenantOrderConfirmation(orderId) {
    const order = pendingOrders[orderId];

    if(!order?.items?.length) return { waitingForTenants: false };

    clearOrderConfirmation(orderId);

    const tenants = await loadTenants();
    const itemsByTenant = new Map();

    for(const item of order.items) {
        const tenantKey = normalizeTenantName(item.tenantName);

        if(!tenantKey) continue;

        const items = itemsByTenant.get(tenantKey) || [];
        items.push(item);
        itemsByTenant.set(tenantKey, items);
    }

    const response = getResponse();
    let waitingForTenants = false;

    for(const [tenantKey, items] of itemsByTenant) {
        const tenant = tenants.find(item => normalizeTenantName(item.store) === tenantKey);
        const ownerId = tenant?.owner_phone;

        if(!ownerId) continue;

        tenantOrderConfirmation[ownerId] ??= {};
        tenantOrderConfirmation[ownerId][orderId] = {
            tenantName: tenant.store,
            status: 'pending'
        };
        waitingForTenants = true;

        await response.send(
            ownerId,
            buildTenantMessage(orderId, order.customerInfo || {}, tenant.store, items)
        );
    }

    order.status = waitingForTenants ? 'PENDING_TENANT_CONFIRMATION' : 'PENDING_PAYMENT';

    return { waitingForTenants };
}

export async function handleTenantOrderConfirmation(userId, text, response) {
    const rawText = String(text || '').trim();
    const match = rawText.match(/^(OK|X)(?:\s+(ORD-[A-Z0-9-]+))?$/i);

    if(!match) return false;

    const [, decision, requestedOrderId] = match;
    const pendingConfirmations = Object.entries(tenantOrderConfirmation[userId] || {})
        .filter(([, confirmation]) => confirmation.status === 'pending');
    const orderId = requestedOrderId || pendingConfirmations[0]?.[0];

    if(!requestedOrderId && pendingConfirmations.length > 1) {
        await response.send(userId, 'Ada lebih dari satu pesanan yang menunggu konfirmasi. Balas dengan format OK <Order ID> atau X <Order ID>.');
        return true;
    }

    const confirmation = tenantOrderConfirmation[userId]?.[orderId];

    if(!confirmation || confirmation.status !== 'pending') return false;

    const order = pendingOrders[orderId];

    if(!order) {
        clearOrderConfirmation(orderId);
        await response.send(userId, 'Pesanan ini sudah tidak aktif.');
        return true;
    }

    if(decision.toUpperCase() === 'X') {
        const customerId = order.customer;
        clearOrderConfirmation(orderId);
        const { cancelOrder } = await import('./validationOrder.js');

        await cancelOrder(orderId);
        await response.send(userId, `Pesanan ${orderId} ditandai tidak tersedia.`);
        await response.send(customerId, 'Mohon maaf kak, ada produk yang baru saja tidak tersedia. Pesanan kakak dibatalkan dan stok yang sempat dipesan sudah dikembalikan.');
        return true;
    }

    confirmation.status = 'approved';
    await response.send(userId, `Ketersediaan pesanan ${orderId} sudah dikonfirmasi.`);

    const allConfirmed = Object.values(tenantOrderConfirmation)
        .flatMap(confirmations => Object.entries(confirmations)
            .filter(([savedOrderId]) => savedOrderId === orderId)
            .map(([, value]) => value)
        )
        .every(value => value.status === 'approved');

    if(!allConfirmed) return true;

    const customerId = order.customer;
    clearOrderConfirmation(orderId);
    order.status = 'PENDING_PAYMENT';
    const { askOrderConfirmation } = await import('./editOrder.js');

    await askOrderConfirmation(customerId, orderId);
    return true;
}

export function clearTenantOrderConfirmation(orderId) {
    clearOrderConfirmation(orderId);
}
