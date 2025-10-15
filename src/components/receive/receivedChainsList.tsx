'use client';

import { useState, useEffect } from "react";
import { useWalletContext } from "../../context/walletContext";
import { Spinner } from "../ui/spinner";
import { ActionChainStage } from "../../lib/mongo";

interface ReceivedChain {
    transferId: string;
    actionChainId: string;
    title?: string;
    senderPubKey: string;
    sentAt: Date;
    continued: boolean;
    continuedAt?: Date | null;
    stages: ActionChainStage[];
    stageCount: number;
}

interface ReceivedChainsListProps {
    onSelectChain: (chain: ReceivedChain) => void;
}

export const ReceivedChainsList = ({ onSelectChain }: ReceivedChainsListProps) => {
    const [receivedChains, setReceivedChains] = useState<ReceivedChain[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { userPubKey } = useWalletContext();

    useEffect(() => {
        const fetchReceivedChains = async () => {
            if (!userPubKey) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch(`/api/chains/received?receiverPubKey=${encodeURIComponent(userPubKey)}`);
                const data = await response.json();
                
                if (response.ok) {
                    setReceivedChains(data.receivedChains);
                }
            } catch (error) {
                console.error('Error fetching received chains:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReceivedChains();
    }, [userPubKey]);

    if (!userPubKey) {
        return (
            <div className="text-center text-white py-12">
                <p className="text-xl mb-4">Please connect your wallet to view received chains</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="text-center text-white flex flex-col items-center gap-4 py-12">
                <Spinner size="lg" />
                <p>Loading received chains...</p>
            </div>
        );
    }

    if (receivedChains.length === 0) {
        return (
            <div className="text-center text-white py-12">
                <p className="text-xl mb-2">No chains received yet</p>
                <p className="text-blue-200">Chains sent to you will appear here</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                    Received Chains
                </h2>
                <p className="text-blue-200">
                    Select a chain to continue it by adding a new stage
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {receivedChains.map((chain) => (
                    <div
                        key={chain.transferId}
                        onClick={() => onSelectChain(chain)}
                        className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 cursor-pointer"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-900 truncate flex-1">
                                {chain.title || 'Untitled Chain'}
                            </h3>
                            {chain.continued && (
                                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded ml-2">
                                    Continued
                                </span>
                            )}
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">Stages:</span>
                                <span>{chain.stageCount}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">From:</span>
                                <span className="truncate font-mono text-xs">
                                    {chain.senderPubKey.slice(0, 8)}...{chain.senderPubKey.slice(-6)}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">Received:</span>
                                <span className="text-xs">
                                    {new Date(chain.sentAt).toLocaleDateString()}
                                </span>
                            </div>

                            {chain.continued && chain.continuedAt && (
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">Continued:</span>
                                    <span className="text-xs">
                                        {new Date(chain.continuedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <span className="text-blue-600 font-medium text-sm hover:text-blue-700">
                                {chain.continued ? 'View Chain →' : 'Continue Chain →'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="text-center text-blue-200 text-sm mt-8">
                Showing {receivedChains.length} received chain{receivedChains.length !== 1 ? 's' : ''}
            </div>
        </div>
    );
};
