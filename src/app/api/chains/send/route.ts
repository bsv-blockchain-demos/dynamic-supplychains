import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "../../../../lib/mongo";
import { ObjectId } from "mongodb";

/**
 * POST /api/chains/send
 * 
 * Sends a chain to another user by creating a ChainTransfer record
 * Verifies sender has a lock on the chain, then deletes the lock
 * 
 * Request body:
 * - actionChainId: string - The ID of the chain to send
 * - senderPubKey: string - The sender's public key
 * - receiverPubKey: string - The receiver's public key
 */
export async function POST(request: NextRequest) {
    try {
        const { actionChainCollection, chainTransfersCollection, locksCollection } = await connectToMongo();
        const body = await request.json();
        
        const { actionChainId, senderPubKey, receiverPubKey } = body;

        // Validate required fields
        if (!actionChainId || !senderPubKey || !receiverPubKey) {
            return NextResponse.json(
                { error: "Missing required fields: actionChainId, senderPubKey, receiverPubKey" },
                { status: 400 }
            );
        }

        const chainObjectId = new ObjectId(actionChainId);

        // Verify the chain exists
        const chain = await actionChainCollection.findOne({
            _id: chainObjectId
        });

        if (!chain) {
            return NextResponse.json(
                { error: "ActionChain not found" },
                { status: 404 }
            );
        }

        // Verify sender has permission to send this chain
        // Check 1: Original creator sending first stage
        const isOriginalCreatorFirstStage = (chain.stages.length === 1 && chain.userId === senderPubKey);
        
        // Check 2: Has active lock on the chain
        const lock = await locksCollection.findOne({
            userId: senderPubKey,
            actionChainId: chainObjectId
        });

        // Check 3: Most recent receiver who continued the chain
        const latestTransfer = await chainTransfersCollection.findOne(
            { actionChainId: chainObjectId },
            { sort: { sentAt: -1 } }
        );
        const isRecentReceiverWhoContined = (
            latestTransfer &&
            latestTransfer.receiverPubKey === senderPubKey &&
            latestTransfer.continued === true
        );

        // User must pass at least one permission check
        if (!isOriginalCreatorFirstStage && !lock && !isRecentReceiverWhoContined) {
            return NextResponse.json(
                { error: "You don't have permission to send this chain" },
                { status: 403 }
            );
        }

        // Delete the sender's lock if it exists
        if (lock) {
            await locksCollection.deleteOne({
                userId: senderPubKey,
                actionChainId: chainObjectId
            });
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
