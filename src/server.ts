import express from 'express';
import config from 'config';
import { Server } from 'http';
import { StellarService } from './services/stellar.service';
import helmet from 'helmet';
import cors from 'cors';

class App {
  public app: express.Application;
  public server!: Server;
  public stellarService: StellarService;

  constructor() {
    this.app = express();
    this.stellarService = new StellarService();
    
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
    this.app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok', network: this.stellarService.currentNetwork });
    });

    this.app.get('/api/:version/accounts/:accountId', async (req, res) => {
      try {
        const account = await this.stellarService.getAccount(req.params.accountId);
        res.json(account);
      } catch (error) {
        res.status(404).json({ error: 'Account not found' });
      }
    });
  }

  private configureErrorHandling(): void {
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error(err.stack);
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
      });
    });
  }

  public start(): void {
    const port = config.get<number>('server.port');
    this.server = this.app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      this.stellarService.initialize();
    });
  }
}

const app = new App();
app.start();