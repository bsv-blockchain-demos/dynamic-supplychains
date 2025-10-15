import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "../../../../lib/mongo";
import { ObjectId } from "mongodb";

/**
 * POST /api/chains/send
 * 
 * Sends a chain to another user by creating a ChainTransfer record
 * 
 * Request body:
 * - actionChainId: string - The ID of the chain to send
 * - senderPubKey: string - The sender's public key
 * - receiverPubKey: string - The receiver's public key
 */
export async function POST(request: NextRequest) {
    try {
        const { actionChainCollection, chainTransfersCollection } = await connectToMongo();
        const body = await request.json();
        
        const { actionChainId, senderPubKey, receiverPubKey } = body;

        // Validate required fields
        if (!actionChainId || !senderPubKey || !receiverPubKey) {
            return NextResponse.json(
                { error: "Missing required fields: actionChainId, senderPubKey, receiverPubKey" },
                { status: 400 }
            );
        }

        // Verify the chain exists and belongs to the sender
        const chain = await actionChainCollection.findOne({
            _id: new ObjectId(actionChainId),
            userId: senderPubKey
        });

        if (!chain) {
            return NextResponse.json(
                { error: "ActionChain not found or you don't have permission to send it" },
                { status: 404 }
            );
        }

        // Create a chain transfer record
        const transfer = {
            actionChainId: new ObjectId(actionChainId),
            senderPubKey,
            receiverPubKey,
            sentAt: new Date(),
            continued: false,
            continuedAt: null,
        };

        const result = await chainTransfersCollection.insertOne(transfer as any);

        return NextResponse.json({
            success: true,
            transferId: result.insertedId.toString(),
            message: "Chain sent successfully"
        }, { status: 201 });
    } catch (error) {
        console.error("Error in send chain route:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
