import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "../../../../lib/mongo";

/**
 * GET /api/chains/pending-count
 * 
 * Returns the count of pending received chains (not yet continued)
 * 
 * Query params:
 * - receiverPubKey: string - The receiver's public key
 */
export async function GET(request: NextRequest) {
    try {
        const { chainTransfersCollection } = await connectToMongo();
        const { searchParams } = new URL(request.url);
        const receiverPubKey = searchParams.get('receiverPubKey');

        if (!receiverPubKey) {
            return NextResponse.json(
                { error: "Missing receiverPubKey query parameter" },
                { status: 400 }
            );
        }

        // Count transfers to this user that haven't been continued
        const count = await chainTransfersCollection.countDocuments({ 
            receiverPubKey,
            continued: { $ne: true }
        });

        return NextResponse.json({
            count
        }, { status: 200 });
    } catch (error) {
        console.error("Error in pending-count route:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
