import {
    deliverySession,
    editingOrder,
    formTenantSession,
    groupSession,
    multipleFormSession,
    orderConfirmationSession,
    paymentStatus,
    paymentVerificationSession,
    pendingOrders,
    pendingProof,
    sessions,
    userMode,
    allNumberOwnerTenant
} from "../../settings/globalVariables.js";

const SESSION_BUCKETS = {
    pendingOrders,
    pendingProof,
    paymentVerificationSession,
    sessions,
    paymentStatus,
    orderConfirmationSession,
    groupSession,
    deliverySession,
    multipleFormSession,
    editingOrder,
    userMode,
    formTenantSession
};

function replaceObject(target, source = {}) {
    for(const key of Object.keys(target)) {
        delete target[key];
    }

    Object.assign(target, source || {});
}

export function collectRuntimeSessions() {
    const data = {};

    for(const [name, value] of Object.entries(SESSION_BUCKETS)) {
        data[name] = value;
    }

    return {
        savedAt: new Date().toISOString(),
        data
    };
}

export function restoreRuntimeSessions(snapshot = {}) {
    const data = snapshot.data || snapshot;

    for(const [name, target] of Object.entries(SESSION_BUCKETS)) {
        replaceObject(target, data?.[name]);
    }
}

export function getActiveCustomerIds() {
    const ids = new Set();

    for(const bucket of Object.values(SESSION_BUCKETS)) {
        for(const key of Object.keys(bucket || {})) {
            ids.add(key);
        }
    }

    for(const pendingOrder of Object.values(pendingOrders || {})) {
        if(pendingOrder?.customer) {
            ids.add(pendingOrder.customer);
        }
    }

    return [...ids].filter(id => {
        const normalizedId = String(id || '');

        return normalizedId.includes('@')
            && !normalizedId.endsWith('@g.us')
            && !allNumberOwnerTenant.includes(normalizedId);
    });
}

export async function saveRuntimeSessions(sessionGuardian) {
    await sessionGuardian.save(collectRuntimeSessions());
}
