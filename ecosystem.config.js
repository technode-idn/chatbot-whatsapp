module.exports = {
    apps: [
        {
            name: "klikbi-go",

            script: "./app.js",

            cwd: __dirname,

            instances: 1,

            autorestart: true,

            watch: false,

            max_memory_restart: "700M",

            restart_delay: 5000,

            min_uptime: "30s",

            max_restarts: 20,

            kill_timeout: 5000,

            env: {
                NODE_ENV: "production"
            },

            error_file: "./logs/error.log",

            out_file: "./logs/output.log",

            merge_logs: true,

            time: true
        }
    ]
};