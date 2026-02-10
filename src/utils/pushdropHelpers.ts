import { PushDrop, WalletInterface, LockingScript, WalletProtocol, SymmetricKey, Utils, Hash } from "@bsv/sdk";

const customInstructions = {
    protocolID: [0, 'supplychain'] as WalletProtocol,
    keyID: "0",
};

// Receiver is the public key the pushdrop will be send to (the next stage) counterparty
// If receiverPubKey is provided, the pushdrop will be locked to that key
// Otherwise it defaults to "self" (your own wallet)

export async function createPushdrop(wallet: WalletInterface, data: any, receiverPubKey?: string): Promise<LockingScript> {
    try {
        // Use provided receiver or fallback to "self"
        const normalizedReceiverPubKey = receiverPubKey?.trim().replace(/^0x/i, '') || undefined;
        const RECEIVER = normalizedReceiverPubKey || "self";
        const forSelf = normalizedReceiverPubKey ? false : true; // If no receiver provided, it's for self

        const encryptionPubKey = normalizedReceiverPubKey
            ? normalizedReceiverPubKey
            : (await wallet.getPublicKey({ identityKey: true })).publicKey;

        // Encrypt the data using a symmetricKey
        // To decrypt the info you simply need the RECEIVER key
        // We hash the receiver because the key must be 32 bytes
        const receiverBytes = Utils.toArray(encryptionPubKey, 'hex');
        const keyBytes = Hash.sha256(receiverBytes);
        const key = new SymmetricKey(keyBytes);

        const jsonString = JSON.stringify(data);
        const encryptedString = key.encrypt(jsonString) as number[];

        // Create a pushdrop token
        const pushdrop = new PushDrop(wallet);
        const lockingScript = await pushdrop.lock(
            [encryptedString],
            customInstructions.protocolID,
            customInstructions.keyID,
            RECEIVER, // Counterparty
            forSelf, // forSelf? - true if keeping for self, false if sending to someone
            true, // IncludeSig?
            'after'
        );
        return lockingScript;
    } catch (error) {
        console.error("Error creating pushdrop:", error);
        throw error;
    }
}

// Always uses "self" as counterparty unless sent by another wallet
// Only the wallet with the correct key can unlock a pushdrop locked to them
export async function unlockPushdrop(wallet: WalletInterface, senderPubKey?: string) {
    try {
        const normalizedSenderPubKey = senderPubKey?.trim().replace(/^0x/i, '') || undefined;
        const SENDER = normalizedSenderPubKey || "self";

        // Unlock a pushdrop token
        const pushdrop = new PushDrop(wallet);
        const unlockingScriptFrame = pushdrop.unlock(
            customInstructions.protocolID,
            customInstructions.keyID,
            SENDER, // Counterparty - sender's public key or self
            "all", // SignOutputs
            true, // AnyoneCanPay - true because wallet adds funding inputs
        );

        return unlockingScriptFrame;
    } catch (error) {
        console.error("Error unlocking pushdrop:", error);
        throw error;
    }
}