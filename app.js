import pkg from 'whatsapp-web.js';
import nodeCron from 'node-cron';
import Logger from './chatbot-structure/system/security/logger.js';
import SystemMonitor from './chatbot-structure/system/security/monitor.js';
import { getResponse, initializeResponse } from './chatbot-structure/system/security/response.js';
import { getActiveCustomerIds, restoreRuntimeSessions, saveRuntimeSessions } from './chatbot-structure/system/security/runtimeSession.js';
import { generalSalesReport } from './chatbot-structure/system/broadcasting/generalSalesReport.js';
import { resetStock } from './chatbot-structure/system/owner-tenant/stock.js';
import { broadcastMenu } from './chatbot-structure/sessions/tenant/handler.js';
import { handleGroupSession } from './chatbot-structure/sessions/group/handler.js';
import { handleTenantSession, isTenant } from './chatbot-structure/sessions/tenant/handler.js';
import { handleDriverAdminSession, isDriverAdmin } from './chatbot-structure/sessions/driver-admin/handler.js';
import { handleCustomerSession } from './chatbot-structure/sessions/customer/handler.js';
import { welcomedUsers } from './chatbot-structure/settings/runtimeUsers.js';
import { isWeekend } from './chatbot-structure/settings/weekend.js';
import { isOutsideOperationalHours } from './chatbot-structure/settings/operationalHours.js';
// Production dihapus
import { orderConfirmationSession } from './chatbot-structure/settings/globalVariables.js';

const { Client, LocalAuth } = pkg;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: true
    }
});

const logger = new Logger();
const monitor = new SystemMonitor(client, logger);
initializeResponse(client, logger);
const response = getResponse();

restoreRuntimeSessions(await monitor.guardians.session.load());

// Tandai pelanggan yang memiliki sesi sebelum client menerima pesan baru.
// Ini mencegah menu awal terkirim saat proses recovery masih berjalan.
const recoveredCustomerIds = getActiveCustomerIds();
for(const customerId of recoveredCustomerIds) {
    welcomedUsers.add(customerId);
}

async function saveSessionBeforeExit() {
    await saveRuntimeSessions(monitor.guardians.session);
}

process.once('SIGINT', async () => { await saveSessionBeforeExit(); process.exit(0); });
process.once('SIGTERM', async () => { await saveSessionBeforeExit(); process.exit(0); });

let recoveryFollowUpSent = false;

client.on('ready', async () => {
     if(recoveryFollowUpSent) return;
     recoveryFollowUpSent = true;

     await broadcastMenu();
     await saveRuntimeSessions(monitor.guardians.session);

     for(const customerId of recoveredCustomerIds) {
         await response.send(customerId, 'Mohon maaf, sepertinya sempat ada gangguan sistem. Silahkan lanjutkan kembali aktivitas anda.', 'high');
     }
});

nodeCron.schedule('0 16 * * 1-5', async () => {
    await generalSalesReport(client);
    await resetStock(false);
});

client.on('message', async message => {
    try {
      // Production dihapus
      const allowedNumberCust = [
        "64282960068848@lid", // ka ainun
        "135124670787747@lid", // technode
        "79959943024845@lid", // azmi 2
        "28420016742628@lid", // yusuf
        "58493310615674@lid", // azmi 1
      ];

      const userId = message.from;
      const text = message.body.trim();
      const isGroup = userId.endsWith("@g.us");
      const isKnownTenant = isTenant(userId);
      const isKnownDriverAdmin = isDriverAdmin(userId);

      logger.info(`FROM: ${userId}`);
      logger.info(`MESSAGE: ${message.body}`);

      // Production dihapus
      const hasActiveOrderConfirmation = orderConfirmationSession[userId]?.status;

      // Production dihapus
      if (
        !allowedNumberCust.includes(userId) &&
        !isKnownTenant &&
        !isKnownDriverAdmin &&
        !isGroup &&
        !hasActiveOrderConfirmation
      ) {
        return;
      }

      if (
        message.fromMe ||
        (userId === "64282960068848@lid" && text !== "export")
      )
        return;

      const isCustomer = !isGroup && !isKnownTenant && !isKnownDriverAdmin;
      const closedMessage =
        "Maaf, KlikbiGo sedang tutup. Waktu Operasinal kami hanya sampai Senin-Jumat di jam 10.00 - 16.00. Terima kasih atas pengertiannya.";

      if (isCustomer && (isWeekend() || isOutsideOperationalHours())) {
        await response.send(userId, closedMessage);
        return;
      }

      if (message.hasMedia) {
        if (isCustomer) {
          await handleCustomerSession({
            message,
            userId,
            text,
            client,
            response,
            logger,
            monitor,
          });
        }
        return;
      }

      if (await handleGroupSession({ userId, text, message, client })) return;
      if (await handleTenantSession({ userId, text, response })) return;
      if (await handleDriverAdminSession({ userId, text, response })) return;

      await handleCustomerSession({
        message,
        userId,
        text,
        client,
        response,
        logger,
        monitor,
      });
    } catch(error) {
        logger.error(error);
    } finally {
        try {
            await saveRuntimeSessions(monitor.guardians.session);
        } catch(error) {
            logger.error(error);
        }
    }
});

monitor.start();
client.initialize();
