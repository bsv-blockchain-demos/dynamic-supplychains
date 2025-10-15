'use client';

import { ActionChainStage } from "../../lib/mongo";
import { StageItem } from "../renderStages/stageItem";
import { CreateStageModal } from "../stageActions/createStageModal";
import { useWalletContext } from "../../context/walletContext";
import { Transaction, WalletClient } from "@bsv/sdk";
import { createPushdrop, unlockPushdrop } from "../../utils/pushdropHelpers";
import { broadcastTransaction, getTransactionByTxid } from "../../utils/overlayFunctions";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { Spinner } from "../ui/spinner";

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
        
        // Create the transaction for the new stage
        setIsBroadcasting(true);
        const txid = await createContinuationToken(userWallet, data, lastStage, newReceiverPubKey, setIsBroadcasting);

        if (!txid) {
            setIsBroadcasting(false);
            toast.error('Failed to create pushdrop token');
            throw new Error("Failed to create pushdrop token");
        }

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
                <div className="w-full max-w-xl bg-white rounded-xl p-6 shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        {chain.title || 'Untitled Chain'}
                    </h2>
                    <div className="space-y-2 text-sm text-gray-600">
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
                        className={`w-full max-w-xl bg-white rounded-xl border-2 border-dashed min-h-[280px] flex items-center justify-center group shadow-[6px_8px_16px_rgba(0,0,0,0.25)] transition-all ${
                            userWallet
                                ? 'border-gray-400 hover:border-blue-500 cursor-pointer hover:shadow-[8px_12px_24px_rgba(0,0,0,0.3)]'
                                : 'border-gray-300 cursor-not-allowed opacity-60'
                        }`}
                    >
                        <div className="text-center">
                            <div className={`text-6xl transition-colors mb-2 ${
                                userWallet
                                    ? 'text-gray-300 group-hover:text-blue-400'
                                    : 'text-gray-200'
                            }`}>
                                +
                            </div>
                            <p className={`transition-colors text-sm font-medium ${
                                userWallet
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
                        <p className="text-white text-sm mb-4">
                            You can now send this chain to someone else or view it in your completed chains.
                        </p>
                        <button
                            onClick={onBack}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            View Other Received Chains
                        </button>
                    </div>
                )}
            </div>

            {/* Modal */}
            <CreateStageModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleAddStage}
                selectedTemplate={null}
                stageIndex={stages.length}
                isBroadcasting={isBroadcasting}
            />
        </>
    );
};

async function createContinuationToken(
    userWallet: WalletClient, 
    data: Record<string, string>, 
    lastStage: ActionChainStage,
    receiverPubKey: string | undefined,
    setIsBroadcasting: (value: boolean) => void
) {
    try {
        // Get the transactionID from the last stage to unlock
        const previousTx = await getTransactionByTxid(lastStage.TransactionID);

        if (!previousTx) {
            throw new Error("Failed to get previous transaction");
        }
        const fullPreviousTx = Transaction.fromBEEF(previousTx.outputs[0].beef as number[]);

        // Create scripts
        const unlockingScriptFrame = await unlockPushdrop(userWallet, receiverPubKey);
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

        if (!pushDropAction) {
            throw new Error("Failed to create pushdrop action");
        }

        const tx = Transaction.fromBEEF(pushDropAction.tx as number[]);

        // Broadcast in background without blocking
        (async () => {
            try {
                const response = await broadcastTransaction(tx);
                console.log("Broadcast response: ", response);
                toast.success("Transaction broadcasted successfully");
                setIsBroadcasting(false);
            } catch (error) {
                console.error("Broadcast failed:", error);
                toast.error("Warning: Transaction created but broadcast failed");
                setIsBroadcasting(false);
            }
        })();

        return pushDropAction.txid;
    } catch (error) {
        console.error("Error creating continuation token:", error);
        throw error;
    }
}
