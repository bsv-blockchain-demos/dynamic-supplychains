'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionChainStage } from "../../lib/mongo";
import { StageItem } from "../renderStages/stageItem";
import { Spinner } from "../ui/spinner";

interface ActionChainDetail {
    _id: string;
    userId: string;
    title?: string;
    stages: ActionChainStage[];
    createdAt?: Date;
    updatedAt?: Date;
    finalized?: boolean;
    finalizedAt?: Date;
}

interface SingleExampleProps {
    actionChainId: string;
}

export const SingleExample = ({ actionChainId }: SingleExampleProps) => {
    const router = useRouter();
    const [actionChain, setActionChain] = useState<ActionChainDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchActionChain = async () => {
            try {
                const response = await fetch(`/api/examples?actionChainId=${encodeURIComponent(actionChainId)}`);
                const data = await response.json();
                
                if (!response.ok) {
                    setError(data.error || 'Failed to load action chain');
                    return;
                }

                setActionChain(data.actionChain);
            } catch (error) {
                console.error('Error fetching action chain:', error);
                setError('Failed to load action chain');
            } finally {
                setIsLoading(false);
            }
        };

        if (actionChainId) {
            fetchActionChain();
        }
    }, [actionChainId]);

    if (isLoading) {
        return (
            <div className="text-center text-white flex flex-col items-center gap-4">
                <Spinner size="lg" />
                <p>Loading action chain...</p>
            </div>
        );
    }

    if (error || !actionChain) {
        return (
            <div className="text-center">
                <h1 className="text-4xl font-bold text-white mb-4">
                    Action Chain Not Found
                </h1>
                <p className="text-blue-100 mb-6">{error || 'This action chain does not exist or is not finalized'}</p>
                <button
                    onClick={() => router.push('/examples')}
                    className="px-6 py-3 bg-blue-600 hover:bg-white hover:text-blue-900 text-white rounded-lg font-medium transition-colors hover:cursor-pointer"
                >
                    ← Back to Examples
                </button>
            </div>
        );
    }

    return (
        <>
            {/* Back Button */}
            <button
                onClick={() => router.push('/examples')}
                className="mb-6 px-4 py-2 bg-blue-800 hover:bg-white hover:text-blue-900 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2 hover:cursor-pointer"
            >
                ← Back to Examples
            </button>

            {/* Header */}
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-white mb-4">
                    {actionChain.title || 'Untitled Chain'}
                </h1>
                <div className="mb-3">
                    <span className="text-blue-100 text-xs font-semibold">Chain ID:</span>{' '}
                    <span className="font-mono text-blue-200 text-xs">
                        {actionChain._id}
                    </span>
                </div>
                <div className="flex justify-center gap-6 text-blue-100 text-sm">
                    <div>
                        <span className="font-semibold">Stages:</span> {actionChain.stages.length}
                    </div>
                    <div>
                        <span className="font-semibold">Creator:</span>{' '}
                        <span className="font-mono">
                            {actionChain.userId.slice(0, 8)}...{actionChain.userId.slice(-6)}
                        </span>
                    </div>
                    {actionChain.finalizedAt && (
                        <div>
                            <span className="font-semibold">Finalized:</span>{' '}
                            {new Date(actionChain.finalizedAt).toLocaleDateString()}
                        </div>
                    )}
                </div>
            </div>

            {/* Read-Only Stages Display */}
            <div className="w-full flex flex-col items-center gap-8 py-8">
                {/* Render existing stages */}
                {actionChain.stages.map((stage, index) => (
                    <StageItem key={`${stage.TransactionID}-${index}`} stage={stage} />
                ))}

                {/* Info Card */}
                <div className="w-full max-w-xl bg-blue-800/50 rounded-xl p-6 text-center">
                    <p className="text-blue-100 text-sm">
                        This is a finalized action chain. No modifications can be made.
                    </p>
                </div>
            </div>
        </>
    );
};
