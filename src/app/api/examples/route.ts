import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "../../../lib/mongo";
import { ObjectId } from "mongodb";

/**
 * GET /api/examples
 * 
 * Fetches finalized ActionChains
 * 
 * Query params:
 * - actionChainId?: string - If provided, fetches only that specific ActionChain
 * - query?: string - Search query for title, userId, firstStage, lastStage
 * - limit?: number - Number of results to return (default: 50)
 * - skip?: number - Number of results to skip for pagination (default: 0)
 */
export async function GET(request: NextRequest) {
    try {
        const { actionChainCollection } = await connectToMongo();
        const { searchParams } = new URL(request.url);
        const actionChainId = searchParams.get('actionChainId');
        const query = searchParams.get('query');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = parseInt(searchParams.get('skip') || '0');

        if (actionChainId) {
            // Fetch specific ActionChain by ID
            const actionChain = await actionChainCollection.findOne({
                _id: new ObjectId(actionChainId),
                finalized: true
            });

            if (!actionChain) {
                return NextResponse.json(
                    { error: "ActionChain not found or not finalized" },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                actionChain: {
                    _id: actionChain._id.toString(),
                    userId: actionChain.userId,
                    title: actionChain.title,
                    stages: actionChain.stages,
                    createdAt: actionChain.createdAt,
                    updatedAt: actionChain.updatedAt,
                    finalized: actionChain.finalized,
                    finalizedAt: actionChain.finalizedAt,
                }
            }, { status: 200 });
        }

        // Build search filter
        const filter: any = { finalized: true };
        
        if (query) {
            // Create a regex for case-insensitive search
            const searchRegex = { $regex: query, $options: 'i' };
            filter.$or = [
                { title: searchRegex },
                { userId: searchRegex },
                { 'stages.title': searchRegex }
            ];
        }

        // Get total count for pagination
        const totalCount = await actionChainCollection.countDocuments(filter);

        // Fetch finalized ActionChains with pagination and search
        const actionChains = await actionChainCollection
            .find(filter)
            .sort({ finalizedAt: -1 }) // Most recent first
            .skip(skip)
            .limit(limit)
            .toArray();

        const formattedChains = actionChains.map(chain => ({
            _id: chain._id.toString(),
            userId: chain.userId,
            title: chain.title,
            stageCount: chain.stages.length,
            createdAt: chain.createdAt,
            finalizedAt: chain.finalizedAt,
            // Get first and last stage for preview
            firstStage: chain.stages[0]?.title,
            lastStage: chain.stages[chain.stages.length - 1]?.title,
        }));

        return NextResponse.json({
            actionChains: formattedChains,
            total: totalCount,
            limit,
            skip,
            hasMore: skip + formattedChains.length < totalCount
        }, { status: 200 });
    } catch (error) {
        console.error("Error in examples route:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
