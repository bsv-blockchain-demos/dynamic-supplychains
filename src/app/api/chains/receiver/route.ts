import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "../../../../lib/mongo";

/**
 * GET /api/chains/receiver
 * 
 * Finds the receiver for a given transaction by looking up the chain and its transfers
 * 
 * Query params:
 * - transactionId: string - The transaction ID to look up
 */
export async function GET(request: NextRequest) {
    try {
        const { actionChainCollection, chainTransfersCollection } = await connectToMongo();
        const { searchParams } = new URL(request.url);
        const transactionId = searchParams.get('transactionId');

        if (!transactionId) {
            return NextResponse.json(
                { error: "Missing transactionId query parameter" },
                { status: 400 }
            );
        }

        // Find the chain that contains this transaction
        const chain = await actionChainCollection.findOne({
            "stages.TransactionID": transactionId
        });

        if (!chain) {
            return NextResponse.json({
                receiver: "self",
                message: "Chain not found, defaulting to self"
            }, { status: 200 });
        }

        // Find the most recent transfer for this chain
        const latestTransfer = await chainTransfersCollection
            .findOne(
                { actionChainId: chain._id },
                { sort: { sentAt: -1 } } // Get the most recent transfer
            );

        if (!latestTransfer) {
            // No transfer exists, so it was encrypted with "self"
            return NextResponse.json({
                receiver: "self",
                message: "No transfer found, defaulting to self"
            }, { status: 200 });
        }

        // Return the receiver from the latest transfer
        return NextResponse.json({
            receiver: latestTransfer.receiverPubKey,
            sender: latestTransfer.senderPubKey,
            sentAt: latestTransfer.sentAt,
            message: "Receiver found from transfer"
        }, { status: 200 });
    } catch (error) {
        console.error("Error in receiver lookup route:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
