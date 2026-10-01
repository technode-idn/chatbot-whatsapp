import fs from 'fs/promises';
import { DATA_TENANT_PATH } from '../../settings/loadFiles.js';
import { tenantIdentityAliases } from '../../settings/globalVariables.js';

async function loadTenantOwners() {
    const rawData = await fs.readFile(DATA_TENANT_PATH, 'utf8');
    const tenants = rawData.trim() ? JSON.parse(rawData) : [];

    return Array.isArray(tenants) ? tenants : [];
}

export async function resolveTenantOwnerId(...identityIds) {
    const identities = identityIds
        .flat()
        .filter(Boolean)
        .map(value => String(value));
    const tenants = await loadTenantOwners();
    const ownerIds = new Set(
        tenants
            .map(tenant => String(tenant?.owner_phone || '').trim())
            .filter(Boolean)
    );

    for(const identityId of identities) {
        if(ownerIds.has(identityId)) return identityId;
        if(tenantIdentityAliases[identityId] && ownerIds.has(tenantIdentityAliases[identityId])) {
            return tenantIdentityAliases[identityId];
        }
    }

    return null;
}
