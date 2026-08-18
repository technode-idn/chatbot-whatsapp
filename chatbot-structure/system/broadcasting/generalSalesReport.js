import fs from 'fs/promises';
import { DATABASE_PRODUCT_PATH } from "../../settings/loadFiles.js";
import { getResponse } from "../security/response.js";

const GROUP_ID = "120363405226602187@g.us";

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
        let hasSales = false;

        text.push("", `\n*🏪 ${tenantName}*\n`);

        for(const product of Object.values(tenantData?.["products"] || {})) {
            const qtySold = Number(product["qty_sold"]) || 0;

            if(qtySold <= 0) {
                continue;
            }

            hasSales = true;
            const price = Number(product["price"]);

            text.push(`- ${product["product_name"]} (${qtySold})\n`);

            totalRevenue += qtySold * price;
        }

        if(!hasSales) {
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
