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
 */
export async function GET(request: NextRequest) {
    try {
        const { actionChainCollection } = await connectToMongo();
        const { searchParams } = new URL(request.url);
        const actionChainId = searchParams.get('actionChainId');

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

        // Fetch all finalized ActionChains
        const actionChains = await actionChainCollection
            .find({ finalized: true })
            .sort({ finalizedAt: -1 }) // Most recent first
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
            total: formattedChains.length
        }, { status: 200 });
    } catch (error) {
        console.error("Error in examples route:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
