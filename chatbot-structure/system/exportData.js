import XLSX from 'xlsx';
import fs from 'fs/promises';
import { DATA_USERS_PATH } from '../settings/loadFiles.js';

export async function exportData() {
    try {
        const rawDataUsers = await fs.readFile(DATA_USERS_PATH, 'utf8');
        const users = rawDataUsers.trim() ? JSON.parse(rawDataUsers) : [];

        const worksheet = XLSX.utils.json_to_sheet(users);

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            'Users Form'
        );

        XLSX.writeFile(
            workbook,
            './chatbot-structure/file/customer_recap.xlsx'
        );

        return;
    } catch (error) {
        console.log(error);
        return;
    }
}
