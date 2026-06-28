import config from "../config.js";

class ResponseQueue {

    constructor(client, logger) {

        this.client = client;
        this.logger = logger;

        this.processing = false;

        this.queues = {
            high: [],
            normal: [],
            low: []
        };

        this.status = {
            highQueue: 0,
            normalQueue: 0,
            lowQueue: 0,
            totalSent: 0,
            totalFailed: 0
        };

    }

    start() {

        this.logger.info("Response Queue Started.");

    }

    updateStatus() {

        this.status.highQueue = this.queues.high.length;
        this.status.normalQueue = this.queues.normal.length;
        this.status.lowQueue = this.queues.low.length;

    }

    sleep(ms) {

        return new Promise(resolve => setTimeout(resolve, ms));

    }

    random(min, max) {

        return Math.floor(Math.random() * (max - min + 1)) + min;

    }

    getDelay(priority) {

        switch(priority){

            case "high":

                return this.random(
                    config.response.high.minDelay,
                    config.response.high.maxDelay
                );

            case "normal":

                return this.random(
                    config.response.normal.minDelay,
                    config.response.normal.maxDelay
                );

            default:

                return this.random(
                    config.response.low.minDelay,
                    config.response.low.maxDelay
                );

        }

    }

    removeDuplicate(chatId){

        Object.values(this.queues).forEach(queue=>{

            for(let i = queue.length - 1; i >= 0; i--){

                if(queue[i].chatId === chatId){

                    queue.splice(i,1);

                }

            }

        });

    }

    enqueue(task){

        // Hapus task lama milik chat yang sama
        this.removeDuplicate(task.chatId);

        this.queues[task.priority].push(task);

        this.updateStatus();

        this.processQueue();

    }

    getNextTask(){

        if(this.queues.high.length){

            return this.queues.high.shift();

        }

        if(this.queues.normal.length){

            return this.queues.normal.shift();

        }

        if(this.queues.low.length){

            return this.queues.low.shift();

        }

        return null;

    }

    async processQueue(){

        if(this.processing){

            return;

        }

        this.processing = true;

        while(true){

            const task = this.getNextTask();

            this.updateStatus();

            if(!task){

                break;

            }

            try{

                const chat = await this.client.getChatById(task.chatId);

                if(config.response.typing){

                    await chat.sendStateTyping();

                    await this.sleep(
                        config.response.typingDuration
                    );

                }

                await this.sleep(
                    this.getDelay(task.priority)
                );

                if(task.type === "text"){

                    await this.client.sendMessage(
                        task.chatId,
                        task.message
                    );

                }

                else if(task.type === "media"){

                    await this.client.sendMessage(

                        task.chatId,

                        task.media,

                        {
                            caption: task.caption
                        }

                    );

                }

                this.status.totalSent++;

            }

            catch(error){

                this.status.totalFailed++;

                this.logger.error(error);

            }

        }

        this.processing = false;

    }

    async send(

        chatId,

        message,

        priority = "high"

    ){

        this.enqueue({

            type:"text",

            chatId,

            message,

            priority

        });

    }

    async sendMedia(

        chatId,

        media,

        caption = "",

        priority = "high"

    ){

        this.enqueue({

            type:"media",

            chatId,

            media,

            caption,

            priority

        });

    }

    getStatus(){

        this.updateStatus();

        return this.status;

    }

}

export default ResponseQueue;