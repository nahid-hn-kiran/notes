module.exports = {
  apps: [
    {
      name: 'tiny-notes-api',
      cwd: './backend',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        HOST: '127.0.0.1',
      },
    },
  ],
};
