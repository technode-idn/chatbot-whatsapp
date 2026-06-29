import config from "../config.js";
import qrcode from "qrcode-terminal";

class WhatsAppGuardian {

    constructor(client, logger) {

        this.client = client;
        this.logger = logger;

        this.status = {
            ready: false,
            authenticated: false,
            reconnecting: false,
            reconnectCount: 0,
            lastDisconnectReason: null
        };

    }

    start() {

        this.client.on("qr", (qr) => {

            this.logger.warning(
                "WhatsApp membutuhkan QR Code."
            );

            qrcode.generate(qr, {
                small: true
            });

        });

        this.client.on("authenticated", () => {

            this.status.authenticated = true;

            this.logger.success(
                "WhatsApp berhasil terautentikasi."
            );

        });

        this.client.on("ready", () => {

            this.status.ready = true;
            this.status.reconnecting = false;
            this.status.reconnectCount = 0;

            this.logger.success(
                "WhatsApp Client Ready."
            );

        });

        this.client.on("loading_screen", (percent, message) => {

            this.logger.info(
                `Loading ${percent}% - ${message}`
            );

        });

        this.client.on("disconnected", reason => {

            this.status.ready = false;
            this.status.lastDisconnectReason = reason;

            this.logger.warning(
                `WhatsApp Disconnect : ${reason}`
            );

        });

        this.client.on("auth_failure", message => {

            this.status.ready = false;
            this.status.authenticated = false;

            this.logger.error(
                `Authentication Failed : ${message}`
            );

        });

    }

    async reconnect() {

        if(this.status.reconnecting){

            return;

        }

        if(
            this.status.reconnectCount >=
            config.whatsapp.maxReconnect
        ){

            this.logger.error(
                "Maximum reconnect attempts reached."
            );

            return;

        }

        this.status.reconnecting = true;

        this.status.reconnectCount++;

        this.logger.info(
            `Reconnect Attempt ${this.status.reconnectCount}`
        );

        try{

            await this.client.destroy();

            await new Promise(resolve =>
                setTimeout(
                    resolve,
                    config.whatsapp.reconnectDelay
                )
            );

            await this.client.initialize();

        }

        catch(error){

            this.logger.error(error);

            this.status.reconnecting = false;

        }

    }

    async check(){

        return this.status.ready;

    }

    getStatus(){

        return this.status.ready;

    }

}

export default WhatsAppGuardian;