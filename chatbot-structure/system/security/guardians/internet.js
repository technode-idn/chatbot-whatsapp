import dns from "dns/promises";
import config from "../config.js";

class InternetGuardian {

    constructor(logger){

        this.logger = logger;

        this.status = {
            online: false,
            lastChecked: null
        };

    }

    start(){

        this.logger.info(
            "Internet Guardian Started."
        );

    }

    async check(){

        try{

            await dns.lookup(
                config.internet.host
            );

            if(!this.status.online){

                this.logger.success(
                    "Internet Connected."
                );

            }

            this.status.online = true;

        }

        catch(error){

            if(this.status.online){

                this.logger.warning(
                    "Internet Disconnected."
                );

            }

            this.status.online = false;

        }

        this.status.lastChecked = new Date();

        return this.status.online;

    }

    getStatus(){

        return this.status.online;

    }

}

export default InternetGuardian;