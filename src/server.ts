import mongoose from 'mongoose';
import http     from 'http';
import app      from './app';
import config   from './config';
import { logger, errorLogger } from './shared/logger';
import colors   from 'colors';
import seedAdmin, { seedIntakeFormConfig } from './DB';
import { initSocket } from './socket/socket';  
import { registerAppointmentReminderCron } from './cron/appointment.reminder.cron';
// ─── Uncaught Exception Handler — Synchronous Errors ─────────────────────────
process.on('uncaughtException', (err) => {
  errorLogger.error(`Uncaught Exception: ${err.message}`);
  logger.info(colors.red('Shutting down due to Uncaught Exception'));
  process.exit(1);
});

let server: http.Server;

async function main() {
  try {
    await mongoose.connect(config.database_url as string, {
      serverSelectionTimeoutMS: 5000,
      family: 4,
    });
    registerAppointmentReminderCron()
    logger.info(colors.green('Database connected successfully!'));

    seedAdmin();
    seedIntakeFormConfig()

    const port = Number(config.port);

    // Wrap Express app with http.Server 
    const httpServer = http.createServer(app);

    //  Initialize Socket.IO on the same httpServer

    initSocket(httpServer);

    // Step 3: httpServer.listen()  ─────────────────
    server = httpServer.listen(port, () => {
      logger.info(colors.green(`🚀 Server running on port ${port}`));
      logger.info(colors.cyan(`🔌 Socket.IO ready → ws://localhost:${port}`)); 
    });

  } catch (error) {
    errorLogger.error(
      colors.red(`Error starting the server: ${(error as Error).message}`),
    );
  }
}

main();

// ─── Unhandled Rejection Handler — Asynchronous Errors ───────────────────────
process.on('unhandledRejection', (err) => {
  if (server) {
    server.close(() => {
      errorLogger.error(`Unhandled Rejection: ${err}`);
      logger.info(colors.red('Shutting down due to Unhandled Rejection'));
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// ─── SIGINT Handler — Graceful Shutdown ──────────────────────────────────────
process.on('SIGINT', () => {
  logger.info(colors.yellow('SIGTERM received. Shutting down gracefully...'));
  if (server) server.close();
});
