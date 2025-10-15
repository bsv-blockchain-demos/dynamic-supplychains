import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "../../../../lib/mongo";

/**
 * GET /api/chains/received
 * 
 * Fetches chains currently sent to a specific user where they are the CURRENT receiver
 * Only returns non-finalized chains where no subsequent transfer exists (user is the latest receiver)
 * 
 * Query params:
 * - receiverPubKey: string - The receiver's public key
 */
export async function GET(request: NextRequest) {
    try {
        const { actionChainCollection, chainTransfersCollection } = await connectToMongo();
        const { searchParams } = new URL(request.url);
        const receiverPubKey = searchParams.get('receiverPubKey');

        if (!receiverPubKey) {
            return NextResponse.json(
                { error: "Missing receiverPubKey query parameter" },
                { status: 400 }
            );
        }

        // Find all transfers to this user
        const transfers = await chainTransfersCollection
            .find({ receiverPubKey })
            .sort({ sentAt: -1 })
            .toArray();

        if (transfers.length === 0) {
            return NextResponse.json({
                receivedChains: [],
                message: "No received chains found"
            }, { status: 200 });
        }

        // Fetch and filter chains
        const chainPromises = transfers.map(async (transfer) => {
            // Check if the chain exists and is not finalized
            const chain = await actionChainCollection.findOne({
                _id: transfer.actionChainId,
                finalized: { $ne: true } // Exclude finalized chains
            });

            if (!chain) {
                return null;
            }

            // Check if this transfer is the CURRENT one (no subsequent transfers for this chain)
            // Find any transfers for this chain that were sent AFTER this transfer
            const subsequentTransfer = await chainTransfersCollection.findOne({
                actionChainId: transfer.actionChainId,
                sentAt: { $gt: transfer.sentAt }
            });

            // If there's a subsequent transfer, this user is no longer the current receiver
            if (subsequentTransfer) {
                return null;
            }

            return {
                transferId: transfer._id.toString(),
                actionChainId: chain._id.toString(),
                title: chain.title,
                senderPubKey: transfer.senderPubKey,
                sentAt: transfer.sentAt,
                continued: transfer.continued,
                continuedAt: transfer.continuedAt,
                stages: chain.stages,
                stageCount: chain.stages.length,
            };
        });

        const receivedChains = (await Promise.all(chainPromises)).filter(chain => chain !== null);

        return NextResponse.json({
            receivedChains,
            message: "Successfully fetched received chains"
        }, { status: 200 });
    } catch (error) {
        console.error("Error in received chains route:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
