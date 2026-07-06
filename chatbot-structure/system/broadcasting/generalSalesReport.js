import fs from 'fs/promises';
import { DATABASE_PRODUCT_PATH } from "../../settings/loadFiles.js";
import { getResponse } from "../security/response.js";

const GROUP_ID = '120363407187484870@g.us';

async function loadDatabaseProduct() {
    const rawDatabaseProduct = await fs.readFile(DATABASE_PRODUCT_PATH, 'utf8');

    return rawDatabaseProduct.trim() ? JSON.parse(rawDatabaseProduct) : {};
}

function formatRupiah(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

export async function generalSalesReport(client) {
    const response = getResponse();

    const databaseProduct = await loadDatabaseProduct();

    const text = [
        "📋 *LAPORAN PENJUALAN HARIAN*\n",
        "=============================\n"
    ];

    for(const [tenantName, tenantData] of Object.entries(databaseProduct || {})) {
        let totalRevenue = 0;

        text.push("", `\n*🏪 ${tenantName}*\n`);

        for(const product of Object.values(tenantData?.["products"] || {})) {
            if(Number(product["qty_sold" == 0])) {
                continue;
            }

            const qtySold = Number(product["qty_sold"]);
            const price = Number(product["price"]);

            text.push(`- ${product["product_name"]} * ${qtySold}\n`);

            totalRevenue += qtySold * price;
        }

        if(totalRevenue == 0) {
            text.push("~ _Tidak memiliki data penjualan_");
        } else {
            text.push(`*_Total -> ${formatRupiah(totalRevenue)}_*\n`);
        }

    }

    await response.send(
        GROUP_ID,
        text.join(""),
        "normal"
    );
}
