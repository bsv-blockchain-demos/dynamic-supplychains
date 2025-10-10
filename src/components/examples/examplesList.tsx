'use client';

import { useState, useEffect } from "react";
import Link from "next/link";

interface ActionChainCard {
    _id: string;
    userId: string;
    title?: string;
    stageCount: number;
    createdAt?: Date;
    finalizedAt?: Date;
    firstStage?: string;
    lastStage?: string;
}

export const ExamplesList = () => {
    const [actionChains, setActionChains] = useState<ActionChainCard[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchActionChains = async () => {
            try {
                const response = await fetch('/api/examples');
                const data = await response.json();
                
                if (response.ok) {
                    setActionChains(data.actionChains);
                }
            } catch (error) {
                console.error('Error fetching action chains:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchActionChains();
    }, []);

    return (
        <>
            {/* Header */}
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-white mb-4">
                    Finalized Action Chains
                </h1>
                <p className="text-blue-100">
                    Browse completed blockchain supply chain examples
                </p>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="text-center text-white">
                    <p>Loading action chains...</p>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && actionChains.length === 0 && (
                <div className="text-center text-white">
                    <p className="text-xl">No finalized action chains yet.</p>
                    <p className="text-blue-200 mt-2">Create your first chain to see it here!</p>
                </div>
            )}

            {/* Action Chains Grid */}
            {!isLoading && actionChains.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {actionChains.map((chain) => (
                        <Link
                            key={chain._id}
                            href={`/examples/${chain._id}`}
                            className="block"
                        >
                            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 cursor-pointer">
                                <h3 className="text-xl font-bold text-gray-900 mb-3 truncate">
                                    {chain.title || 'Untitled Chain'}
                                </h3>
                                
                                {/* Stats */}
                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">Stages:</span>
                                        <span>{chain.stageCount}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">Creator:</span>
                                        <span className="truncate font-mono text-xs">
                                            {chain.userId.slice(0, 8)}...{chain.userId.slice(-6)}
                                        </span>
                                    </div>
                                    
                                    {chain.firstStage && chain.lastStage && (
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">Flow:</span>
                                            <span className="truncate text-xs">
                                                {chain.firstStage} → {chain.lastStage}
                                            </span>
                                        </div>
                                    )}
                                    
                                    {chain.finalizedAt && (
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">Finalized:</span>
                                            <span className="text-xs">
                                                {new Date(chain.finalizedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* View Button */}
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <span className="text-blue-600 font-medium text-sm hover:text-blue-700">
                                        View Details →
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Total Count */}
            {!isLoading && actionChains.length > 0 && (
                <div className="mt-8 text-center text-blue-200 text-sm">
                    Showing {actionChains.length} finalized action chain{actionChains.length !== 1 ? 's' : ''}
                </div>
            )}
        </>
    );
};
