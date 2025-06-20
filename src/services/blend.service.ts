// NOTE: '@blend-capital/blend-sdk' types may be missing until dependencies are installed
import {
  Backstop,
  BackstopPool,
  BackstopPoolUser,
  BackstopPoolV1,
  BackstopPoolV2,
  ErrorTypes,
  getOracleDecimals,
  Network as BlendNetwork,
  Pool,
  PoolMetadata,
  PoolOracle,
  PoolUser,
  PoolV1,
  PoolV2,
  PoolV1Event,
  PoolV2Event,
  TokenMetadata,
  Version,
  poolEventV1FromEventResponse,
  poolEventV2FromEventResponse,
  RequestType,
} from '@blend-capital/blend-sdk';
import Server, {
  Account,
  Address,
  Asset,
  BASE_FEE,
  Horizon,
  Networks,
  rpc,
  TransactionBuilder,
  xdr,
  Keypair,
} from '@stellar/stellar-sdk';
import config from 'config';

const AGENT_SECRET = process.env.AGENT_SECRET || '';
const HORIZON_URL = config.get<string>('stellar.testnet.horizonUrl');
const RPC_URL = process.env.RPC_URL || config.get<string>('stellar.testnet.horizonUrl');
const NETWORK_PASSPHRASE = config.get<string>('stellar.testnet.networkPassphrase');
const NETWORK_OPTS = { allowHttp: true };

function getNetwork() {
  return {
    rpc: RPC_URL,
    passphrase: NETWORK_PASSPHRASE,
    horizonUrl: HORIZON_URL,
    opts: NETWORK_OPTS,
  };
}

function getKeypair(secret?: string) {
  return Keypair.fromSecret(secret || AGENT_SECRET);
}

// Define a type that includes the version property we will add.
type PoolMetaWithVersion = PoolMetadata & { id: string; version: Version };

export class BlendService {
  constructor() {}

  // Pool Meta
  async loadPoolMeta(poolId: string): Promise<PoolMetaWithVersion> {
    if (!poolId) throw new Error('poolId is required');
    const network = getNetwork();
    const metadata = await PoolMetadata.load(network, poolId);

    // Hardcoding wasm hashes from blend-ui api.ts for version detection
    const V1_WASM_HASH = 'baf978f10efdbcd85747868bef8832845ea6809f7643b67a4ac0cd669327fc2c';
    const V2_WASM_HASH = 'a41fc53d6753b6c04eb15b021c55052366a4c8e0e21bc72700f461264ec1350e';
    const V2_TESTNET_WASM_HASH = '6a7c67449f6bad0d5f641cfbdf03f430ec718faa85107ecb0b97df93410d1c43';

    if (metadata.wasmHash === V1_WASM_HASH) {
      return { ...metadata, id: poolId, version: Version.V1 };
    }

    if (metadata.wasmHash === V2_WASM_HASH || metadata.wasmHash === V2_TESTNET_WASM_HASH) {
      return { ...metadata, id: poolId, version: Version.V2 };
    }

    throw new Error(
      `Could not determine pool version for ${poolId}. Unknown wasmHash: ${metadata.wasmHash}`
    );
  }

  // Pool (V1/V2)
  async loadPool(poolId: string, meta: PoolMetaWithVersion) {
    if (!poolId) throw new Error('poolId is required');
    const network = getNetwork();
    if (meta) {
      if (meta.version === Version.V2) {
        return await PoolV2.loadWithMetadata(network, poolId, meta);
      } else {
        return await PoolV1.loadWithMetadata(network, poolId, meta);
      }
    } else {
      throw new Error('Pool meta/version required for loadPool');
    }
  }

  // Pool User
  async loadPoolUser(pool: PoolV1 | PoolV2, userAddress: string) {
    if (!pool || !userAddress) throw new Error('pool and userAddress are required');
    return await pool.loadUser(userAddress);
  }

  // Pool Oracle
  async loadPoolOracle(pool: PoolV1 | PoolV2) {
    const network = getNetwork();
    if (pool && pool.metadata && pool.metadata.oracle) {
      try {
        await getOracleDecimals(network, pool.metadata.oracle);
        return await pool.loadOracle();
      } catch (e) {
        return await pool.loadOracle();
      }
    }
    return null;
  }

  // Pool Events
  async getPoolEvents(poolId: string, version: string, startLedger: number) {
    if (!poolId || !version || typeof startLedger !== 'number')
      throw new Error('poolId, version, and startLedger are required');
    const network = getNetwork();
    const stellarRpc = new rpc.Server(network.rpc, network.opts);
    const topics =
      version === 'V2'
        ? [
            [xdr.ScVal.scvSymbol('new_auction').toXDR('base64'), '*', '*'],
            [xdr.ScVal.scvSymbol('fill_auction').toXDR('base64'), '*', '*'],
            [xdr.ScVal.scvSymbol('delete_auction').toXDR('base64'), '*', '*'],
          ]
        : [
            [xdr.ScVal.scvSymbol('fill_auction').toXDR('base64'), '*', '*'],
            [xdr.ScVal.scvSymbol('delete_liquidation_auction').toXDR('base64'), '*'],
            [xdr.ScVal.scvSymbol('new_liquidation_auction').toXDR('base64'), '*'],
            [xdr.ScVal.scvSymbol('new_auction').toXDR('base64'), '*'],
            [xdr.ScVal.scvSymbol('delete_liquidation_auction').toXDR('base64'), '*'],
          ];
    const resp = await stellarRpc._getEvents({
      startLedger,
      filters: [
        {
          type: 'contract',
          contractIds: [poolId],
          topics,
        },
      ],
      limit: 1000,
    });
    if (version === 'V2') {
      let events: PoolV2Event[] = [];
      for (const respEvent of resp.events) {
        let poolEvent = poolEventV2FromEventResponse(respEvent);
        if (poolEvent) events.push(poolEvent);
      }
      return { events, latestLedger: resp.latestLedger };
    } else {
      let events: PoolV1Event[] = [];
      for (const respEvent of resp.events) {
        let poolEvent = poolEventV1FromEventResponse(respEvent);
        if (poolEvent) events.push(poolEvent);
      }
      return { events, latestLedger: resp.latestLedger };
    }
  }

  // Backstop
  async loadBackstop(version: string) {
    if (!version) throw new Error('version is required');
    const network = getNetwork();
    const backstopId = version === 'V2' ? process.env.BACKSTOP_ID_V2 : process.env.BACKSTOP_ID;
    if (!backstopId) throw new Error('BACKSTOP_ID env variable is required');
    return await Backstop.load(network, backstopId);
  }

  // Backstop Pool
  async loadBackstopPool(poolMeta: any) {
    if (!poolMeta || !poolMeta.id || !poolMeta.version)
      throw new Error('poolMeta with id and version is required');
    const network = getNetwork();
    if (poolMeta.version === Version.V2) {
      if (!process.env.BACKSTOP_ID_V2) throw new Error('BACKSTOP_ID_V2 env variable is required');
      return await BackstopPoolV2.load(network, process.env.BACKSTOP_ID_V2, poolMeta.id);
    } else {
      if (!process.env.BACKSTOP_ID) throw new Error('BACKSTOP_ID env variable is required');
      return await BackstopPoolV1.load(network, process.env.BACKSTOP_ID, poolMeta.id);
    }
  }

  // Backstop Pool User
  async loadBackstopPoolUser(poolMeta: any, userAddress: string) {
    if (!poolMeta || !poolMeta.id || !poolMeta.version || !userAddress)
      throw new Error('poolMeta with id, version and userAddress are required');
    const network = getNetwork();
    if (poolMeta.version === Version.V2) {
      if (!process.env.BACKSTOP_ID_V2) throw new Error('BACKSTOP_ID_V2 env variable is required');
      return await BackstopPoolUser.load(
        network,
        process.env.BACKSTOP_ID_V2,
        poolMeta.id,
        userAddress
      );
    } else {
      if (!process.env.BACKSTOP_ID) throw new Error('BACKSTOP_ID env variable is required');
      return await BackstopPoolUser.load(
        network,
        process.env.BACKSTOP_ID,
        poolMeta.id,
        userAddress
      );
    }
  }

  // Token Metadata
  async loadTokenMetadata(assetId: string) {
    if (!assetId) throw new Error('assetId is required');
    const network = getNetwork();
    return await TokenMetadata.load(network, assetId);
  }

  // Token Balance
  async getTokenBalance(tokenId: string, userAddress: string) {
    if (!tokenId || !userAddress) throw new Error('tokenId and userAddress are required');
    const network = getNetwork();
    try {
      // Try to fetch from Horizon for native and issued assets
      const horizon = new Horizon.Server(network.horizonUrl, network.opts);
      const account = await horizon.loadAccount(userAddress);
      if (tokenId === 'native' || tokenId === 'XLM') {
        const nativeBalance = account.balances.find((b) => b.asset_type === 'native');
        if (nativeBalance) {
          return BigInt(nativeBalance.balance.replace('.', ''));
        }
      }
      const assetBalance = account.balances.find((b) => {
        if ('asset_code' in b && 'asset_issuer' in b) {
          return b.asset_code === tokenId || b.asset_issuer === tokenId;
        }
        return false;
      });
      if (assetBalance && 'balance' in assetBalance) {
        return BigInt(assetBalance.balance.replace('.', ''));
      }
      return BigInt(0);
    } catch (e) {
      return BigInt(0);
    }
  }

  // Write Actions (lend, borrow, repay, claim, supplyCollateral, withdrawCollateral)
  async lend({ userAddress, amount, asset, poolId, privateKey }: any): Promise<string> {
    if (!userAddress || !amount || !asset || !poolId)
      throw new Error('userAddress, amount, asset, and poolId are required');
    const network = getNetwork();
    const meta = await this.loadPoolMeta(poolId);
    const pool = await this.loadPool(poolId, meta);

    const supplyOp = xdr.Operation.fromXDR(
      (pool as any).submit({
        from: userAddress,
        spender: userAddress,
        to: userAddress,
        requests: [
          {
            amount: BigInt(amount * 1e7),
            request_type: RequestType.SupplyCollateral,
            address: asset,
          },
        ],
      }),
      'base64'
    );
    return await this._submitTx(userAddress, [supplyOp], privateKey, network);
  }

  async borrow({ userAddress, amount, asset, poolId, privateKey }: any): Promise<string> {
    if (!userAddress || !amount || !asset || !poolId)
      throw new Error('userAddress, amount, asset, and poolId are required');
    const network = getNetwork();
    const meta = await this.loadPoolMeta(poolId);
    const pool = await this.loadPool(poolId, meta);

    const borrowOp = xdr.Operation.fromXDR(
      (pool as any).submit({
        from: userAddress,
        spender: userAddress,
        to: userAddress,
        requests: [
          {
            amount: BigInt(amount * 1e7),
            request_type: RequestType.Borrow,
            address: asset,
          },
        ],
      }),
      'base64'
    );
    return await this._submitTx(userAddress, [borrowOp], privateKey, network);
  }

  async repay({ userAddress, amount, asset, poolId, privateKey }: any): Promise<string> {
    if (!userAddress || !amount || !asset || !poolId)
      throw new Error('userAddress, amount, asset, and poolId are required');
    const network = getNetwork();
    const meta = await this.loadPoolMeta(poolId);
    const pool = await this.loadPool(poolId, meta);

    const repayOp = xdr.Operation.fromXDR(
      (pool as any).submit({
        from: userAddress,
        spender: userAddress,
        to: userAddress,
        requests: [
          {
            amount: BigInt(amount * 1e7),
            request_type: RequestType.Repay,
            address: asset,
          },
        ],
      }),
      'base64'
    );
    return await this._submitTx(userAddress, [repayOp], privateKey, network);
  }

  async claim({ userAddress, poolId, privateKey }: any): Promise<string> {
    if (!userAddress || !poolId) throw new Error('userAddress and poolId are required');
    const network = getNetwork();
    const meta = await this.loadPoolMeta(poolId);
    const pool = await this.loadPool(poolId, meta);

    const claimType = (RequestType as any).Claim || (RequestType as any).ClaimRewards || 'Claim';
    const op = xdr.Operation.fromXDR(
      (pool as any).submit({
        from: userAddress,
        spender: userAddress,
        to: userAddress,
        requests: [
          {
            request_type: claimType,
            address: '',
            amount: BigInt(0),
          },
        ],
      }),
      'base64'
    );
    return await this._submitTx(userAddress, [op], privateKey, network);
  }

  // Simulate Operation
  async simulateOperation(operationXdr: string, userAddress: string) {
    if (!operationXdr || !userAddress) throw new Error('operationXdr and userAddress are required');
    const network = getNetwork();
    const operation = xdr.Operation.fromXDR(operationXdr, 'base64');
    const stellarRpc = new rpc.Server(network.rpc, network.opts);
    const account = new Account(userAddress, '123');
    const txBuilder = new TransactionBuilder(account, {
      networkPassphrase: network.passphrase,
      fee: BASE_FEE,
      timebounds: { minTime: 0, maxTime: Math.floor(Date.now() / 1000) + 5 * 60 * 1000 },
    }).addOperation(operation);
    const transaction = txBuilder.build();
    return await stellarRpc.simulateTransaction(transaction);
  }

  // Fee Stats
  async getFeeStats() {
    const network = getNetwork();
    const stellarRpc = new rpc.Server(network.rpc, network.opts);
    const feeStats = await stellarRpc.getFeeStats();
    return {
      low: Math.max(parseInt(feeStats.sorobanInclusionFee.p30), 500).toString(),
      medium: Math.max(parseInt(feeStats.sorobanInclusionFee.p60), 2000).toString(),
      high: Math.max(parseInt(feeStats.sorobanInclusionFee.p90), 10000).toString(),
    };
  }

  // --- Internal helper for tx build/sign/submit ---
  private async _submitTx(source: string, operations: any[], privateKey?: string, network?: any) {
    if (!source || !operations || !network)
      throw new Error('source, operations, and network are required');
    const keypair = getKeypair(privateKey);
    const stellarServer = new Server(network.horizonUrl);
    const account = await stellarServer.loadAccount(source);
    const txBuilder = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: network.passphrase,
    });
    operations.forEach((op) => txBuilder.addOperation(op));
    const tx = txBuilder.setTimeout(30).build();
    tx.sign(keypair);
    const res = await stellarServer.submitTransaction(tx);
    return res.hash;
  }
} 