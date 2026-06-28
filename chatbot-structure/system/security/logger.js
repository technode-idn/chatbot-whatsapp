import fs from "fs";
import path from "path";
import config from "./config.js";

class Logger {

    constructor() {

        this.logFolder = config.logger.folder;

        this.logFile = path.join(
            this.logFolder,
            config.logger.filename
        );

        if (!fs.existsSync(this.logFolder)) {

            fs.mkdirSync(this.logFolder, {
                recursive: true
            });

        }

    }

    write(level, message) {

        const time = new Date().toLocaleString("id-ID");

        const text =
            `[${time}] [${level}] ${message}`;

        console.log(text);

        fs.appendFileSync(
            this.logFile,
            text + "\n"
        );

    }

    info(message) {

        this.write("INFO", message);

    }

    success(message) {

        this.write("SUCCESS", message);

    }

    warning(message) {

        this.write("WARNING", message);

    }

    error(message) {

        if (message instanceof Error) {

            this.write(
                "ERROR",
                message.stack
            );

            return;

        }

        this.write(
            "ERROR",
            message
        );

    }

}

export default Logger;