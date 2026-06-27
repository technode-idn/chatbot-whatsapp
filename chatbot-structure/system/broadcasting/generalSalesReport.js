import { rawDatabaseProduct } from "../../settings/loadFiles.js";

const database_product = JSON.parse(rawDatabaseProduct);

export async function generalSalesReport(client) {
    const text = ["*LAPORAN PENJUALAN HARIAN 📝*\n", "=============================\n"];

    const totalRevenue = 0

    for(const [tenantName, tenantData] of Object.entries(database_product)) {
        text.push(`🏪\n${tenantName}\n`);

        for(const [productId, product] of Object.entries(tenantData["products"])) {
            text.push(`${product["product_name"]}: ${product["qty_sold"]}\n`);

            totalRevenue += product["qty_sold"] * product["price"];
        }

        text.push(`*_Total -> ${totalRevenue}_*`);

        totalRevenue = 0;
    }

    await client.sendMessage(
        '120363407187484870@g.us',
        text
    );
}