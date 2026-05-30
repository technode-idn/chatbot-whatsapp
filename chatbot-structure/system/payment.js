import fs from 'fs/promises';
import { rawDataUsers } from '../settings/loadFiles.js';

export async function payment(userId) {
    // data_form_user
    const dataUsers = JSON.parse(rawDataUsers);

    for(const dataUser of dataUsers) {
        if(dataUser.user_id == userId) {
            qris = dataUser.tenant_qris;
            total = dataUser.total_price
            return {
                qris_photo: qris,
                total_price: total
            };
        }
    }
}