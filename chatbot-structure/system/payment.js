import fs from 'fs/promises';
import { rawDataUsers, rawDataTenant } from '../settings/loadFiles.js';

const tenants = rawDataTenant.trim() ? JSON.parse(rawDataTenant) : [];
const dataUsers = JSON.parse(rawDataUsers);

export async function payment(userId) {

    for(const dataUser of dataUsers) {
        if(dataUser["user_id"] == userId) {
            const tenant_name = dataUser["tenant_name"];
            const total = dataUser["total_price"];
            for(const tenant of tenants) {
                if(tenant["store"] == tenant_name) {
                    return {
                        qris_photo: tenant["qris"],
                        total_price: total
                    };
                }
            }
            return {
                qris_photo: tenants[7]["qris"],
                total_price: total
            }
        }
    }
}