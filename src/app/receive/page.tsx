'use client';

import { useState } from "react";
import { ReceivedChainsList } from "../../components/receive/receivedChainsList";
import { ContinueChainColumn } from "../../components/receive/continueChainColumn";
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

export default function ReceivePage() {
    const [selectedChain, setSelectedChain] = useState<ReceivedChain | null>(null);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-8">
            <div className="max-w-6xl mx-auto">
                {!selectedChain ? (
                    <>
                        {/* Header */}
                        <div className="text-center mb-12">
                            <h1 className="text-4xl font-bold text-white mb-4">
                                Received Chains
                            </h1>
                            <p className="text-blue-100">
                                View and continue chains that were sent to you
                            </p>
                        </div>

                        {/* Received Chains List */}
                        <ReceivedChainsList onSelectChain={setSelectedChain} />
                    </>
                ) : (
                    <ContinueChainColumn 
                        chain={selectedChain} 
                        onBack={() => setSelectedChain(null)} 
                    />
                )}
            </div>
        </div>
    );
}
