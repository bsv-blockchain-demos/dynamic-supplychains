'use client';

import { ActionChainStage } from "../../lib/mongo";
import { StageItem } from "../renderStages/stageItem";
import { CreateStageModal } from "../stageActions/createStageModal";
import { CHAIN_TEMPLATES, ChainTemplate } from "../stageActions/createModalTemplates";
import { useWalletContext } from "../../context/walletContext";
import { Transaction, WalletClient } from "@bsv/sdk";
import { createPushdrop, unlockPushdrop } from "../../utils/pushdropHelpers";
import { broadcastTransaction, getTransactionByTxid } from "../../utils/overlayFunctions";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { Spinner } from "../ui/spinner";
import Link from "next/link";

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

interface ContinueChainColumnProps {
    chain: ReceivedChain;
    onBack: () => void;
}

export const ContinueChainColumn = ({ chain, onBack }: ContinueChainColumnProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stages, setStages] = useState<ActionChainStage[]>(chain.stages);
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [hasAddedStage, setHasAddedStage] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<ChainTemplate | null>(null);

    const { userWallet, userPubKey } = useWalletContext();

    const handleAddStage = async (data: Record<string, string>) => {
        const lastStage = stages[stages.length - 1];

        if (!userWallet) {
            toast.error('Wallet not initialized');
            throw new Error("Wallet not initialized");
        }

        if (!userPubKey) {
            toast.error('User public key not found');
            throw new Error("User public key not found");
        }

        // Extract receiver if provided
        const newReceiverPubKey = data.receiverPubKey;

        if (!newReceiverPubKey) {
            // User is trying to send it to themselves
            // Check if the user has an active lock
            const response = await fetch('/api/lock/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userPubKey,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                toast.error(result.error || 'Failed to check lock');
                throw new Error(result.error || 'Failed to check lock');
            }

            if (result.locked) {
                toast.error('You already have an active chain\nPlease finalize it first before sending another chain to yourself');
                throw new Error('User already has an active chain');
            }
        }

        // Create the transaction for the new stage
        setIsBroadcasting(true);
        const result = await createContinuationToken(userWallet, data, lastStage, newReceiverPubKey);

        if (!result || !result.txid) {
            setIsBroadcasting(false);
            toast.error('Failed to create pushdrop token');
            throw new Error("Failed to create pushdrop token");
        }

        const { txid, tx } = result;

        // Create new stage object
        const newStage: ActionChainStage = {
            title: data.title,
            imageURL: data.imageURL,
            Timestamp: new Date(),
            TransactionID: txid,
        };

        // Save stage to the chain via the continue API
        try {
            const response = await fetch('/api/chains/continue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transferId: chain.transferId,
                    receiverPubKey: userPubKey,
                    stage: newStage,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                toast.error(result.error || 'Failed to continue chain');
                throw new Error(result.error || 'Failed to continue chain');
            }

            console.log('Stage added successfully:', result);

            // Broadcast transaction with chainId in background
            (async () => {
                try {
                    const response = await broadcastTransaction(tx, chain.actionChainId);
                    console.log("Broadcast response: ", response);
                    toast.success("Transaction broadcasted successfully");
                    setIsBroadcasting(false);
                } catch (error) {
                    console.error("Broadcast failed:", error);
                    toast.error("Warning: Transaction created but broadcast failed");
                    setIsBroadcasting(false);
                }
            })();

            // If a new receiver was specified, create another ChainTransfer record
            if (newReceiverPubKey) {
                try {
                    const transferResponse = await fetch('/api/chains/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            actionChainId: chain.actionChainId,
                            senderPubKey: userPubKey,
                            receiverPubKey: newReceiverPubKey,
                        }),
                    });

                    if (transferResponse.ok) {
                        toast.success(`Stage "${data.title}" added and sent to next receiver!`, {
                            duration: 5000,
                            icon: '📤',
                        });
                    } else {
                        toast.success(`Stage "${data.title}" added successfully! Chain continued.`, {
                            duration: 5000,
                            icon: '✅',
                        });
                        console.warn('Failed to create transfer record, but stage was created');
                    }
                } catch (error) {
                    console.error('Error creating transfer record:', error);
                    toast.success(`Stage "${data.title}" added successfully! Chain continued.`, {
                        duration: 5000,
                        icon: '✅',
                    });
                }
            } else {
                // No receiver specified - locked to self, create a lock for the user
                try {
                    const lockResponse = await fetch('/api/lock', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: userPubKey,
                            actionChainId: chain.actionChainId,
                        }),
                    });

                    if (!lockResponse.ok) {
                        console.warn('Failed to create lock for continued chain');
                    }
                } catch (error) {
                    console.error('Error creating lock:', error);
                }

                toast.success(`Stage "${data.title}" added successfully! Chain continued.`, {
                    duration: 5000,
                    icon: '✅',
                });
            }

            setStages([...stages, newStage]);
            setHasAddedStage(true);
        } catch (error) {
            console.error('Error adding stage:', error);
            toast.error('An error occurred while adding the stage');
            throw error;
        }
    };

    const handleFinalizeChain = async () => {
        if (!userPubKey) {
            console.error('Missing userPubKey');
            toast.error('Missing user credentials');
            return;
        }

        if (stages.length < 2) {
            toast.error('You need at least 2 stages to finalize the chain');
            return;
        }

        if (!chain.title || chain.title.trim() === '') {
            toast.error('Chain must have a title to finalize');
            return;
        }

        setIsFinalizing(true);
        try {
            const response = await fetch('/api/stages/finalize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userPubKey,
                    actionChainId: chain.actionChainId,
                    chainTitle: chain.title,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                toast.error(result.error || 'Failed to finalize chain');
                throw new Error(result.error || 'Failed to finalize chain');
            }

            console.log('Chain finalized successfully:', result);
            toast.success(`ActionChain finalized with ${result.stagesCount} stages!`, {
                duration: 5000,
                icon: '✅',
            });

            // Go back to the list after finalizing
            setTimeout(() => {
                onBack();
            }, 1500);
        } catch (error) {
            console.error('Error finalizing chain:', error);
            toast.error('Failed to finalize the action chain');
        } finally {
            setIsFinalizing(false);
        }
    };

    return (
        <>
            <div className="w-full flex flex-col items-center gap-8 py-8">
                {/* Back Button */}
                <div className="w-full max-w-xl">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-white hover:text-blue-200 transition-colors font-medium"
                    >
                        <span>←</span>
                        <span>Back to Received Chains</span>
                    </button>
                </div>

                {/* Chain Info */}
                <div className="w-full max-w-xl bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-lg border border-gray-700">
                    <h2 className="text-2xl font-bold text-white mb-4">
                        {chain.title || 'Untitled Chain'}
                    </h2>
                    <div className="space-y-2 text-sm text-gray-300">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <span className="font-semibold whitespace-nowrap">Chain ID:</span>
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                                <Link
                                    href={`/examples/${chain.actionChainId}`}
                                    className="truncate font-mono text-xs text-blue-300 hover:text-blue-100 hover:underline cursor-pointer transition-colors"
                                >
                                    {chain.actionChainId}
                                </Link>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        navigator.clipboard.writeText(chain.actionChainId);
                                        toast.success('Chain ID copied to clipboard!', { duration: 2000 });
                                    }}
                                    className="px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded transition-colors flex items-center gap-1 whitespace-nowrap flex-shrink-0 hover:cursor-pointer"
                                    title="Copy Chain ID"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                    Copy
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Sent by:</span>
                            <span className="truncate font-mono text-xs">
                                {chain.senderPubKey.slice(0, 12)}...{chain.senderPubKey.slice(-8)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Current Stages:</span>
                            <span>{stages.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Received:</span>
                            <span>{new Date(chain.sentAt).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Template Selection - Show before adding stage */}
                {!hasAddedStage && (
                    <div className="w-full max-w-xl">
                        <p className="text-xs font-medium text-blue-200 mb-2">Quick Templates:</p>
                        <div className="flex gap-2 flex-wrap">
                            {CHAIN_TEMPLATES.map((template) => (
                                <button
                                    key={template.title}
                                    type="button"
                                    onClick={() => {
                                        if (selectedTemplate?.title === template.title) {
                                            // Deselect if clicking the already selected template
                                            setSelectedTemplate(null);
                                        } else {
                                            // Select the template
                                            setSelectedTemplate(template);
                                            toast.success(`${template.title} template selected!`);
                                        }
                                    }}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all hover:cursor-pointer ${selectedTemplate?.title === template.title
                                            ? 'bg-blue-500 text-white shadow-lg ring-2 ring-blue-300'
                                            : 'bg-white text-blue-900 hover:bg-blue-50 shadow-md hover:shadow-lg'
                                        }`}
                                >
                                    {template.title}
                                </button>
                            ))}
                        </div>
                        {selectedTemplate && (
                            <p className="text-xs text-blue-200 mt-3">
                                💡 Tip: Template stages will appear with pre-filled metadata fields when creating stages
                            </p>
                        )}
                    </div>
                )}

                {/* Info message */}
                {hasAddedStage && stages.length < 2 && (
                    <div className="w-full max-w-xl bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                        <p className="text-sm text-yellow-700">
                            <strong>Note:</strong> You need at least 2 stages. Currently: {stages.length}/2
                        </p>
                    </div>
                )}

                {/* Finalize Button - Show after adding stage */}
                {hasAddedStage && stages.length >= 2 && (
                    <div className="w-full max-w-xl">
                        <button
                            onClick={handleFinalizeChain}
                            disabled={isFinalizing || !chain.title || chain.title.trim() === ''}
                            className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:opacity-60 text-white rounded-lg font-bold text-lg transition-colors shadow-lg hover:shadow-xl disabled:cursor-not-allowed hover:cursor-pointer flex items-center justify-center gap-3"
                        >
                            {isFinalizing && <Spinner size="sm" />}
                            {isFinalizing ? 'Finalizing...' : `✓ Finalize Action Chain (${stages.length} stages)`}
                        </button>
                        {(!chain.title || chain.title.trim() === '') ? (
                            <p className="text-xs text-yellow-300 mt-2 text-center font-medium">
                                ⚠️ Chain needs a title to finalize
                            </p>
                        ) : (
                            <p className="text-xs text-blue-200 mt-2 text-center">
                                This will complete and submit your action chain to the blockchain
                            </p>
                        )}
                    </div>
                )}

                {hasAddedStage && (
                    <div className="w-full max-w-xl bg-green-50 border-l-4 border-green-400 p-4 rounded">
                        <p className="text-sm text-green-700">
                            <strong>Success!</strong> You've continued this chain. The new stage has been added.
                        </p>
                    </div>
                )}

                {/* Render existing stages */}
                {stages.map((stage, index) => (
                    <StageItem
                        key={`${stage.TransactionID}-${index}`}
                        stage={stage}
                    />
                ))}

                {/* Add New Stage Card - Only show if not already added */}
                {!hasAddedStage && (
                    <div
                        onClick={() => {
                            if (!userWallet) {
                                toast.error('Please connect your wallet first');
                                return;
                            }
                            setIsModalOpen(true);
                        }}
                        className={`w-full max-w-xl bg-white rounded-xl border-2 border-dashed min-h-[280px] flex items-center justify-center group shadow-[6px_8px_16px_rgba(0,0,0,0.25)] transition-all ${userWallet
                                ? 'border-gray-400 hover:border-blue-500 cursor-pointer hover:shadow-[8px_12px_24px_rgba(0,0,0,0.3)]'
                                : 'border-gray-300 cursor-not-allowed opacity-60'
                            }`}
                    >
                        <div className="text-center">
                            <div className={`text-6xl transition-colors mb-2 ${userWallet
                                    ? 'text-gray-300 group-hover:text-blue-400'
                                    : 'text-gray-200'
                                }`}>
                                +
                            </div>
                            <p className={`transition-colors text-sm font-medium ${userWallet
                                    ? 'text-gray-400 group-hover:text-blue-500'
                                    : 'text-gray-300'
                                }`}>
                                Continue Chain - Add Stage
                            </p>
                            {!userWallet && (
                                <p className="text-xs text-red-500 mt-2">
                                    Wallet required
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {hasAddedStage && (
                    <div className="w-full max-w-xl text-center">
                        <button
                            onClick={onBack}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            ← View Other Received Chains
                        </button>
                    </div>
                )}
            </div>

            {/* Modal */}
            <CreateStageModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleAddStage}
                selectedTemplate={selectedTemplate}
                stageIndex={stages.length}
                isBroadcasting={isBroadcasting}
                chainTitle={chain.title || ''}
            />
        </>
    );
};

async function createContinuationToken(
    userWallet: WalletClient,
    data: Record<string, string>,
    lastStage: ActionChainStage,
    receiverPubKey: string | undefined
): Promise<{ txid: string; tx: Transaction } | null> {
    try {
        // Get the transactionID from the last stage to unlock
        const previousTx = await getTransactionByTxid(lastStage.TransactionID);

        if (!previousTx) {
            throw new Error("Failed to get previous transaction");
        }
        const fullPreviousTx = Transaction.fromBEEF(previousTx.outputs[0].beef as number[]);

        // Create scripts
        const unlockingScriptFrame = await unlockPushdrop(userWallet);
        const lockingScript = await createPushdrop(userWallet, data, receiverPubKey);

        // Create a preimage transaction to sign for the unlockingScript
        const preimage = new Transaction();
        preimage.addInput({
            sourceTransaction: fullPreviousTx,
            sourceOutputIndex: 0,
        });
        preimage.addOutput({
            satoshis: 1,
            lockingScript: lockingScript,
        });

        // Sign the frame with preimage to get unlockingScript
        const actualUnlockingScript = await unlockingScriptFrame.sign(preimage, 0);

        // Create the new pushdrop token action
        const pushDropAction = await userWallet.createAction({
            description: "Continue chain with new pushdrop token",
            inputBEEF: previousTx.outputs[0].beef,
            inputs: [
                {
                    inputDescription: "Previous pushdrop token",
                    unlockingScript: actualUnlockingScript.toHex(),
                    outpoint: `${lastStage.TransactionID}.0`
                }
            ],
            outputs: [
                {
                    outputDescription: "Pushdrop token",
                    lockingScript: lockingScript.toHex(),
                    satoshis: 1,
                }
            ],
            options: {
                randomizeOutputs: false,
            }
        });

        if (!pushDropAction || !pushDropAction.txid) {
            throw new Error("Failed to create pushdrop action");
        }

        const tx = Transaction.fromBEEF(pushDropAction.tx as number[]);

        return { txid: pushDropAction.txid, tx };
    } catch (error) {
        console.error("Error creating continuation token:", error);
        throw error;
    }
}
