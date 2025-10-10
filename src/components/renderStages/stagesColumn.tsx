'use client';

import { ActionChainStage } from "../../lib/mongo";
import { StageItem } from "./stageItem";
import { CreateStageModal } from "../stageActions/createStageModal";
import { CHAIN_TEMPLATES, ChainTemplate } from "../stageActions/createModalTemplates";
import { useWalletContext } from "../../context/walletContext";
import { Transaction, WalletClient } from "@bsv/sdk";
import { createPushdrop, unlockPushdrop } from "../../utils/pushdropHelpers";
import { broadcastTransaction, getTransactionByTxid } from "../../utils/overlayFunctions";
import { useState } from "react";

const MAX_STAGES = 8;
const MIN_STAGES = 2;

export const StagesColumn = (props: { stages?: ActionChainStage[] }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stages, setStages] = useState<ActionChainStage[]>(props.stages || []);
    const [chainTitle, setChainTitle] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState<ChainTemplate | null>(null);

    const { userWallet } = useWalletContext();

    const handleAddStage = async (data: Record<string, string>) => {
        const isFirst = stages.length === 0;
        let lastStage: ActionChainStage | null = null;
        if (!isFirst) {
            lastStage = stages[stages.length - 1];
        }

        if (!userWallet) {
            throw new Error("Wallet not initialized");
        }

        // TransactionID will come from the wallet create pushdrop
        const txid = await createPushdropToken(userWallet, data, isFirst, lastStage);

        if (!txid) {
            throw new Error("Failed to create pushdrop token");
        }

        // Create new stage object
        const newStage: ActionChainStage = {
            title: data.title,
            Timestamp: new Date(),
            TransactionID: txid,
        };

        // TODO: Implement API call to save stage to database
        // if isFirst is true API route will create the new ActionChain item with the first stage
        // if isFirst is false API route will add the new stage to the existing ActionChain item
        console.log("Creating stage:", newStage);

        // After creating the first stage, put a lock on the user with locksCollection so that the user can only update this ActionChain until fully submitted

        // Add new stage to the BOTTOM of the array (append)
        setStages([...stages, newStage]);
    };

    // TODO: New function that submits/concludes the ActionChain

    const isMaxReached = stages.length >= MAX_STAGES;
    const needsMoreStages = stages.length < MIN_STAGES;

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

                {/* Render existing stages */}
                {stages.map((stage, index) => (
                    <StageItem key={`${stage.TransactionID}-${index}`} stage={stage} />
                ))}

                {/* Add new stage card */}
                {!isMaxReached ? (
                    <div
                        onClick={() => setIsModalOpen(true)}
                        className="w-full max-w-xl bg-white rounded-xl border-2 border-dashed border-gray-400 hover:border-blue-500 transition-all cursor-pointer min-h-[280px] flex items-center justify-center group shadow-[6px_8px_16px_rgba(0,0,0,0.25)] hover:shadow-[8px_12px_24px_rgba(0,0,0,0.3)]"
                    >
                        <div className="text-center">
                            <div className="text-6xl text-gray-300 group-hover:text-blue-400 transition-colors mb-2">
                                +
                            </div>
                            <p className="text-gray-400 group-hover:text-blue-500 transition-colors text-sm font-medium">
                                Add Stage
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {stages.length}/{MAX_STAGES} stages
                            </p>
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
            />
        </>
    );
};

async function createPushdropToken(userWallet: WalletClient, data: Record<string, string>, isFirst: boolean, lastStage: ActionChainStage | null) {
    // If it's the first stage, we only have to create an output
    if (isFirst) {
        try {
            const lockingScript = await createPushdrop(userWallet, data);
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

            if (!pushDropAction) {
                throw new Error("Failed to create pushdrop action");
            }

            const tx = Transaction.fromBEEF(pushDropAction.tx as number[]);

            const broadcastResponse = await broadcastTransaction(tx);
            console.log("Broadcast response: ", broadcastResponse);
            return pushDropAction.txid;
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
            const lockingScript = await createPushdrop(userWallet, data);

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

            if (!pushDropAction) {
                throw new Error("Failed to create pushdrop action");
            }

            const tx = Transaction.fromBEEF(pushDropAction.tx as number[]);

            const broadcastResponse = await broadcastTransaction(tx);
            console.log("Broadcast response: ", broadcastResponse);
            return pushDropAction.txid;
        } catch (error) {
            console.error("Error creating pushdrop token:", error);
            throw error;
        }
    }
    
    // If neither params were valid or provided return null
    return null;
}