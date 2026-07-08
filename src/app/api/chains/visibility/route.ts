import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "../../../../lib/mongo";
import { ObjectId } from "mongodb";

/**
 * POST /api/chains/visibility
 *
 * Sets a chain's directory visibility. Private chains are hidden from the
 * public directory and direct links unless the creator's wallet is connected.
 *
 * Request body:
 * - actionChainId: string - The ID of the chain
 * - userId: string - The requester's public key (must be the chain's creator)
 * - isPrivate: boolean - The desired visibility state
 */
export async function POST(request: NextRequest) {
    try {
        const { actionChainCollection } = await connectToMongo();
        const body = await request.json();

        const { actionChainId, userId, isPrivate } = body;

        // Validate required fields
        if (!actionChainId || !userId || typeof isPrivate !== "boolean") {
            return NextResponse.json(
                { error: "Missing required fields: actionChainId, userId, isPrivate" },
                { status: 400 }
            );
        }

        if (!ObjectId.isValid(actionChainId)) {
            return NextResponse.json(
                { error: "Invalid ActionChain ID format" },
                { status: 400 }
            );
        }

        const chain = await actionChainCollection.findOne({
            _id: new ObjectId(actionChainId)
        });

        if (!chain) {
            return NextResponse.json(
                { error: "ActionChain not found" },
                { status: 404 }
            );
        }

        if (chain.userId !== userId) {
            return NextResponse.json(
                { error: "Only the chain's creator can change its visibility" },
                { status: 403 }
            );
        }

        await actionChainCollection.updateOne(
            { _id: chain._id },
            { $set: { isPrivate, updatedAt: new Date() } }
        );

        return NextResponse.json({ success: true, isPrivate }, { status: 200 });
    } catch (error) {
        console.error("Error updating chain visibility:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
