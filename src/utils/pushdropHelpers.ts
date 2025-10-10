import { PushDrop, WalletInterface, LockingScript, WalletProtocol, SymmetricKey, Utils } from "@bsv/sdk";

const customInstructions = {
    protocolID: [0, 'supplychain'] as WalletProtocol,
    keyID: "0",
};

// Receiver is the public key the pushdrop will be send to (the next stage) counterparty
// In this demo we only use our own wallet so we use "self"
// For a real supply-chain application simply change RECEIVER to the public key of the next stage and change forSelf to false

export async function createPushdrop(wallet: WalletInterface, data: any): Promise<LockingScript> {
    try {
        const RECEIVER = "self";

        // Encrypt the data using a symmetricKey
        // To decrypt the info you simply need the RECEIVER key, for our demo it's just self
        const key = new SymmetricKey(RECEIVER);
        const jsonString = JSON.stringify(data);
        const encryptedString = key.encrypt(jsonString) as number[];

        // Create a pushdrop token
        const pushdrop = new PushDrop(wallet);
        const lockingScript = await pushdrop.lock(
            [encryptedString],
            customInstructions.protocolID,
            customInstructions.keyID,
            RECEIVER, // Counterparty
            true, // forSelf?
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
export async function unlockPushdrop(wallet: WalletInterface) {
    try {
        const RECEIVER = "self";

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