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
import { handleCustomerSession } from './chatbot-structure/sessions/customer/handler.js';
import { welcomedUsers } from './chatbot-structure/settings/runtimeUsers.js';
import { isWeekend } from './chatbot-structure/settings/weekend.js';
import { isOutsideOperationalHours } from './chatbot-structure/settings/operationalHours.js';

const { Client, LocalAuth } = pkg;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        headless: true
    }
});

const logger = new Logger();
const monitor = new SystemMonitor(client, logger);
initializeResponse(client, logger);
const response = getResponse();

restoreRuntimeSessions(await monitor.guardians.session.load());

async function saveSessionBeforeExit() {
    await saveRuntimeSessions(monitor.guardians.session);
}

process.once('SIGINT', async () => { await saveSessionBeforeExit(); process.exit(0); });
process.once('SIGTERM', async () => { await saveSessionBeforeExit(); process.exit(0); });

let recoveryFollowUpSent = false;

client.on('ready', async () => {
    // if(recoveryFollowUpSent) return;
    // recoveryFollowUpSent = true;

    // await broadcastMenu();

    // for(const customerId of getActiveCustomerIds()) {
    //     welcomedUsers.add(customerId);
    //     await response.send(customerId, 'Mohon maaf, sepertinya sempat ada gangguan sistem. Silahkan lanjutkan kembali aktivitas anda.', 'high');
    // }

    console.log("ready");
});

nodeCron.schedule('0 16 * * 1-5', async () => {
    await generalSalesReport(client);
    await resetStock(false);
});

client.on('message', async message => {
    try {
        const allowedNumberCust = [
            '64282960068848@lid', // ka ainun
            '135124670787747@lid', // technode
            '77855006433494@lid', // diaz
            '79959943024845@lid', // azmi 2
            '28420016742628@lid', // yusuf
            '58493310615674@lid', // azmi 1 
        ];

        const userId = message.from;
        const text = message.body.trim();

        logger.info(`FROM: ${userId}`);
        logger.info(`MESSAGE: ${message.body}`);

        if(!userId.includes(allowedNumberCust)) return;

        if(message.fromMe || (userId === '64282960068848@lid' && text !== 'export')) return;

        const isGroup = userId.endsWith('@g.us');
        const isCustomer = !isGroup && !isTenant(userId);
        const closedMessage = 'Maaf, KlikbiGo sedang tutup. Waktu Operasinal kami hanya sampai Senin-Jumat di jam 10.00 - 16.00. Terima kasih atas pengertiannya.';

        if(isCustomer && (isWeekend() || isOutsideOperationalHours())) {
            await response.send(userId, closedMessage);
            return;
        }

        if(message.hasMedia) {
            if(isCustomer) {
                await handleCustomerSession({ message, userId, text, client, response, logger, monitor });
            }
            return;
        }

        if(await handleGroupSession({ userId, text, message, client })) return;
        if(await handleTenantSession({ userId, text, response })) return;

        await handleCustomerSession({ message, userId, text, client, response, logger, monitor });
    } finally {
        await saveRuntimeSessions(monitor.guardians.session);
    }
});

monitor.start();
client.initialize();
