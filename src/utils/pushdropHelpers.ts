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
        const RECEIVER = receiverPubKey || "self";
        const forSelf = !receiverPubKey; // If no receiver provided, it's for self

        // Encrypt the data using a symmetricKey
        // To decrypt the info you simply need the RECEIVER key
        // We hash the receiver because the key must be 32 bytes
        const receiverBytes = Utils.toArray(RECEIVER, 'utf8');
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

// Will require a preimage transaction to sign to get the actual unlockingScript
// If receiverPubKey is provided, it means we're unlocking a token that was sent to us
// Otherwise, we're unlocking our own token (self)
export async function unlockPushdrop(wallet: WalletInterface, receiverPubKey?: string) {
    try {
        // Use provided receiver or fallback to "self"
        const RECEIVER = receiverPubKey || "self";

        // Unlock a pushdrop token
        const pushdrop = new PushDrop(wallet);
        const unlockingScriptFrame = pushdrop.unlock(
            customInstructions.protocolID,
            customInstructions.keyID,
            RECEIVER, // Counterparty
            "single",
            true,
            1,
        );

        return unlockingScriptFrame;
    } catch (error) {
        console.error("Error unlocking pushdrop:", error);
        throw error;
    }
}