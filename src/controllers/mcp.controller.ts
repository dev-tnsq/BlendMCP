import { Request, Response, Router } from 'express';
import { BlendService } from '../services/blend.service';

export class McpController {
  public router = Router();
  private blendService = new BlendService();

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes() {
    this.router.post('/lend', this.lend);
  }

  lend = async (req: Request, res: Response) => {
    try {
      const { userAddress, amount, asset, poolId, privateKey } = req.body;
      if (!userAddress || !amount || !asset || !poolId) {
        return res.status(400).json({ error: 'Missing required parameters.' });
      }

      const txHash = await this.blendService.lend({
        userAddress,
        amount,
        asset,
        poolId,
        privateKey,
      });

      res.status(200).json({ success: true, txHash });
    } catch (error) {
      console.error('Lend failed:', error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred.' });
      }
    }
  };
} 