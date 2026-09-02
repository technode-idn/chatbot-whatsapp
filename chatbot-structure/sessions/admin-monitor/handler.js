import fs from "fs/promises";
import {
  DATABASE_PRODUCT_PATH,
  DATA_DELIVERY_PATH,
} from "../../settings/loadFiles.js";

export const ADMIN_MONITOR_ID = "64282960068848@lid";

const ADMIN_MENU =
  "Halo admin, ada yang bisa dibantu?\n[1] Export File Penjualan\n[2] Lihat Database Produk\n[3] Lihat Database Driver\n\n Ketik *menu* untuk kembali ke daftar ini";

async function loadJson(path, fallback) {
  const rawData = await fs.readFile(path, "utf8");
  return rawData.trim() ? JSON.parse(rawData) : fallback;
}

async function displayProducts() {
  const databaseProduct = await loadJson(DATABASE_PRODUCT_PATH, {});
  const tenantMessages = [];

  for (const [tenantName, tenant] of Object.entries(databaseProduct)) {
    const products = Object.values(tenant?.products || {}).filter(
      (product) => Number(product?.stock || 0) > 0,
    );

    if (!products.length) {
      tenantMessages.push(`${tenantName}\nbelum ada data produk satu pun yang terisi`);
      continue;
    }

    tenantMessages.push(
      `🏪*${tenantName}*\n${products
        .map((product) => `- ${product.product_name} (${product.stock})`)
        .join("\n")}`,
    );
  }

  return tenantMessages.length
    ? tenantMessages.join("\n\n")
    : "Belum ada data produk satu pun yang terisi";
}

async function displayDrivers() {
  const drivers = await loadJson(DATA_DELIVERY_PATH, []);

  if (!Array.isArray(drivers) || !drivers.length) {
    return "Belum ada satu pun data driver saat ini";
  }

  return drivers.map((driver) => `- ${driver.name || "-"}`).join("\n");
}

export async function handleAdminMonitorSession({ userId, text, response }) {
  if (userId !== ADMIN_MONITOR_ID) return false;

  if (text === "2") {
    await response.send(userId, await displayProducts());
    return true;
  }

  if (text === "3") {
    await response.send(userId, await displayDrivers());
    return true;
  }

  if (text !== "1") {
    await response.send(userId, ADMIN_MENU);
    return true;
  }

  return false;
}
