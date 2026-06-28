import fs from "fs/promises";
import path from "path";
import config from "../config.js";

class BackupGuardian {

    constructor(logger) {

        this.logger = logger;

        this.status = {
            lastBackup: null,
            success: true
        };

    }

    start() {

        this.logger.info(
            "Backup Guardian Started."
        );

    }

    async check() {

        try {

            const now = new Date();

            const folderName =
                now.toISOString()
                    .replace(/:/g, "-")
                    .replace(/\..+/, "");

            const destination = path.join(
                config.backup.folder,
                folderName
            );

            await fs.mkdir(destination, {
                recursive: true
            });

            await fs.cp(
                "./data",
                destination,
                {
                    recursive: true
                }
            );

            this.status.lastBackup = now;
            this.status.success = true;

            this.logger.success(
                "Backup berhasil dibuat."
            );

        }

        catch(error) {

            this.status.success = false;

            this.logger.error(error);

        }

    }

    getStatus() {

        return this.status;

    }

}

export default BackupGuardian;