import app from "./app";
import dotenv from "dotenv";
dotenv.config();
import os from "node:os";
import cluster from "node:cluster";

const numCPUs = os.cpus().length;

const port = process.env.PORT;

process.on("uncaughtException", (err) => {
  console.log(`Error: ${(err as Error).message}`);
  process.exit(1);
});

if (cluster.isPrimary) {
  console.log(`Master ${process.pid} is running`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  const server = app.listen(port, () => {
    console.log(`Server started using ${process.pid} on port ${port}`);
  });

  /**
   * Logs an error message and closes the server.
   * @param {Error} err - The error to log.
   * @returns {void}
   * @description
   *   - Logs the error message to the console.
   *   - Closes the server and exits the process with status code 1.
   */
  process.on("unhandledRejection", (err) => {
    console.log(`Error: ${(err as Error).message}`);
    server.close(() => {
      process.exit(1);
    });
  });
}
