module.exports = {
  apps: [
    {
      name: 'trading',
      cwd: 'D:/KUKU/Projects/Frontend/Nextjs/2026-trading-flatform',

      script: 'scripts/dev.mjs',

      interpreter: 'node',

      autorestart: true,

      watch: false,

      env: {
        NEXT_TELEMETRY_DISABLED: '1',
      },
    },
    {
      name: 'football-collector',
      cwd: __dirname,
      script: '.football-worker-build/scripts/football-worker.js',
      interpreter: 'node',
      autorestart: true,
      restart_delay: 5000,
      watch: false,
      env: {
        NODE_ENV: 'production',
        NEXT_TELEMETRY_DISABLED: '1',
      },
    },
  ],
}
