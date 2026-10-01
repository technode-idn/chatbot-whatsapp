import fs from "fs/promises";
import pkg from "whatsapp-web.js";
import { exportData } from "../../system/exportData.js";
import {
  DATABASE_PRODUCT_PATH,
  DATA_DELIVERY_PATH,
} from "../../settings/loadFiles.js";

export const ADMIN_MONITOR_ID = ["64282960068848@lid", "58493310615674@lid"];
const { MessageMedia } = pkg;

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

export async function handleAdminMonitorSession({ userId, text, response, monitor }) {
    if (!ADMIN_MONITOR_ID.includes(userId)) return false;

  if (text === "1") {
    if (!(await monitor.guardians.export.begin())) {
      await response.send(userId, "Sedang ada proses export yang berjalan.");
      return true;
    }

    try {
      await exportData();
      await response.sendMedia(
        userId,
        MessageMedia.fromFilePath("./chatbot-structure/file/customer_recap.xlsx"),
        "",
        "low",
      );
      await monitor.guardians.export.finish(true);
    } catch (error) {
      await monitor.guardians.export.finish(false);
      throw error;
    }

    return true;
  }

  if (text === "2") {
    await response.send(userId, await displayProducts());
    return true;
  }

  if (text === "3") {
    await response.send(userId, await displayDrivers());
    return true;
  }

  await response.send(userId, ADMIN_MENU);
  return true;
}
