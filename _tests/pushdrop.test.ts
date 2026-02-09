import { Transaction, UnlockingScript, MerklePath, P2PKH, PrivateKey } from '@bsv/sdk';
import { MockChain, makeWallet } from './test-utils';
import { createPushdrop, unlockPushdrop } from '@/utils/pushdropHelpers';

const key = PrivateKey.fromRandom();

async function createSourceTransaction(pushdropData: any, receiverPubKey?: string) {
  const wallet = await makeWallet();
  
  // Create the PushDrop locking script
  const lockingScript = await createPushdrop(wallet, pushdropData, receiverPubKey);

  // Create a source transaction with the PushDrop output
  const sourceTransaction = new Transaction();
  sourceTransaction.addInput({
    sourceTXID: '0000000000000000000000000000000000000000000000000000000000000000',
    sourceOutputIndex: 0,
    unlockingScript: UnlockingScript.fromASM('01')
  });
  sourceTransaction.addOutput({
    satoshis: 1,
    lockingScript
  });
  // Add a P2PKH output for fees
  sourceTransaction.addOutput({
    satoshis: 30,
    lockingScript: new P2PKH().lock(key.toAddress())
  });

  const txid = sourceTransaction.id('hex');
  sourceTransaction.merklePath = new MerklePath(0, [[{ txid: true, offset: 0, hash: txid }]]);
  const mockChain = new MockChain({ blockheaders: [txid] });

  return { wallet, sourceTransaction, mockChain };
}

async function createCrossWalletSourceTransaction(pushdropData: any) {
  const senderWallet = await makeWallet();
  const receiverWallet = await makeWallet();

  const { publicKey: receiverPubKey } = await receiverWallet.getPublicKey({ identityKey: true });
  const { publicKey: senderPubKey } = await senderWallet.getPublicKey({ identityKey: true });

  // Create the PushDrop locking script (sender -> receiver)
  const lockingScript = await createPushdrop(senderWallet, pushdropData, receiverPubKey);

  // Create a source transaction with the PushDrop output
  const sourceTransaction = new Transaction();
  sourceTransaction.addInput({
    sourceTXID: '0000000000000000000000000000000000000000000000000000000000000000',
    sourceOutputIndex: 0,
    unlockingScript: UnlockingScript.fromASM('01')
  });
  sourceTransaction.addOutput({
    satoshis: 1,
    lockingScript
  });
  // Add a P2PKH output for fees
  sourceTransaction.addOutput({
    satoshis: 30,
    lockingScript: new P2PKH().lock(key.toAddress())
  });

  const txid = sourceTransaction.id('hex');
  sourceTransaction.merklePath = new MerklePath(0, [[{ txid: true, offset: 0, hash: txid }]]);
  const mockChain = new MockChain({ blockheaders: [txid] });

  return { senderWallet, receiverWallet, senderPubKey, receiverPubKey, sourceTransaction, mockChain };
}

describe('PushDrop Transaction Tests', () => {
  
  describe('createPushdrop', () => {
    it('should create a valid PushDrop locking script', async () => {
      const wallet = await makeWallet();
      const testData = { item: 'Product A', stage: 'Manufacturing', quantity: 100 };
      
      const lockingScript = await createPushdrop(wallet, testData);
      
      expect(lockingScript).toBeDefined();
      expect(lockingScript.toHex()).toBeTruthy();
    });
  });

  describe('PushDrop transaction creation and spending', () => {
    it('should create a transaction with a PushDrop output', async () => {
      const testData = { item: 'Product D', stage: 'Packaging' };
      const { sourceTransaction, mockChain } = await createSourceTransaction(testData);
      
      expect(sourceTransaction).toBeDefined();
      expect(sourceTransaction.outputs.length).toBe(2);
      expect(sourceTransaction.outputs[0].satoshis).toBe(1);
    });

    it('should unlock and spend a PushDrop output', async () => {
      const testData = { item: 'Product E', stage: 'Shipping', tracking: 'TRACK123' };
      const { wallet, sourceTransaction, mockChain } = await createSourceTransaction(testData);
      
      // Create a transaction that spends the PushDrop output
      const tx = new Transaction();
      
      // Get the unlocking script template
      const unlockingScriptTemplate = await unlockPushdrop(wallet);
      
      tx.addInput({
        sourceTransaction,
        sourceOutputIndex: 0,
        unlockingScriptTemplate
      });
      tx.addInput({
        sourceTransaction,
        sourceOutputIndex: 1,
        unlockingScriptTemplate: new P2PKH().unlock(key)
      });
      tx.addOutput({
        change: true,
        lockingScript: new P2PKH().lock(key.toAddress())
      });

      await tx.fee();
      await tx.sign();

      const passes = await tx.verify(mockChain);
      expect(passes).toBe(true);
    });

    it('should unlock and spend a PushDrop output sent from another wallet', async () => {
      const testData = { item: 'Product X', stage: 'Received', ref: 'CROSSWALLET-1' };
      const { receiverWallet, senderPubKey, sourceTransaction, mockChain } = await createCrossWalletSourceTransaction(testData);

      const tx = new Transaction();

      // Receiver must unlock with counterparty = sender identity pubkey
      const unlockingScriptTemplate = await unlockPushdrop(receiverWallet, senderPubKey);

      tx.addInput({
        sourceTransaction,
        sourceOutputIndex: 0,
        unlockingScriptTemplate
      });
      tx.addInput({
        sourceTransaction,
        sourceOutputIndex: 1,
        unlockingScriptTemplate: new P2PKH().unlock(key)
      });
      tx.addOutput({
        change: true,
        lockingScript: new P2PKH().lock(key.toAddress())
      });

      await tx.fee();
      await tx.sign();

      const passes = await tx.verify(mockChain);
      expect(passes).toBe(true);
    });

    it('should handle complex supply chain data in PushDrop', async () => {
      const complexData = {
        productId: 'PROD-2024-001',
        batchNumber: 'BATCH-456',
        stage: 'Quality Inspection',
        timestamp: new Date().toISOString(),
        metadata: {
          temperature: 22.5,
          humidity: 45,
          inspector: 'John Doe'
        }
      };
      
      const { wallet, sourceTransaction, mockChain } = await createSourceTransaction(complexData);
      
      const tx = new Transaction();
      const unlockingScriptTemplate = await unlockPushdrop(wallet);
      
      tx.addInput({
        sourceTransaction,
        sourceOutputIndex: 0,
        unlockingScriptTemplate
      });
      tx.addInput({
        sourceTransaction,
        sourceOutputIndex: 1,
        unlockingScriptTemplate: new P2PKH().unlock(key)
      });
      tx.addOutput({
        change: true,
        lockingScript: new P2PKH().lock(key.toAddress())
      });

      await tx.fee();
      await tx.sign();

      const passes = await tx.verify(mockChain);
      expect(passes).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle empty data', async () => {
      const wallet = await makeWallet();
      const emptyData = {};
      
      const lockingScript = await createPushdrop(wallet, emptyData);
      expect(lockingScript).toBeDefined();
    });

    it('should handle null values in data', async () => {
      const wallet = await makeWallet();
      const dataWithNull = { item: 'Product F', notes: null };
      
      const lockingScript = await createPushdrop(wallet, dataWithNull);
      expect(lockingScript).toBeDefined();
    });
  });
});
