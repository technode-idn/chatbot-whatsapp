import XLSX from 'xlsx';
import { rawDataUsers } from '../settings/loadFiles.js';

export async function exportData() {
    try {
        const users = JSON.parse(rawDataUsers);

        const worksheet = XLSX.utils.json_to_sheet(users);

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            'Users Form'
        );

        XLSX.writeFile(
            workbook,
            'customer_recap.xlsx'
        );

        return;
    } catch (error) {
        console.log(error);
        return;
    }
}