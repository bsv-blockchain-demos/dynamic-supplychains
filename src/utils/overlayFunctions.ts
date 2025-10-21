import { LookupResolver, TopicBroadcaster, Transaction, Utils } from "@bsv/sdk";

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

    // // Add the metadata field to tx with chainId using OffChainValues
    // const metadata = new Map().set("OffChainValues", {
    //     chainId: chainId
    // });
    // tx.metadata = metadata;

    // console.log("Broadcasting transaction: ", tx);

    // // Send the tx to that overlay.
    // const overlayResponse = await tx.broadcast(tb);
    // console.log("Overlay response: ", overlayResponse);
    const headers = {
        'x-includes-off-chain-values': 'true',
        'Content-Type': 'application/octet-stream',
        'x-topics': JSON.stringify(['tm_supplychain'])
    }
    let taggedBEEF = {
        beef: tx.toBEEF(),
        offChainValues: JSON.stringify({ chainId: chainId })
    }

    const w = new Utils.Writer()
    w.writeVarIntNum(taggedBEEF.beef.length)
    w.write(taggedBEEF.beef)
    w.write(Utils.toArray(taggedBEEF.offChainValues))
    const body = new Uint8Array(w.toArray())

    const overlayResponse = await fetch('https://overlay-us-1.bsvb.tech/submit', {
        method: 'POST',
        headers,
        body,
    });

    const data = await overlayResponse.json();
    console.log("Overlay response: ", data);
    return data;
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