import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "../../../lib/mongo";
import { ObjectId } from "mongodb";

/**
 * POST /api/lock
 * 
 * Locks a user to a specific ActionChain ID to prevent concurrent editing
 * 
 * Request body:
 * - userId: string - The user to lock
 * - actionChainId: string - The ActionChain ID to lock to
 */
export async function POST(request: NextRequest) {
    try {
        const { locksCollection } = await connectToMongo();
        const body = await request.json();
        
        const { userId, actionChainId } = body;

        // Validate required fields
        if (!userId || !actionChainId) {
            return NextResponse.json(
                { error: "Missing required fields: userId, actionChainId" },
                { status: 400 }
            );
        }

        // Check if user already has a lock
        const existingLock = await locksCollection.findOne({ userId });
        
        if (existingLock) {
            // User already has a lock - return the existing lock info
            return NextResponse.json({
                success: false,
                locked: true,
                actionChainId: existingLock.actionChainId.toString(),
                message: "User already locked to an ActionChain"
            }, { status: 409 });
        }

        // check if chainId is locked to someone else
        const chainLock = await locksCollection.findOne({ actionChainId: new ObjectId(actionChainId) });
        
        if (chainLock) {
            // Chain is locked to someone else - return the existing lock info
            return NextResponse.json({
                success: false,
                locked: true,
                actionChainId: chainLock.actionChainId.toString(),
                message: "ActionChain is locked to someone else"
            }, { status: 409 });
        }

        // Create new lock
        const newLock = {
            userId,
            actionChainId: new ObjectId(actionChainId),
            createdAt: new Date(),
        };

        await locksCollection.insertOne(newLock as any);

        return NextResponse.json({
            success: true,
            locked: true,
            actionChainId,
            message: "User locked to ActionChain"
        }, { status: 201 });
    } catch (error) {
        console.error("Error in lock route:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/lock
 * 
 * Gets the current lock for a user
 * 
 * Query params:
 * - userId: string - The user to check
 */
export async function GET(request: NextRequest) {
    try {
        const { locksCollection } = await connectToMongo();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: "Missing userId query parameter" },
                { status: 400 }
            );
        }

        const lock = await locksCollection.findOne({ userId });

        if (!lock) {
            return NextResponse.json({
                locked: false,
                message: "No lock found for user"
            }, { status: 200 });
        }

        return NextResponse.json({
            locked: true,
            actionChainId: lock.actionChainId.toString(),
            createdAt: lock.createdAt,
        }, { status: 200 });
    } catch (error) {
        console.error("Error in lock GET route:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}