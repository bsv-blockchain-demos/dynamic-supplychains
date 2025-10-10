import { NextRequest, NextResponse } from "next/server";
import { connectToMongo, ActionChainStage } from "../../../../lib/mongo";
import { ObjectId } from "mongodb";

/**
 * POST /api/stages/new-stage
 * 
 * Creates a new ActionChain with the first stage OR adds a new stage to an existing ActionChain
 * 
 * Request body:
 * - userId: string - The user creating the stage
 * - stage: ActionChainStage - The stage data (title, Timestamp, TransactionID)
 * - isFirst: boolean - Whether this is the first stage (creates new ActionChain)
 * - actionChainId?: string - Required if isFirst is false, the ID of the existing ActionChain
 * - chainTitle?: string - The title of the ActionChain (only used when isFirst is true)
 */
export async function POST(request: NextRequest) {
    try {
        const { actionChainCollection } = await connectToMongo();
        const body = await request.json();
        
        const { userId, stage, isFirst, actionChainId, chainTitle } = body;

        // Validate required fields
        if (!userId || !stage || typeof isFirst !== 'boolean') {
            return NextResponse.json(
                { error: "Missing required fields: userId, stage, isFirst" },
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

        if (isFirst) {
            // Create new ActionChain with the first stage
            const newActionChain = {
                userId,
                title: chainTitle || 'Untitled Chain',
                stages: [stage],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const result = await actionChainCollection.insertOne(newActionChain as any);

            return NextResponse.json({
                success: true,
                actionChainId: result.insertedId.toString(),
                message: "ActionChain created with first stage"
            }, { status: 201 });
        } else {
            // Add stage to existing ActionChain
            if (!actionChainId) {
                return NextResponse.json(
                    { error: "actionChainId is required when isFirst is false" },
                    { status: 400 }
                );
            }

            const result = await actionChainCollection.updateOne(
                { _id: new ObjectId(actionChainId), userId },
                {
                    $push: { stages: stage },
                    $set: { updatedAt: new Date() }
                }
            );

            if (result.matchedCount === 0) {
                return NextResponse.json(
                    { error: "ActionChain not found or user mismatch" },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                actionChainId,
                message: "Stage added to ActionChain"
            }, { status: 200 });
        }
    } catch (error) {
        console.error("Error in new-stage route:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}