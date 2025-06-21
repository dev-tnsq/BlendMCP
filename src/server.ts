import express from 'express';
import config from 'config';
import { Server } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import winston from 'winston';
import { McpController } from './controllers/mcp.controller';

dotenv.config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
  ],
});

class App {
  public app: express.Application;
  public server!: Server;

  constructor() {
    this.app = express();
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  private configureMiddleware(): void {
    this.app.use(express.json());
    this.app.use(helmet());
    this.app.use(cors());
  }

  private configureRoutes(): void {
    const mcpController = new McpController();
    this.app.use('/mcp', mcpController.router);

    this.app.get('/', (req, res) => {
      res.send('MCP Server is running!');
    });
  }

  private configureErrorHandling(): void {
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error(err.stack);
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
      });
    });
  }

  public start(): void {
    const port = config.get<number>('server.port');
    this.server = this.app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
    });
  }
}

const app = new App();
app.start();