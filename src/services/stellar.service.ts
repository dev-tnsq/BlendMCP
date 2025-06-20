import { Horizon, Keypair, TransactionBuilder, Operation, Networks } from '@stellar/stellar-sdk';
import config from 'config';
import { Server } from '@stellar/stellar-sdk/lib/rpc';

export class StellarService {
  private horizonServer: Server;
  private networkPassphrase: string;
  public currentNetwork: 'testnet' | 'mainnet' = 'testnet';

  constructor() {
    this.horizonServer = new Server(config.get<string>(`stellar.${this.currentNetwork}.horizonUrl`));
    this.networkPassphrase = config.get<string>(`stellar.${this.currentNetwork}.networkPassphrase`);
  }

  public initialize(): void {
    console.log(`Connected to Stellar ${this.currentNetwork} network`);
  }

  public switchNetwork(network: 'testnet' | 'mainnet'): void {
    this.currentNetwork = network;
    this.horizonServer = new Server(config.get<string>(`stellar.${network}.horizonUrl`));
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
    operations: Operation[],
    signers: Keypair[]
  ): Promise<string> {
    const account = await this.getAccount(source);
    
    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperations(operations)
      .setTimeout(30)
      .build();

    signers.forEach(signer => transaction.sign(signer));
    return transaction.toXDR();
  }

  public submitTransaction(transactionXdr: string): Promise<Horizon.SubmitTransactionResponse> {
    return this.horizonServer.submitTransaction(transactionXdr);
  }
}