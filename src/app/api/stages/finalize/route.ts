import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "../../../../lib/mongo";
import { ObjectId } from "mongodb";

/**
 * POST /api/stages/finalize
 * 
 * Finalizes an ActionChain and removes the user's lock
 * 
 * Request body:
 * - userId: string - The user finalizing the chain
 * - actionChainId: string - The ActionChain ID to finalize
 */
export async function POST(request: NextRequest) {
    try {
        const { actionChainCollection, locksCollection } = await connectToMongo();
        const body = await request.json();
        
        const { userId, actionChainId } = body;

        // Validate required fields
        if (!userId || !actionChainId) {
            return NextResponse.json(
                { error: "Missing required fields: userId, actionChainId" },
                { status: 400 }
            );
        }

        // Verify the ActionChain exists and belongs to the user
        const actionChain = await actionChainCollection.findOne({
            _id: new ObjectId(actionChainId),
            userId
        });

        if (!actionChain) {
            return NextResponse.json(
                { error: "ActionChain not found or user mismatch" },
                { status: 404 }
            );
        }

        // Verify the user has a lock for this ActionChain
        const lock = await locksCollection.findOne({
            userId,
            actionChainId: new ObjectId(actionChainId)
        });

        if (!lock) {
            return NextResponse.json(
                { error: "No lock found for this user and ActionChain" },
                { status: 404 }
            );
        }

        // Mark the ActionChain as finalized
        await actionChainCollection.updateOne(
            { _id: new ObjectId(actionChainId) },
            { $set: { finalized: true, finalizedAt: new Date() } }
        );

        // Remove the lock
        await locksCollection.deleteOne({ _id: lock._id });

        return NextResponse.json({
            success: true,
            message: "ActionChain finalized and lock removed",
            actionChainId,
            stagesCount: actionChain.stages.length,
            finalizedAt: new Date()
        }, { status: 200 });
    } catch (error) {
        console.error("Error in finalize route:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}