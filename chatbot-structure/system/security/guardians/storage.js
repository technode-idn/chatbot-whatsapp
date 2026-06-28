import checkDiskSpace from "check-disk-space";
import config from "../config.js";

class StorageGuardian {

    constructor(logger){

        this.logger = logger;

        this.status = {

            used: 0,

            free: 0,

            total: 0,

            percent: 0

        };

    }

    start(){

        this.logger.info(
            "Storage Guardian Started."
        );

    }

    async check(){

        try{

            const disk = await checkDiskSpace(config.storage.diskPath);

            this.status.total = disk.size;

            this.status.free = disk.free;

            this.status.used =
                disk.size - disk.free;

            this.status.percent =
                Number(
                    (
                        this.status.used /
                        this.status.total
                    ) * 100
                ).toFixed(2);

            if(
                this.status.percent >=
                config.storage.critical
            ){

                this.logger.error(
                    `Storage Critical (${this.status.percent}%)`
                );

            }

            else if(

                this.status.percent >=
                config.storage.warning

            ){

                this.logger.warning(
                    `Storage Warning (${this.status.percent}%)`
                );

            }

        }

        catch(error){

            this.logger.error(error);

        }

    }

    getStatus(){

        return this.status;

    }

}

export default StorageGuardian;