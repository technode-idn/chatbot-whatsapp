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
        "*LAPORAN PENJUALAN HARIAN*",
        "============================="
    ];
    let grandTotalRevenue = 0;

    for(const [tenantName, tenantData] of Object.entries(databaseProduct || {})) {
        let totalRevenue = 0;

        text.push("", `Tenant: ${tenantName}`);

        for(const product of Object.values(tenantData?.["products"] || {})) {
            const qtySold = Number(product["qty_sold"]) || 0;
            const price = Number(product["price"] ?? product["product_unit_price"]) || 0;

            text.push(`${product["product_name"]}: ${qtySold}`);
            totalRevenue += qtySold * price;
        }

        grandTotalRevenue += totalRevenue;
        text.push(`Total -> ${formatRupiah(totalRevenue)}`);
    }

    text.push("", `TOTAL SEMUA TENANT -> ${formatRupiah(grandTotalRevenue)}`);

    await response.send(
        GROUP_ID,
        text.join("\n"),
        "normal"
    );
}
