import { NextRequest, NextResponse } from "next/server";
import { connectToMongo, ActionChainStage } from "../../../../lib/mongo";
import { ObjectId } from "mongodb";

/**
 * POST /api/chains/continue
 * 
 * Continues a received chain by adding a new stage
 * 
 * Request body:
 * - transferId: string - The ID of the chain transfer
 * - receiverPubKey: string - The receiver's public key (must match)
 * - stage: ActionChainStage - The new stage to add
 */
export async function POST(request: NextRequest) {
    try {
        const { actionChainCollection, chainTransfersCollection } = await connectToMongo();
        const body = await request.json();
        
        const { transferId, receiverPubKey, stage } = body;

        // Validate required fields
        if (!transferId || !receiverPubKey || !stage) {
            return NextResponse.json(
                { error: "Missing required fields: transferId, receiverPubKey, stage" },
                { status: 400 }
            );
        }

        // Validate stage structure
        if (!stage.TransactionID || !stage.Timestamp) {
            return NextResponse.json(
                { error: "Invalid stage: must have TransactionID and Timestamp" },
                { status: 400 }
            );
        }

        // Find the transfer record
        const transfer = await chainTransfersCollection.findOne({
            _id: new ObjectId(transferId),
            receiverPubKey
        });

        if (!transfer) {
            return NextResponse.json(
                { error: "Transfer not found or you don't have permission" },
                { status: 404 }
            );
        }

        // Make sure chain hasn't been finalized yet
        const actionChain = await actionChainCollection.findOne({
            _id: transfer.actionChainId,
            finalized: false
        });

        if (!actionChain) {
            return NextResponse.json(
                { error: "ActionChain not found or has been finalized" },
                { status: 404 }
            );
        }

        // Convert Timestamp to Date object if it's a string
        const normalizedStage = {
            ...stage,
            Timestamp: stage.Timestamp instanceof Date ? stage.Timestamp : new Date(stage.Timestamp)
        };

        // Add the new stage to the chain
        const updateResult = await actionChainCollection.updateOne(
            { _id: transfer.actionChainId },
            {
                $push: { stages: normalizedStage },
                $set: { updatedAt: new Date() }
            }
        );

        if (updateResult.matchedCount === 0) {
            return NextResponse.json(
                { error: "ActionChain not found" },
                { status: 404 }
            );
        }

        // Mark the transfer as continued
        await chainTransfersCollection.updateOne(
            { _id: new ObjectId(transferId) },
            {
                $set: {
                    continued: true,
                    continuedAt: new Date()
                }
            }
        );

        return NextResponse.json({
            success: true,
            actionChainId: transfer.actionChainId.toString(),
            message: "Stage added to received chain successfully"
        }, { status: 200 });
    } catch (error) {
        console.error("Error in continue chain route:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
