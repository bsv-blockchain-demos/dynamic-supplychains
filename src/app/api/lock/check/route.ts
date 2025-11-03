import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "../../../../lib/mongo";

/**
 * POST /api/lock/check
 * 
 * Checks if a user has an active lock
 * 
 * Request body:
 * - userId: string - The user to check
 */
export async function POST(request: NextRequest) {
    try {
        const { locksCollection } = await connectToMongo();
        const body = await request.json();
        
        const { userId } = body;

        // Validate required fields
        if (!userId) {
            return NextResponse.json(
                { error: "Missing required field: userId" },
                { status: 400 }
            );
        }

        // Check if user has an active lock
        const existingLock = await locksCollection.findOne({ userId });

        if (existingLock) {
            return NextResponse.json({
                locked: true,
                actionChainId: existingLock.actionChainId.toString(),
                createdAt: existingLock.createdAt,
            }, { status: 200 });
        }

        return NextResponse.json({
            locked: false,
            message: "No active lock found for user"
        }, { status: 200 });
    } catch (error) {
        console.error("Error in lock check route:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}