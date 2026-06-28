class ExportGuardian {

    constructor(logger) {

        this.logger = logger;

        this.status = {

            exporting: false,

            lastExport: null,

            totalExport: 0

        };

    }

    start() {

        this.logger.info(
            "Export Guardian Started."
        );

    }

    async begin() {

        if (this.status.exporting) {

            this.logger.warning(
                "Export masih berjalan."
            );

            return false;

        }

        this.status.exporting = true;

        return true;

    }

    async finish(success = true) {

        this.status.exporting = false;

        if (success) {

            this.status.lastExport = new Date();

            this.status.totalExport++;

            this.logger.success(
                "Export selesai."
            );

        }
        else {

            this.logger.error(
                "Export gagal."
            );

        }

    }

    async check() {

        if (this.status.exporting) {

            this.logger.warning(
                "Export masih berlangsung."
            );

        }

    }

    getStatus() {

        return this.status;

    }

}

export default ExportGuardian;