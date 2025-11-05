exports.apps = [{
  name: 'x402-playground-backend',
  script: 'dist/server.js',
  instances: 1,
  exec_mode: 'fork',
  env: {
    NODE_ENV: 'production',
    PORT: 3001
  },
  watch: false,
  max_memory_restart: '1G',
  error_file: 'logs/backend-error.log',
  out_file: 'logs/backend-out.log',
  log_file: 'logs/backend-combined.log',
  time: true,
  restart_delay: 4000,
  max_restarts: 10
}];