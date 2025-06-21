// Install first using: npm install stellar-hd-wallet
import StellarHDWallet from "stellar-hd-wallet";
import * as bip39 from "bip39";


// Your 12-word mnemonic phrase from the image
const mnemonic = "";

// Generate wallet
const wallet = StellarHDWallet.fromMnemonic(mnemonic, "english");

// Get private key (a.k.a. secret seed for Stellar)
const secret = wallet.getSecret(0); // 0 = first account

console.log("Your Stellar Private Key (Secret):", secret);

// Optionally, get public key too
const publicKey = wallet.getPublicKey(0);
console.log("Your Stellar Public Key:", publicKey);
