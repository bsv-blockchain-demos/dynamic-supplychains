import { LookupResolver, TopicBroadcaster, Transaction } from "@bsv/sdk";

const overlay = new LookupResolver({
    slapTrackers: ['https://overlay-us-1.bsvb.tech'],
    hostOverrides: {
        'ls_supplychain': ['https://overlay-us-1.bsvb.tech']
    }
});

export async function broadcastTransaction(tx: Transaction, chainId: string) {
    // Lookup a service which accepts this type of token
    const tb = new TopicBroadcaster(['tm_supplychain'], {
        resolver: overlay,
    });

    // Add the metadata field to tx with chainId using OffChainValues
    const metadata = new Map().set("OffChainValues", {
        chainId: chainId
    });
    tx.metadata = metadata;

    // Send the tx to that overlay.
    const overlayResponse = await tx.broadcast(tb);
    console.log("Overlay response: ", overlayResponse);
    return overlayResponse;
}

export async function getTransactionByTxid(txid: string) {
    try {
        // get transaction from overlay
        const response = await overlay.query({
            service: 'ls_supplychain', query: {
                txid: txid
            }
        }, 10000);

        return response;
    } catch (error) {
        console.error("Error getting transaction:", error);
        throw error;
    }
}