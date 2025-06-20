import express from 'express';
import Joi from 'joi';
import { BlendService } from '../services/blend.service';

const router = express.Router();
const blendService = new BlendService();

const lendSchema = Joi.object({
  userAddress: Joi.string().required(),
  amount: Joi.number().positive().required(),
  asset: Joi.string().required(),
  poolId: Joi.string().required(),
  privateKey: Joi.string().required()
});

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.post('/tool/lend', async (req, res) => {
  const { error, value } = lendSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const txHash = await blendService.lend(value);
    res.json({ success: true, txHash });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router; 