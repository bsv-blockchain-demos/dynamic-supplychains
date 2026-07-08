'use client';

import { ActionChainStage } from "../../lib/mongo";
import { StageRow } from "../renderStages/stageRow";
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
import { PageHead } from "../common/page-head";
import { CoachCard } from "../common/coach-card";
import { InfoTip } from "../common/info-tip";
import { Icon } from "../common/icon";

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
    const [lastStageForwarded, setLastStageForwarded] = useState(false);

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
        try {
            const tokenResult = await createContinuationToken(userWallet, data, lastStage, newReceiverPubKey, chain.senderPubKey);

            if (!tokenResult || !tokenResult.txid) {
                setIsBroadcasting(false);
                toast.error('Failed to create pushdrop token');
                throw new Error("Failed to create pushdrop token");
            }

            const { txid, tx } = tokenResult;

            // Create new stage object
            const newStage: ActionChainStage = {
                title: data.title,
                imageURL: data.imageURL,
                Timestamp: new Date(),
                TransactionID: txid,
            };

            // Save stage to the chain via the continue API
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
            // The stage you just added is forwarded (locked to a receiver) only
            // when you specified one; otherwise you still hold it yourself.
            setLastStageForwarded(Boolean(newReceiverPubKey));
        } catch (error) {
            console.error('Error adding stage:', error);
            toast.error('An error occurred while adding the stage');
            throw error;
        } finally {
            setIsBroadcasting(false);
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

    const titleMissing = !chain.title || chain.title.trim() === '';

    return (
        <>
            <div className="mx-auto max-w-[720px]">
                <button
                    type="button"
                    onClick={onBack}
                    className="btn btn-ghost btn-sm"
                    style={{ marginBottom: 16, paddingLeft: 8 }}
                >
                    <Icon name="arrow-right" size={15} style={{ transform: "rotate(180deg)" }} />
                    Back to inbox
                </button>

                <PageHead
                    eyebrow="Continuing a chain"
                    eyebrowIcon="corner-down-right"
                    title={chain.title || "Untitled chain"}
                    sub="You hold the latest stage. Add yours to continue the chain, or forward it on by locking the next stage to another wallet."
                />

                {/* chain info */}
                <div className="card card-pad" style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                        <span className="label" style={{ fontWeight: 500 }}>
                            <InfoTip title="Chain ID" body="The unique on-chain ID for this supply chain. Share it so anyone can look the chain up and verify it.">
                                Chain ID
                            </InfoTip>
                        </span>
                        <span className="txid" style={{ background: "var(--surface-2)", borderColor: "var(--line)" }}>
                            <Icon name="link" size={13} style={{ color: "var(--ink-3)" }} />
                            <Link href={`/directory/${chain.actionChainId}`} className="v" style={{ color: "inherit" }} title={chain.actionChainId}>
                                {chain.actionChainId}
                            </Link>
                            <button
                                type="button"
                                className="copybtn"
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigator.clipboard.writeText(chain.actionChainId);
                                    toast.success('Chain ID copied to clipboard!', { duration: 2000 });
                                }}
                                title="Copy Chain ID"
                                aria-label="Copy Chain ID"
                            >
                                <Icon name="copy" size={13} />
                            </button>
                        </span>
                    </div>
                    <dl className="kv">
                        <dt>Sent by</dt>
                        <dd className="mono" style={{ wordBreak: "break-all" }}>
                            {chain.senderPubKey.slice(0, 12)}…{chain.senderPubKey.slice(-8)}
                        </dd>
                        <dt>Current stages</dt>
                        <dd>{stages.length}</dd>
                        <dt>Received</dt>
                        <dd>{new Date(chain.sentAt).toLocaleString()}</dd>
                    </dl>
                </div>

                {/* continue vs forward coach (before adding) */}
                {!hasAddedStage && (
                    <div style={{ marginBottom: 16 }}>
                        <CoachCard icon="unlock" tone="ok" title="You can edit this chain">
                            This stage was locked to your wallet and is now unlocked for you. Add the next stage below. Leave the recipient blank to keep the chain, or set one to forward custody on.
                        </CoachCard>
                    </div>
                )}

                {/* template chips (before adding) */}
                {!hasAddedStage && (
                    <div style={{ marginBottom: 18 }}>
                        <div className="help" style={{ marginBottom: 8 }}>Start your stage from a template:</div>
                        <div className="chips">
                            {CHAIN_TEMPLATES.map((template) => {
                                const isActive = selectedTemplate?.title === template.title;
                                return (
                                    <button
                                        key={template.title}
                                        type="button"
                                        className={`chip${isActive ? " is-active" : ""}`}
                                        onClick={() => {
                                            if (selectedTemplate?.title === template.title) {
                                                setSelectedTemplate(null);
                                            } else {
                                                setSelectedTemplate(template);
                                                toast.success(`${template.title} template selected!`);
                                            }
                                        }}
                                    >
                                        <Icon name="layers" size={13} />
                                        {template.title}
                                    </button>
                                );
                            })}
                        </div>
                        {selectedTemplate && (
                            <p className="help" style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
                                <Icon name="info" size={13} />
                                Template stages appear with pre-filled metadata fields when you create a stage.
                            </p>
                        )}
                    </div>
                )}

                {/* success (after adding) */}
                {hasAddedStage && (
                    <div style={{ marginBottom: 16 }}>
                        <CoachCard icon="check-circle" tone="ok" title="Stage added">
                            You&apos;ve continued this chain. The new stage has been recorded on-chain.
                        </CoachCard>
                    </div>
                )}

                {/* needs more (after adding, < 2) */}
                {hasAddedStage && stages.length < 2 && (
                    <div style={{ marginBottom: 16 }}>
                        <CoachCard icon="alert-triangle" tone="warn" title="Add one more stage">
                            A supply chain needs at least 2 stages. You have {stages.length}/2.
                        </CoachCard>
                    </div>
                )}

                {/* timeline */}
                <div className="timeline">
                    {stages.map((stage, index) => (
                        <StageRow
                            key={`${stage.TransactionID}-${index}`}
                            stage={stage}
                            index={index}
                            isFirst={index === 0}
                            lock={index === stages.length - 1 ? (lastStageForwarded ? "sent" : "self") : "sent"}
                        />
                    ))}

                    {/* add-stage row (before adding) */}
                    {!hasAddedStage && (
                        <div className="tl-row">
                            <div className="tl-rail">
                                <div className="tl-line top" />
                                <div className="tl-dot ghost"><Icon name={userWallet ? "plus" : "lock"} size={14} /></div>
                                <div className="tl-line faded" style={{ minHeight: 14 }} />
                            </div>
                            <div className="tl-body">
                                <button
                                    type="button"
                                    className="dashed"
                                    onClick={() => {
                                        if (!userWallet) {
                                            toast.error('Please connect your wallet first');
                                            return;
                                        }
                                        setIsModalOpen(true);
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "20px 16px",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: 5,
                                        cursor: userWallet ? "pointer" : "not-allowed",
                                        color: "var(--ink-2)",
                                        opacity: userWallet ? 1 : 0.6,
                                    }}
                                >
                                    <span className="empty-ico" style={{ width: 36, height: 36, marginBottom: 0 }}>
                                        <Icon name={userWallet ? "plus" : "lock"} size={18} />
                                    </span>
                                    <span style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}>
                                        {userWallet ? "Add your stage" : "Connect wallet to add your stage"}
                                    </span>
                                    <span className="faint" style={{ fontSize: 11.5 }}>{stages.length} of 8 stages</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* finalize (after adding, >= 2) */}
                {hasAddedStage && stages.length >= 2 && (
                    <div className="card card-pad" style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14.5 }}>Ready to seal this supply chain?</div>
                            <div className="muted" style={{ fontSize: 12.8, marginTop: 2 }}>
                                Finalizing makes the chain read-only and permanently verifiable.
                            </div>
                            {titleMissing ? (
                                <div style={{ fontSize: 12, marginTop: 6, color: "var(--warn)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                                    <Icon name="alert-triangle" size={13} />
                                    This chain needs a title to finalize.
                                </div>
                            ) : (
                                <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>
                                    This completes and submits the supply chain to the blockchain.
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleFinalizeChain}
                            disabled={isFinalizing || titleMissing}
                            className={`btn btn-ok btn-lg${isFinalizing || titleMissing ? " is-disabled" : ""}`}
                            style={{ flex: "0 0 auto" }}
                        >
                            {isFinalizing ? <Spinner size="sm" /> : <Icon name="check-circle" size={17} />}
                            {isFinalizing ? "Finalizing…" : `Finalize (${stages.length} stages)`}
                        </button>
                    </div>
                )}

                {/* view others (after adding) */}
                {hasAddedStage && (
                    <div style={{ marginTop: 16, textAlign: "center" }}>
                        <button type="button" className="btn btn-outline" onClick={onBack}>
                            <Icon name="inbox" size={15} />
                            View other received chains
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
    receiverPubKey: string | undefined,
    senderPubKey: string
): Promise<{ txid: string; tx: Transaction } | null> {
    try {
        // Get the transactionID from the last stage to unlock
        const previousTx = await getTransactionByTxid(lastStage.TransactionID);

        if (!previousTx) {
            throw new Error("Failed to get previous transaction");
        }
        const sourceTransaction = Transaction.fromBEEF(previousTx.outputs[0].beef as number[]);

        // Create locking script for the new output and unlocking template for the input
        const unlockTemplate = await unlockPushdrop(userWallet, senderPubKey);
        const lockingScript = await createPushdrop(userWallet, data, receiverPubKey);

        // STEP 1: Create Action with estimated unlocking script length
        const unlockingScriptLength = await unlockTemplate.estimateLength();

        const actionRes = await userWallet.createAction({
            description: "Continue chain with new pushdrop token",
            inputBEEF: previousTx.outputs[0].beef,
            inputs: [
                {
                    inputDescription: "Previous pushdrop token",
                    unlockingScriptLength: unlockingScriptLength,
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
                acceptDelayedBroadcast: false,
            }
        });

        if (!actionRes.signableTransaction) {
            throw new Error("Failed to create signable transaction");
        }

        // STEP 2: Sign - Generate actual unlocking scripts using BSV SDK
        const reference = actionRes.signableTransaction.reference;
        const txToSign = Transaction.fromBEEF(actionRes.signableTransaction.tx);

        // Attach template and source transaction to input
        txToSign.inputs[0].unlockingScriptTemplate = unlockTemplate;
        txToSign.inputs[0].sourceTransaction = sourceTransaction;

        // Generate actual unlocking scripts
        await txToSign.sign();

        const unlockingScript = txToSign.inputs[0].unlockingScript;
        if (!unlockingScript) {
            throw new Error('Missing unlocking script after signing');
        }

        // STEP 3: Sign Action - Finalize with actual unlocking scripts
        const action = await userWallet.signAction({
            reference: reference,
            spends: {
                '0': { unlockingScript: unlockingScript.toHex() }
            }
        });

        if (!action.tx) {
            throw new Error('Failed to sign action');
        }

        if (!action.txid) {
            throw new Error("Failed to get transaction ID");
        }

        const tx = Transaction.fromAtomicBEEF(action.tx);

        return { txid: action.txid, tx };
    } catch (error) {
        console.error("Error creating continuation token:", error);
        throw error;
    }
}
