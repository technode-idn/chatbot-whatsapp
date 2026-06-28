const config = {

    // ==========================
    // Internet Guardian
    // ==========================
    internet: {

        // Interval pengecekan internet (30 detik)
        interval: 30 * 1000,

        // Host yang digunakan untuk pengecekan koneksi
        host: "google.com"

    },

    // ==========================
    // WhatsApp Guardian
    // ==========================
    whatsapp: {

        // Maksimal percobaan reconnect
        maxReconnect: 5,

        // Delay sebelum reconnect (10 detik)
        reconnectDelay: 10 * 1000

    },

    // ==========================
    // Memory Guardian
    // ==========================
    memory: {

        interval: 60 * 1000,

        // Persentase RAM yang dianggap warning
        warning: 80,

        // Persentase RAM yang dianggap kritis
        critical: 95

    },

    // ==========================
    // Storage Guardian
    // ==========================
    storage: {

        interval: 5 * 60 * 1000,

        warning: 80,

        critical: 95,

        diskPath: process.platform === "win32" ? "C:" : "/"

    },

    // ==========================
    // Backup Guardian
    // ==========================
    backup: {

        interval: 60 * 60 * 1000,

        folder: "./backup"

    },

    // ==========================
    // Session Guardian
    // ==========================
    session: {

        interval: 5 * 60 * 1000,

        file: "./data/sessions.json"

    },

    // ==========================
    // Logger
    // ==========================
    logger: {

        folder: "./logs",

        filename: "system.log"

    },

    // ==========================
    // Response
    // ==========================
    response: {
        typing: true,

        typingDuration: 1200,

        high: {
            minDelay: 1500,
            maxDelay: 3000
        },

        normal: {
            minDelay: 2500,
            maxDelay: 4500
        },

        low: {
            minDelay: 5000,
            maxDelay: 8000
        }
    }

};

export default config;