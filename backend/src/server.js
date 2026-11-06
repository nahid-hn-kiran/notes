import { app } from './app.js';
import { config } from './config/env.js';
import { defaultStorage } from './storage/noteStorage.js';

async function startServer() {
  try {
    // Ensure persistence file and directory exist before accepting requests
    await defaultStorage.init();

    const server = app.listen(config.port, config.host, () => {
      console.log('==================================================');
      console.log('  Tiny Notes API Server');
      console.log(`  Environment: ${config.env}`);
      console.log(`  Listening on: http://${config.host}:${config.port}`);
      console.log(`  Storage path: ${config.dataFilePath}`);
      console.log('==================================================');
    });

    // Graceful shutdown handling
    let isShuttingDown = false;

    const handleShutdown = (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);

      // Stop accepting new connections
      server.close((err) => {
        if (err) {
          console.error('Error during HTTP server shutdown:', err);
          process.exit(1);
        }
        console.log('HTTP server closed cleanly.');
        process.exit(0);
      });

      // Force exit after 10 seconds timeout
      setTimeout(() => {
        console.error('Graceful shutdown timed out. Forcefully terminating.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
