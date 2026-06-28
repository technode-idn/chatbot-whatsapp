class SchedulerGuardian {

    constructor(logger) {

        this.logger = logger;

        this.jobs = [];

        this.status = {
            totalJobs: 0,
            activeJobs: 0
        };

    }

    start() {

        this.logger.info(
            "Scheduler Guardian Started."
        );

    }

    register(jobName, cronJob) {

        this.jobs.push({
            name: jobName,
            job: cronJob
        });

        this.status.totalJobs = this.jobs.length;

        this.logger.info(
            `Scheduler Registered : ${jobName}`
        );

    }

    async check() {

        let active = 0;

        for(const item of this.jobs){

            if(item.job.running){

                active++;

            }

        }

        this.status.activeJobs = active;

        this.logger.info(
            `Scheduler Active : ${active}/${this.jobs.length}`
        );

    }

    getStatus(){

        return this.status;

    }

}

export default SchedulerGuardian;