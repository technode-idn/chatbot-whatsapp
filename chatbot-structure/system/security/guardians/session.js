import fs from "fs/promises";
import config from "../config.js";

class SessionGuardian {

    constructor(logger) {

        this.logger = logger;

        this.status = {
            lastSave: null,
            sessionCount: 0
        };

    }

    start() {

        this.logger.info(
            "Session Guardian Started."
        );

    }

    async save(sessionData) {

        try {
            const directory = config.session.file.split(/[\\/]/).slice(0, -1).join("/");

            if(directory) {
                await fs.mkdir(directory, {
                    recursive: true
                });
            }

            await fs.writeFile(

                config.session.file,

                JSON.stringify(
                    sessionData,
                    null,
                    4
                )

            );

            this.status.lastSave = new Date();

            this.status.sessionCount =
                Object.keys(sessionData?.data || sessionData || {}).length;

        }

        catch(error) {

            this.logger.error(error);

        }

    }

    async load() {

        try {

            const data =
                await fs.readFile(
                    config.session.file,
                    "utf8"
                );

            const session =
                JSON.parse(data);

            this.status.sessionCount =
                Object.keys(session?.data || session || {}).length;

            return session;

        }

        catch {

            return {};

        }

    }

    async check() {

        this.logger.info(

            `Active Session : ${this.status.sessionCount}`

        );

    }

    getStatus() {

        return this.status;

    }

}

export default SessionGuardian;
