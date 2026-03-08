module.exports = {
    apps: [
        {
            name: "shopflow-pos-backend",
            script: "./server.js",
            instances: "max", // Or a set number of workers
            exec_mode: "cluster",
            env: {
                NODE_ENV: "development",
            },
            env_production: {
                NODE_ENV: "production",
            },
            log_date_format: "YYYY-MM-DD HH:mm Z",
            error_file: "logs/err.log",
            out_file: "logs/out.log",
            merge_logs: true,
            time: true
        }
    ]
};
