import fs from 'fs/promises';

export const DATABASE_PRODUCT_PATH = './chatbot-structure/data/database_produk.json';
export const DATA_USERS_PATH = './chatbot-structure/data/data_form_users.json';
export const DATA_TENANT_PATH = './chatbot-structure/data/tenant_owners.json';
export const DATA_FAQ_PATH = './chatbot-structure/data/faq_response.json';
export const DATA_DELIVERY_PATH = './chatbot-structure/data/database_delivery.json';
export const DATA_DAILY_STOCK_PATH = './chatbot-structure/data/daily_stock_status.json';

export const rawDatabaseProduct = await fs.readFile(DATABASE_PRODUCT_PATH, 'utf8');
export const rawDataUsers = await fs.readFile(DATA_USERS_PATH, 'utf8');
export const rawDataTenant = await fs.readFile(DATA_TENANT_PATH, 'utf8');
export const rawDataFaq = await fs.readFile(DATA_FAQ_PATH, 'utf8');
export const rawDataDelivery = await fs.readFile(DATA_DELIVERY_PATH, 'utf8');
export const rawDataDailyStock = await fs.readFile(DATA_DAILY_STOCK_PATH, 'utf8');
