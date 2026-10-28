import config from "./config.js";

import WhatsAppGuardian from "./guardians/whatsapp.js";
import InternetGuardian from "./guardians/internet.js";
import MemoryGuardian from "./guardians/memory.js";
import StorageGuardian from "./guardians/storage.js";
import BackupGuardian from "./guardians/backup.js";
import SessionGuardian from "./guardians/session.js";
import SchedulerGuardian from "./guardians/scheduler.js";
import ExportGuardian from "./guardians/export.js";
import ResponseQueue from "./guardians/responseQueue.js";

class SystemMonitor {

    constructor(client, logger) {

        this.client = client;
        this.logger = logger;
        this.intervals = [];
        this.started = false;

        this.guardians = {

            whatsapp : new WhatsAppGuardian(client, logger),

            internet : new InternetGuardian(logger),

            memory : new MemoryGuardian(logger),

            storage : new StorageGuardian(logger),

            backup : new BackupGuardian(logger),

            session : new SessionGuardian(logger),

            scheduler : new SchedulerGuardian(logger),

            export : new ExportGuardian(logger),

            response: new ResponseQueue(client, logger)

        };

    }

    start() {

        if (this.started) return;
        this.started = true;

        this.logger.success("========== SYSTEM MONITOR START ==========");

        // Guardian yang memiliki event listener
        this.guardians.whatsapp.start();

        this.guardians.response.start();

        this.guardians.session.start();

        // Menjalankan seluruh monitoring
        this.startInternetMonitor();

        this.startMemoryMonitor();

        this.startStorageMonitor();

        this.startBackupMonitor();

        this.startSessionMonitor();

        this.logger.success("All Guardians Started.");

    }

    startInternetMonitor() {

        const interval = setInterval(async () => {
            if (!this.started) return;

            try {
                await this.guardians.internet.check();
                const healthy = await this.guardians.whatsapp.check();
                if (this.guardians.internet.getStatus() && !healthy) {
                    await this.guardians.whatsapp.reconnect();
                }
            } catch (error) {
                this.logger.error(error);
            }
        }, config.internet.interval);
        this.intervals.push(interval);

    }

    startMemoryMonitor() {

        const interval = setInterval(async () => {

            await this.guardians.memory.check();

        }, config.memory.interval);
        this.intervals.push(interval);

    }

    startStorageMonitor() {

        const interval = setInterval(async () => {

            await this.guardians.storage.check();

        }, config.storage.interval);
        this.intervals.push(interval);

    }

    startBackupMonitor() {

        const interval = setInterval(async () => {

            await this.guardians.backup.check();

        }, config.backup.interval);
        this.intervals.push(interval);

    }

    startSessionMonitor() {

        const interval = setInterval(async () => {

            await this.guardians.session.check();

        }, config.session.interval);
        this.intervals.push(interval);

    }

    stop() {
        if (!this.started) return;
        this.started = false;
        for (const interval of this.intervals) clearInterval(interval);
        this.intervals = [];
        this.guardians.whatsapp.stop();
        this.logger.info("[MONITOR] Health monitoring stopped");

    }

}

export default SystemMonitor;
