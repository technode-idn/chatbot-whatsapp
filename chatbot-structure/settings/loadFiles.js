import fs from 'fs/promises';

export const rawDatabaseProduct = await fs.readFile('./chatchatbot-structure/data/database_produk.json', 'utf8');
export const rawDataUsers = await fs.readFile('./chatbot-structure/data/data_form_users.json', 'utf8');
export const rawDataTenant = await fs.readFile('./chatbot-structure/data/tenant_owners.json', 'utf8');