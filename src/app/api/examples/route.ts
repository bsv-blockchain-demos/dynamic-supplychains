import { NextRequest, NextResponse } from "next/server";
import { connectToMongo } from "../../../lib/mongo";
import { ObjectId } from "mongodb";

/**
 * Sanitizes a search query for use in MongoDB regex
 * Escapes special regex characters and validates the query
 * @param query - The raw search query
 * @returns Sanitized query string
 * @throws Error if query is invalid
 */
function sanitizeRegexQuery(query: string): string {
    // Check maximum length
    if (query.length > 100) {
        throw new Error('Query exceeds maximum length of 100 characters');
    }

    // Escape special regex characters to prevent ReDoS attacks
    // Characters that need escaping: . * + ? ^ $ { } ( ) | [ ] \
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Validate that the escaped query can be used in a regex
    try {
        new RegExp(escapedQuery, 'i');
    } catch (error) {
        throw new Error('Invalid search query');
    }

    return escapedQuery;
}

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
            // Validate ObjectId format
            if (!ObjectId.isValid(actionChainId)) {
                return NextResponse.json(
                    { error: "Invalid ActionChain ID format" },
                    { status: 400 }
                );
            }

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
        
        // Trim query and check if it has actual content
        const trimmedQuery = query?.trim();
        
        if (trimmedQuery) {
            // Sanitize the query to prevent ReDoS attacks
            let sanitizedQuery: string;
            try {
                sanitizedQuery = sanitizeRegexQuery(trimmedQuery);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Invalid query';
                return NextResponse.json(
                    { error: errorMessage },
                    { status: 400 }
                );
            }

            // Create a regex for case-insensitive search with sanitized query
            const searchRegex = { $regex: sanitizedQuery, $options: 'i' };
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
