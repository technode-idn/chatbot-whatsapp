import os from "os";
import config from "../config.js";

class MemoryGuardian {

    constructor(logger) {

        this.logger = logger;

        this.status = {
            total: 0,
            free: 0,
            used: 0,
            percent: 0
        };

    }

    start() {

        this.logger.info(
            "Memory Guardian Started."
        );

    }

    async check() {

        try {

            const total = os.totalmem();
            const free = os.freemem();
            const used = total - free;

            this.status.total = total;
            this.status.free = free;
            this.status.used = used;
            this.status.percent = Number(
                ((used / total) * 100).toFixed(2)
            );

            if (
                this.status.percent >=
                config.memory.critical
            ) {

                this.logger.error(
                    `Memory Critical (${this.status.percent}%)`
                );

            }
            else if (
                this.status.percent >=
                config.memory.warning
            ) {

                this.logger.warning(
                    `Memory Warning (${this.status.percent}%)`
                );

            }

        }

        catch (error) {

            this.logger.error(error);

        }

    }

    getStatus() {

        return this.status;

    }

}

export default MemoryGuardian;