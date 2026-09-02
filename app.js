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
import { ADMIN_MONITOR_ID, handleAdminMonitorSession } from './chatbot-structure/sessions/admin-monitor/handler.js';
import { handleCustomerSession } from './chatbot-structure/sessions/customer/handler.js';
import { welcomedUsers } from './chatbot-structure/settings/runtimeUsers.js';
import { isWeekend } from './chatbot-structure/settings/weekend.js';
import { isOutsideOperationalHours } from './chatbot-structure/settings/operationalHours.js';
import { isPublicHoliday } from './chatbot-structure/settings/publicHolidays.js';

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
      const userId = message.from;
      const rawText = message.body.trim();
      // Pilihan 1 memakai proses export yang sudah ada di customer handler.
      const text = userId === ADMIN_MONITOR_ID && rawText === "1" ? "export" : rawText;
      const isGroup = userId.endsWith("@g.us");
      const isKnownTenant = isTenant(userId);
      const isKnownDriverAdmin = isDriverAdmin(userId);

      logger.info(`FROM: ${userId}`);
      logger.info(`MESSAGE: ${message.body}`);

      if (message.fromMe) return;

      const isCustomer = !isGroup && !isKnownTenant && !isKnownDriverAdmin && userId !== ADMIN_MONITOR_ID;
      const closedMessage =
        "Maaf, KlikbiGo sedang tutup. Waktu Operasinal kami hanya sampai Senin-Jumat di jam 10.00 - 16.00. Terima kasih atas pengertiannya.";

      if (isCustomer && (isWeekend() || isOutsideOperationalHours() || isPublicHoliday())) {
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
      if (await handleAdminMonitorSession({ userId, text: rawText, response })) return;

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
