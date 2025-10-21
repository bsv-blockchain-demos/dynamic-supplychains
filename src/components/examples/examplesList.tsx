'use client';

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Spinner } from "../ui/spinner";

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
    const [searchQuery, setSearchQuery] = useState("");

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

    // Filter action chains based on search query
    const filteredChains = useMemo(() => {
        if (!searchQuery.trim()) {
            return actionChains;
        }

        const query = searchQuery.toLowerCase();
        return actionChains.filter((chain) => {
            // Search by title
            if (chain.title?.toLowerCase().includes(query)) return true;
            
            // Search by chain ID
            if (chain._id.toLowerCase().includes(query)) return true;
            
            // Search by creator ID
            if (chain.userId.toLowerCase().includes(query)) return true;
            
            // Search by first or last stage
            if (chain.firstStage?.toLowerCase().includes(query)) return true;
            if (chain.lastStage?.toLowerCase().includes(query)) return true;
            
            return false;
        });
    }, [actionChains, searchQuery]);

    return (
        <>
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-white mb-4">
                    Finalized Action Chains
                </h1>
                <p className="text-blue-100">
                    Browse completed blockchain supply chain examples
                </p>
            </div>

            {/* Search Bar */}
            {!isLoading && actionChains.length > 0 && (
                <div className="max-w-2xl mx-auto mb-8">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by title, chain ID, creator, or stage..."
                            className="w-full px-5 py-3 pl-12 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition text-gray-900 font-medium bg-white shadow-lg"
                        />
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                        >
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors hover:cursor-pointer"
                                title="Clear search"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="text-center text-white flex flex-col items-center gap-4">
                    <Spinner size="lg" />
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

            {/* No Results State */}
            {!isLoading && actionChains.length > 0 && filteredChains.length === 0 && (
                <div className="text-center text-white">
                    <p className="text-xl">No chains match your search.</p>
                    <p className="text-blue-200 mt-2">Try a different search term or <button onClick={() => setSearchQuery("")} className="underline hover:text-white transition-colors hover:cursor-pointer">clear the search</button>.</p>
                </div>
            )}

            {/* Action Chains Grid */}
            {!isLoading && filteredChains.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredChains.map((chain) => (
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
                    {searchQuery ? (
                        <span>
                            Showing {filteredChains.length} of {actionChains.length} finalized action chain{actionChains.length !== 1 ? 's' : ''}
                        </span>
                    ) : (
                        <span>
                            Showing {actionChains.length} finalized action chain{actionChains.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            )}
        </>
    );
};
