'use client';

import { ActionChainStage } from "../../lib/mongo";
import { StageItem } from "./stageItem";
import { CreateStageModal } from "../stageActions/createStageModal";
import { CHAIN_TEMPLATES, ChainTemplate } from "../stageActions/createModalTemplates";
import { useWalletContext } from "../../context/walletContext";
import { Transaction, WalletClient } from "@bsv/sdk";
import { createPushdrop, unlockPushdrop } from "../../utils/pushdropHelpers";
import { broadcastTransaction, getTransactionByTxid } from "../../utils/overlayFunctions";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Spinner } from "../ui/spinner";

const MAX_STAGES = 8;
const MIN_STAGES = 2;

export const StagesColumn = (props: { stages?: ActionChainStage[] }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stages, setStages] = useState<ActionChainStage[]>(props.stages || []);
    const [chainTitle, setChainTitle] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState<ChainTemplate | null>(null);
    const [actionChainId, setActionChainId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    const { userWallet, userPubKey } = useWalletContext();

    // Fetch current ActionChain on mount
    useEffect(() => {
        const fetchCurrentChain = async () => {
            if (!userPubKey) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch(`/api/stages/current?userId=${encodeURIComponent(userPubKey)}`);
                const data = await response.json();

                if (data.hasActiveChain && data.actionChain) {
                    setActionChainId(data.actionChain._id);
                    setStages(data.actionChain.stages);
                    setChainTitle(data.actionChain.title || '');
                }
            } catch (error) {
                console.error('Error fetching current chain:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCurrentChain();
    }, [userPubKey]);

    const handleAddStage = async (data: Record<string, string>) => {
        const isFirst = stages.length === 0;
        let lastStage: ActionChainStage | null = null;
        if (!isFirst) {
            lastStage = stages[stages.length - 1];
        }

        if (!userWallet) {
            toast.error('Wallet not initialized');
            throw new Error("Wallet not initialized");
        }

        if (!userPubKey) {
            toast.error('User public key not found');
            throw new Error("User public key not found");
        }

        // Extract receiver if provided
        const receiverPubKey = data.receiverPubKey;
        
        // TransactionID will come from the wallet create pushdrop
        setIsBroadcasting(true);
        const result = await createPushdropToken(userWallet, data, isFirst, lastStage, receiverPubKey);

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

        // Save stage to database
        try {
            const response = await fetch('/api/stages/new-stage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userPubKey,
                    stage: newStage,
                    isFirst,
                    actionChainId: actionChainId,
                    chainTitle: isFirst ? chainTitle : undefined,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                toast.error(result.error || 'Failed to save stage');
                throw new Error(result.error || 'Failed to save stage');
            }

            console.log('Stage saved successfully:', result);
            
            // Get the actionChainId for broadcasting
            const currentActionChainId = result.actionChainId || actionChainId;
            
            // Broadcast transaction with chainId in background
            if (currentActionChainId && tx) {
                (async () => {
                    try {
                        const response = await broadcastTransaction(tx, currentActionChainId);
                        console.log("Broadcast response: ", response);
                        toast.success("Transaction broadcasted successfully");
                        setIsBroadcasting(false);
                    } catch (error) {
                        console.error("Broadcast failed:", error);
                        toast.error("Warning: Transaction created but broadcast failed");
                        setIsBroadcasting(false);
                    }
                })();
            } else {
                setIsBroadcasting(false);
            }
            
            // If a receiver was specified, send it to them and reset the page
            if (receiverPubKey && currentActionChainId) {
                try {
                    const transferResponse = await fetch('/api/chains/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            actionChainId: currentActionChainId,
                            senderPubKey: userPubKey,
                            receiverPubKey: receiverPubKey,
                        }),
                    });

                    if (transferResponse.ok) {
                        toast.success(`Stage "${data.title}" sent to receiver successfully!`, {
                            icon: '📤',
                            duration: 5000,
                        });
                    } else {
                        toast.error('Failed to create transfer record');
                        console.warn('Failed to create transfer record, but stage was created');
                    }
                } catch (error) {
                    console.error('Error creating transfer record:', error);
                    toast.error('Failed to send stage to receiver');
                }
                
                // Reset the page to start fresh since this chain is now sent to someone else
                setStages([]);
                setActionChainId(null);
                setChainTitle('');
                setSelectedTemplate(null);
                return; // Don't continue with the rest of the logic
            }
            
            // If no receiver, this is for the user themselves
            // Save the actionChainId and create a lock
            if (isFirst) {
                setActionChainId(result.actionChainId);
                
                const lockResponse = await fetch('/api/lock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userPubKey,
                        actionChainId: result.actionChainId,
                    }),
                });

                if (!lockResponse.ok) {
                    toast.error('Failed to create lock for action chain');
                }
            }
            
            toast.success(`Stage "${data.title}" added successfully!`);
            
            // Add new stage to the BOTTOM of the array (append)
            setStages([...stages, newStage]);
        } catch (error) {
            console.error('Error saving stage:', error);
            toast.error('An error occurred while saving the stage');
            throw error;
        }
    };

    const handleFinalizeChain = async () => {
        if (!userPubKey || !actionChainId) {
            console.error('Missing userPubKey or actionChainId');
            toast.error('Missing user credentials or chain ID');
            return;
        }

        if (stages.length < MIN_STAGES) {
            toast.error(`You need at least ${MIN_STAGES} stages to finalize the chain`);
            return;
        }

        if (!chainTitle || chainTitle.trim() === '') {
            toast.error('Please add an Action Chain Title before finalizing');
            return;
        }

        setIsFinalizing(true);
        try {
            const response = await fetch('/api/stages/finalize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userPubKey,
                    actionChainId,
                    chainTitle,
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
            
            // Reset state for new chain
            setStages([]);
            setActionChainId(null);
            setChainTitle('');
            setSelectedTemplate(null);
        } catch (error) {
            console.error('Error finalizing chain:', error);
            toast.error('Failed to finalize the action chain');
        } finally {
            setIsFinalizing(false);
        }
    };

    const isMaxReached = stages.length >= MAX_STAGES;
    const needsMoreStages = stages.length < MIN_STAGES;

    // Show loading spinner while fetching current chain
    if (isLoading) {
        return (
            <div className="w-full flex flex-col items-center gap-4 py-8">
                <Spinner size="lg" />
                <p className="text-white">Loading your action chain...</p>
            </div>
        );
    }

    return (
        <>
            <div className="w-full flex flex-col items-center gap-8 py-8">
                {/* Chain Title Input */}
                <div className="w-full max-w-xl">
                    <label htmlFor="chainTitle" className="block text-sm font-medium text-white mb-2">
                        Action Chain Title
                    </label>
                    <input
                        id="chainTitle"
                        type="text"
                        value={chainTitle}
                        onChange={(e) => setChainTitle(e.target.value)}
                        placeholder="Choose a template or enter your own title"
                        className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition text-black font-medium bg-white shadow-lg"
                    />

                    {/* Template Selection Buttons */}
                    <div className="mt-3">
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
                                            // Select the template and set the title
                                            setChainTitle(template.title);
                                            setSelectedTemplate(template);
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
                    </div>

                    {chainTitle && (
                        <p className="text-xs text-blue-200 mt-3">
                            💡 Tip: Template stages will appear with pre-filled metadata fields when creating stages
                        </p>
                    )}
                </div>

                {/* Info message */}
                {needsMoreStages && stages.length > 0 && (
                    <div className="w-full max-w-xl bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                        <p className="text-sm text-yellow-700">
                            <strong>Note:</strong> You need at least {MIN_STAGES} stages. Currently: {stages.length}/{MIN_STAGES}
                        </p>
                    </div>
                )}

                {/* Finalize Button */}
                {stages.length >= MIN_STAGES && actionChainId && (
                    <div className="w-full max-w-xl">
                        <button
                            onClick={handleFinalizeChain}
                            disabled={isFinalizing || !chainTitle || chainTitle.trim() === ''}
                            className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:opacity-60 text-white rounded-lg font-bold text-lg transition-colors shadow-lg hover:shadow-xl disabled:cursor-not-allowed hover:cursor-pointer flex items-center justify-center gap-3"
                        >
                            {isFinalizing && <Spinner size="sm" />}
                            {isFinalizing ? 'Finalizing...' : `✓ Finalize Action Chain (${stages.length} stages)`}
                        </button>
                        {(!chainTitle || chainTitle.trim() === '') ? (
                            <p className="text-xs text-yellow-300 mt-2 text-center font-medium">
                                ⚠️ Please add an Action Chain Title above to finalize
                            </p>
                        ) : (
                            <p className="text-xs text-blue-200 mt-2 text-center">
                                This will complete and submit your action chain to the blockchain
                            </p>
                        )}
                    </div>
                )}

                {/* Render existing stages */}
                {stages.map((stage, index) => (
                    <StageItem 
                        key={`${stage.TransactionID}-${index}`} 
                        stage={stage}
                    />
                ))}

                {/* Add New Stage Card */}
                {stages.length < MAX_STAGES ? (
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
                                Add Stage
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {stages.length}/{MAX_STAGES} stages
                            </p>
                            {!userWallet && (
                                <p className="text-xs text-red-500 mt-2">
                                    Wallet required
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-xl bg-gray-50 rounded-xl border-2 border-gray-300 min-h-[280px] flex items-center justify-center shadow-[6px_8px_16px_rgba(0,0,0,0.25)]">
                        <div className="text-center">
                            <p className="text-gray-500 font-medium">
                                Maximum stages reached
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {stages.length}/{MAX_STAGES} stages
                            </p>
                        </div>
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
                chainTitle={chainTitle}
            />
        </>
    );
};

async function createPushdropToken(
    userWallet: WalletClient, 
    data: Record<string, string>, 
    isFirst: boolean, 
    lastStage: ActionChainStage | null,
    receiverPubKey: string | undefined
): Promise<{ txid: string; tx: Transaction } | null> {
    // If it's the first stage, we only have to create an output
    if (isFirst) {
        try {
            const lockingScript = await createPushdrop(userWallet, data, receiverPubKey);
            const pushDropAction = await userWallet.createAction({
                description: "Create pushdrop token",
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
            console.error("Error creating pushdrop token:", error);
            throw error;
        }
    }

    // If this is not the first, we take the information from the last stage to unlock and create a new stage
    if (!isFirst && lastStage) {
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
                description: "Create next pushdrop token",
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
            console.error("Error creating pushdrop token:", error);
            throw error;
        }
    }
    
    // If neither params were valid or provided return null
    return null;
}