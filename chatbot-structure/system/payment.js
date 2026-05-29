import fs from 'fs/promises';
import { rawDataUsers } from '../settings/loadFiles';

export async function payment(userId) {
    // data_form_user
    const dataUsers = JSON.parse(rawDataUsers);

    for(const dataUser of dataUsers) {
        if(dataUser["user_id"] == userId) {
            tenant = dataUser[tenant_name]
            return tenant.qris;
        }
    }
}