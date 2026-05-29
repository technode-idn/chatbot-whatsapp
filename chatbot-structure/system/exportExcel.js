import XLSX from 'xlsx';
import { rawDataUsers } from '../settings/loadFiles';

export async function exportExcel() {
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
            './chatbot-structure/export/hasil_form.xlsx'
        );

        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}