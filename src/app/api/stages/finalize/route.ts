import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "../../../../lib/mongo";
import { ObjectId } from "mongodb";

/**
 * POST /api/stages/finalize
 * 
 * Finalizes an ActionChain and removes the user's lock
 * Updates the title if provided, then finalizes the chain
 * 
 * Request body:
 * - userId: string - The user finalizing the chain
 * - actionChainId: string - The ActionChain ID to finalize
 * - chainTitle?: string - Optional title to update before finalizing
 */
export async function POST(request: NextRequest) {
    try {
        const { actionChainCollection, locksCollection, chainTransfersCollection } = await connectToMongo();
        const body = await request.json();
        
        const { userId, actionChainId, chainTitle } = body;

        // Validate required fields
        if (!userId || !actionChainId) {
            return NextResponse.json(
                { error: "Missing required fields: userId, actionChainId" },
                { status: 400 }
            );
        }

        // Validate title is provided
        if (!chainTitle || chainTitle.trim() === '') {
            return NextResponse.json(
                { error: "ActionChain must have a title before finalizing" },
                { status: 400 }
            );
        }

        // Verify the ActionChain exists and belongs to the user
        const actionChain = await actionChainCollection.findOne({
            _id: new ObjectId(actionChainId),
        });

        if (!actionChain) {
            return NextResponse.json(
                { error: "ActionChain not found" },
                { status: 404 }
            );
        }

        const isOwn = actionChain.userId === userId;

        // Could be send by someone else, check transferChain collection
        if (!isOwn) {
            const transferChain = await chainTransfersCollection.findOne({
                actionChainId: new ObjectId(actionChainId),
                receiverPubKey: userId
            });
            if (!transferChain) {
                return NextResponse.json(
                    { error: "ActionChain not found or user mismatch" },
                    { status: 404 }
                );
            }
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

        // Update title and mark the ActionChain as finalized
        await actionChainCollection.updateOne(
            { _id: new ObjectId(actionChainId) },
            { 
                $set: { 
                    title: chainTitle,
                    finalized: true, 
                    finalizedAt: new Date() 
                } 
            }
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