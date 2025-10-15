import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "../../../../lib/mongo";

/**
 * GET /api/stages/current
 * 
 * Fetches the current ActionChain where the user has an active lock (not finalized)
 * 
 * Query params:
 * - userId: string - The user's public key
 */
export async function GET(request: NextRequest) {
    try {
        const { actionChainCollection, locksCollection } = await connectToMongo();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: "Missing userId query parameter" },
                { status: 400 }
            );
        }

        // Find the user's active lock
        const lock = await locksCollection.findOne({ userId });

        if (!lock) {
            return NextResponse.json({
                hasActiveChain: false,
                message: "No active ActionChain found"
            }, { status: 200 });
        }

        // Fetch the ActionChain associated with the lock
        const actionChain = await actionChainCollection.findOne({
            _id: lock.actionChainId,
            userId,
            finalized: { $ne: true } // Ensure it's not finalized
        });

        if (!actionChain) {
            // Lock exists but no matching non-finalized chain - clean up the lock
            await locksCollection.deleteOne({ _id: lock._id });
            return NextResponse.json({
                hasActiveChain: false,
                message: "No active ActionChain found"
            }, { status: 200 });
        }

        return NextResponse.json({
            hasActiveChain: true,
            actionChain: {
                _id: actionChain._id.toString(),
                userId: actionChain.userId,
                title: actionChain.title,
                stages: actionChain.stages,
                createdAt: actionChain.createdAt,
                updatedAt: actionChain.updatedAt,
            }
        }, { status: 200 });
    } catch (error) {
        console.error("Error in current route:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
