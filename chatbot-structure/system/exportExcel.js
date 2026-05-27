import fs from 'fs/promises';
import XLSX from 'xlsx';

export async function exportExcel() {
    try {
        const rawData = await fs.readFile('./chatbot-structure/data/data_form_users.json', 'utf8');

        const users = JSON.parse(rawData);

        const worksheet = XLSX.utils.json_to_sheet(users);

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            'Users Form'
        );

        XLSX.writeFile(
            workbook,
            'hasil_form.xlsx'
        );

        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}