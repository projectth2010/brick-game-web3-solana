import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

export async function connectWallet() {
    if (window.solana && window.solana.isPhantom) {
        try {
            const response = await window.solana.connect();
            console.log('Connected with Public Key:', response.publicKey.toString());
            return response.publicKey;
        } catch (err) {
            console.error('Wallet connection error:', err);
        }
    } else {
        alert('Phantom wallet not found');
    }
}

export async function getAccountBalance(publicKey) {
    try {
        const balance = await connection.getBalance(new PublicKey(publicKey));
        return balance / Math.pow(10, 9); // Return SOL balance
    } catch (err) {
        console.error('Error getting balance:', err);
    }
}
