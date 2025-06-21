import { Horizon, Keypair, TransactionBuilder, Operation, Networks } from '@stellar/stellar-sdk';
import config from 'config';

export class StellarService {
  private horizonServer: Horizon.Server;
  private networkPassphrase: string;
  public currentNetwork: 'testnet' | 'mainnet' = 'testnet';

  constructor() {
    this.horizonServer = new Horizon.Server(config.get<string>(`stellar.${this.currentNetwork}.horizonUrl`));
    this.networkPassphrase = config.get<string>(`stellar.${this.currentNetwork}.networkPassphrase`);
  }

  public initialize(): void {
    console.log(`Connected to Stellar ${this.currentNetwork} network`);
  }

  public switchNetwork(network: 'testnet' | 'mainnet'): void {
    this.currentNetwork = network;
    this.horizonServer = new Horizon.Server(config.get<string>(`stellar.${network}.horizonUrl`));
    this.networkPassphrase = config.get<string>(`stellar.${network}.networkPassphrase`);
  }

  public async getAccount(accountId: string): Promise<Horizon.AccountResponse> {
    try {
      return await this.horizonServer.loadAccount(accountId);
    } catch (error:any) {
      throw new Error(`Account not found: ${error.message}`);
    }
  }

  public createAccount(): { publicKey: string; secret: string } {
    const keypair = Keypair.random();
    return {
      publicKey: keypair.publicKey(),
      secret: keypair.secret()
    };
  }

  public async buildTransaction(
    source: string,
    operations: any[],
    signers: Keypair[]
  ): Promise<string> {
    const account = await this.getAccount(source);
    
    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    });

    operations.forEach(op => transaction.addOperation(op));

    const builtTransaction = transaction.setTimeout(30).build();

    signers.forEach(signer => builtTransaction.sign(signer));
    return builtTransaction.toXDR();
  }

  public submitTransaction(transactionXdr: string): Promise<Horizon.SubmitTransactionResponse> {
    const transaction = TransactionBuilder.fromXDR(transactionXdr, this.networkPassphrase);
    return this.horizonServer.submitTransaction(transaction);
  }
}