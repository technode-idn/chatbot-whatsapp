import fs from 'fs/promises';

export const paymentStatus = {};

export async function payment(userId) {
    const rawData = await fs.readFile('./chatbot-structure/data/data_form_users.json', 'utf8');
    const dataUsers = JSON.parse(rawData);

    for(const dataUser of dataUsers) {
        if(dataUser["user_id"] == userId) {
            tenant = dataUser[tenant_name]
            return tenant.qris;
        }
    }
}