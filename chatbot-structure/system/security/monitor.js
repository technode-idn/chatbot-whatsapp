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

        this.logger.success("========== SYSTEM MONITOR START ==========");

        // Guardian yang memiliki event listener
        this.guardians.whatsapp.start();

        this.guardians.response.start();

        // Menjalankan seluruh monitoring
        this.startInternetMonitor();

        this.startMemoryMonitor();

        this.startStorageMonitor();

        this.startBackupMonitor();

        this.startSessionMonitor();

        this.logger.success("All Guardians Started.");

    }

    startInternetMonitor() {

        setInterval(async () => {

            await this.guardians.internet.check();

            if (
                this.guardians.internet.getStatus() &&
                !this.guardians.whatsapp.getStatus()
            ) {

                this.logger.warning(
                    "Internet Online, WhatsApp Offline. Reconnecting..."
                );

                await this.guardians.whatsapp.reconnect();

            }

        }, config.internet.interval);

    }

    startMemoryMonitor() {

        setInterval(async () => {

            await this.guardians.memory.check();

        }, config.memory.interval);

    }

    startStorageMonitor() {

        setInterval(async () => {

            await this.guardians.storage.check();

        }, config.storage.interval);

    }

    startBackupMonitor() {

        setInterval(async () => {

            await this.guardians.backup.check();

        }, config.backup.interval);

    }

    startSessionMonitor() {

        setInterval(async () => {

            await this.guardians.session.check();

        }, config.session.interval);

    }

}

export default SystemMonitor;