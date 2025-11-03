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
 * - chainTitle?: string - Optional title for the ActionChain (can be null/empty and updated later)
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

        // Convert Timestamp to Date object if it's a string
        const normalizedStage = {
            ...stage,
            Timestamp: stage.Timestamp instanceof Date ? stage.Timestamp : new Date(stage.Timestamp)
        };

        if (isFirst) {
            // Create new ActionChain with the first stage
            const newActionChain = {
                userId,
                title: chainTitle || null,
                stages: [normalizedStage],
                createdAt: new Date(),
                updatedAt: new Date(),
                finalized: false,
                finalizedAt: null,
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

            // Make sure chain hasn't been finalized yet
            const actionChain = await actionChainCollection.findOne({
                _id: new ObjectId(actionChainId),
                finalized: false
            });

            if (!actionChain) {
                return NextResponse.json(
                    { error: "ActionChain not found or has been finalized" },
                    { status: 404 }
                );
            }

            // Build update object - update title if provided
            const updateFields: any = { updatedAt: new Date() };
            if (chainTitle !== undefined) {
                updateFields.title = chainTitle;
            }

            const result = await actionChainCollection.updateOne(
                { _id: new ObjectId(actionChainId), userId },
                {
                    $push: { stages: normalizedStage },
                    $set: updateFields
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