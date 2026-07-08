'use client';

import { ActionChainStage } from "../../lib/mongo";
import { StageRow } from "./stageRow";
import { CreateStageModal } from "../stageActions/createStageModal";
import { CHAIN_TEMPLATES, ChainTemplate } from "../stageActions/createModalTemplates";
import { useWalletContext } from "../../context/walletContext";
import { Transaction, WalletClient, Utils, Hash, SymmetricKey } from "@bsv/sdk";
import { createPushdrop, unlockPushdrop } from "../../utils/pushdropHelpers";
import { broadcastTransaction, getTransactionByTxid } from "../../utils/overlayFunctions";
import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { Spinner } from "../ui/spinner";
import Link from "next/link";
import { PageHead } from "../common/page-head";
import { Stepper } from "../common/stepper";
import { CoachCard } from "../common/coach-card";
import { InfoTip } from "../common/info-tip";
import { Icon, type IconName } from "../common/icon";

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
    const [carryFields, setCarryFields] = useState<{ key: string; lastValue: string }[]>([]);
    const [productImageURL, setProductImageURL] = useState("");
    const [isUploadingProduct, setIsUploadingProduct] = useState(false);
    const [productUploadError, setProductUploadError] = useState<string | null>(null);
    // Set when a chain is finalized so the builder can point at its directory entry.
    const [finalizedChain, setFinalizedChain] = useState<{ id: string; title: string } | null>(null);
    const productFileRef = useRef<HTMLInputElement>(null);

    const { userWallet, userPubKey, initializeWallet, isConnecting } = useWalletContext();

    const handleProductFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setProductUploadError(null);
        setIsUploadingProduct(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            const uploaded = await res.json();
            if (!res.ok) throw new Error(uploaded.error || "Upload failed");
            setProductImageURL(uploaded.url);
        } catch (err) {
            setProductUploadError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setIsUploadingProduct(false);
            if (productFileRef.current) productFileRef.current.value = "";
        }
    };

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
                    setProductImageURL(data.actionChain.imageURL || '');

                    // Recover the canonical custom fields from the latest stage's
                    // on-chain data so carry-forward survives reloads / new sessions.
                    const loadedStages = data.actionChain.stages;
                    const latest = loadedStages?.[loadedStages.length - 1];
                    if (latest?.TransactionID) {
                        recoverCanonicalFields(latest.TransactionID).then((recovered) => {
                            if (recovered.length > 0) {
                                setCarryFields((prev) => (prev.length > 0 ? prev : recovered));
                            }
                        });
                    }
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
        setFinalizedChain(null);
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
        try {
            const tokenResult = await createPushdropToken(userWallet, data, isFirst, lastStage, receiverPubKey);

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

            // Save stage to database

            const response = await fetch('/api/stages/new-stage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userPubKey,
                    stage: newStage,
                    isFirst,
                    actionChainId: actionChainId,
                    chainTitle: isFirst ? chainTitle : undefined,
                    chainImageURL: isFirst ? (productImageURL || undefined) : undefined,
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
                setCarryFields([]);
                setProductImageURL("");
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

            // Remember the custom fields so later stages start with the same canonical set.
            const reserved = new Set(['title', 'imageURL', 'receiverPubKey']);
            const customEntries = Object.entries(data).filter(([k, v]) => !reserved.has(k) && k.trim() && v);
            if (customEntries.length > 0) {
                setCarryFields((prev) => {
                    const map = new Map(prev.map((f) => [f.key, f.lastValue]));
                    for (const [k, v] of customEntries) map.set(k, v);
                    return Array.from(map, ([key, lastValue]) => ({ key, lastValue }));
                });
            }
        } catch (error) {
            console.error('Error saving stage:', error);
            toast.error('An error occurred while saving the stage');
            throw error;
        } finally {
            setIsBroadcasting(false);
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
            toast.success(`Supply chain finalized with ${result.stagesCount} stages!`, {
                duration: 5000,
                icon: '✅',
            });
            setFinalizedChain({ id: actionChainId, title: chainTitle });

            // Reset state for new chain
            setStages([]);
            setActionChainId(null);
            setChainTitle('');
            setSelectedTemplate(null);
            setCarryFields([]);
            setProductImageURL("");
        } catch (error) {
            console.error('Error finalizing chain:', error);
            toast.error('Failed to finalize the action chain');
        } finally {
            setIsFinalizing(false);
        }
    };

    const connected = !!userWallet;
    const needsMoreStages = stages.length < MIN_STAGES;
    const titleMissing = !chainTitle || chainTitle.trim() === '';
    const stepperCurrent = !connected ? 0 : stages.length >= MIN_STAGES && actionChainId ? 3 : 1;

    // Show loading spinner while fetching current chain
    if (isLoading) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "64px 0" }}>
                <Spinner size="lg" />
                <p className="muted">Loading your supply chain…</p>
            </div>
        );
    }

    return (
        <>
            <PageHead
                eyebrow="New supply chain"
                eyebrowIcon="plus"
                title="Create a Dynamic Supply Chain"
                sub="A dynamic supply chain records a product's journey, one lifecycle stage at a time. Add at least two stages to tell its story, then finalize to make it a permanent, verifiable record."
            />

            <Stepper current={stepperCurrent} />

            {finalizedChain && (
                <div style={{ marginBottom: 22 }}>
                    <CoachCard icon="check-circle" tone="ok" title="Supply chain finalized">
                        <span>
                            &ldquo;{finalizedChain.title}&rdquo; is sealed and permanently verifiable. It now
                            appears in the public directory.
                        </span>
                        <div style={{ marginTop: 10 }}>
                            <Link href={`/directory/${finalizedChain.id}`} className="btn btn-ok btn-sm">
                                <Icon name="scroll-text" size={14} />
                                View it in the Directory
                            </Link>
                        </div>
                    </CoachCard>
                </div>
            )}

            {!connected && (
                <div className="gate" style={{ marginBottom: 22 }}>
                    <Icon name="key-round" size={20} style={{ color: "var(--warn)" }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>Connect your wallet to add stages</div>
                        <div className="muted" style={{ fontSize: 12.8, marginTop: 1 }}>
                            Recording a stage on-chain needs a connected wallet to sign it. You can still draft the title and pick a template.
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ flex: "0 0 auto" }}
                        onClick={() => initializeWallet()}
                        disabled={isConnecting}
                    >
                        {isConnecting ? <Spinner size="sm" /> : <Icon name="key-round" size={14} />}
                        {isConnecting ? "Connecting…" : "Connect wallet"}
                    </button>
                </div>
            )}

            {/* Guidance: stacked above the form */}
            <div className="grid gap-4" style={{ marginBottom: 22 }}>
                {!connected ? (
                    <CoachCard icon="key-round" tone="warn" title="Draft mode">
                        You can name the product and pick a template now. Connect a wallet when you&apos;re ready to record the first stage on-chain.
                    </CoachCard>
                ) : stages.length > 0 ? (
                    <CoachCard icon="check-circle" tone="ok" title="Stage recorded on-chain">
                        Your last stage was written to the blockchain. The previous stage&apos;s token was spent to create it, chaining them together.
                    </CoachCard>
                ) : (
                    <CoachCard icon="layers" title="Start your supply chain">
                        Add your first stage to begin. Each stage is recorded on-chain as part of this supply chain&apos;s history.
                    </CoachCard>
                )}

                <div className="card card-pad" style={{ padding: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 8, display: "flex", alignItems: "center", gap: 7 }}>
                        <Icon name="circle-help" size={16} style={{ color: "var(--accent)" }} />
                        Good to know
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 11 }}>
                        {([
                            ["layers", `A supply chain needs at least ${MIN_STAGES} stages and holds up to ${MAX_STAGES}.`],
                            ["key-round", "To hand off, add a receiver's wallet ID when creating a stage so only they can continue it."],
                            ["lock", "Leave the receiver blank to keep the stage for yourself."],
                        ] as [IconName, string][]).map(([ic, t]) => (
                            <li key={t} style={{ display: "flex", gap: 9 }}>
                                <Icon name={ic} size={15} style={{ color: "var(--ink-3)", marginTop: 1 }} />
                                <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.45 }}>{t}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Builder */}
            <div>
                    {/* title + templates + chain id */}
                    <div className="card card-pad" style={{ marginBottom: 22 }}>
                        <div className="field">
                            <label className="label" htmlFor="chainTitle">Product or batch name</label>
                            <input
                                id="chainTitle"
                                type="text"
                                className="input"
                                value={chainTitle}
                                onChange={(e) => setChainTitle(e.target.value)}
                                placeholder="Choose a template or enter your own title"
                            />
                            <span className="help">This becomes the title of your supply chain.</span>
                        </div>

                        {/* Product image (primary) */}
                        <div className="field" style={{ marginTop: 16 }}>
                            <label className="label">Product image <span className="opt">· optional</span></label>
                            <input
                                ref={productFileRef}
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={handleProductFileSelect}
                                style={{ display: "none" }}
                            />
                            {productImageURL ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 8, border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", background: "var(--surface-2)" }}>
                                    <div style={{ width: 72, height: 72, borderRadius: "var(--r-sm)", overflow: "hidden", flex: "0 0 auto", background: "var(--surface-3)", display: "grid", placeItems: "center" }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={productImageURL} alt="Product image" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    </div>
                                    <div style={{ flex: 1 }} />
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => productFileRef.current?.click()} disabled={isUploadingProduct}>Replace</button>
                                    <button type="button" className="icon-btn" onClick={() => setProductImageURL("")} title="Remove image" aria-label="Remove product image">
                                        <Icon name="x" size={15} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="dashed"
                                    onClick={() => productFileRef.current?.click()}
                                    disabled={isUploadingProduct}
                                    style={{ width: "100%", padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: isUploadingProduct ? "wait" : "pointer", color: "var(--ink-2)" }}
                                >
                                    {isUploadingProduct ? (
                                        <Spinner size="md" />
                                    ) : (
                                        <span className="empty-ico" style={{ width: 40, height: 40, marginBottom: 0 }}><Icon name="upload" size={20} /></span>
                                    )}
                                    <span style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{isUploadingProduct ? "Uploading…" : "Upload a product image"}</span>
                                    <span className="faint" style={{ fontSize: 11.5 }}>Shown on the chain. PNG, JPG, WebP, GIF or PDF, up to 10MB.</span>
                                </button>
                            )}
                            {productUploadError ? (
                                <span className="help" style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: 5 }}>
                                    <Icon name="alert-triangle" size={12} />{productUploadError}
                                </span>
                            ) : (
                                <span className="help">The main image for this supply chain.</span>
                            )}
                        </div>

                        <div style={{ marginTop: 16 }}>
                            <div className="help" style={{ marginBottom: 8 }}>Or start from a template:</div>
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
                                                    setChainTitle(template.title);
                                                    setSelectedTemplate(template);
                                                }
                                            }}
                                        >
                                            <Icon name="layers" size={13} />
                                            {template.title}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {chainTitle && (
                            <p className="help" style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
                                <Icon name="info" size={13} />
                                Template stages appear with pre-filled metadata fields when you create a stage.
                            </p>
                        )}

                        {actionChainId && (
                            <>
                                <hr className="divider" style={{ margin: "18px 0 14px" }} />
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                    <span className="label" style={{ fontWeight: 500 }}>
                                        <InfoTip
                                            title="Chain ID"
                                            body="The unique on-chain ID for this supply chain. Share it so anyone can look it up and verify it."
                                        >
                                            Chain ID
                                        </InfoTip>
                                    </span>
                                    <span className="txid" style={{ background: "var(--surface-2)", borderColor: "var(--line)" }}>
                                        <Icon name="link" size={13} style={{ color: "var(--ink-3)" }} />
                                        <Link
                                            href={`/directory/${actionChainId}`}
                                            className="v"
                                            style={{ color: "inherit" }}
                                            title={actionChainId}
                                        >
                                            {actionChainId}
                                        </Link>
                                        <button
                                            type="button"
                                            className="copybtn"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                navigator.clipboard.writeText(actionChainId);
                                                toast.success('Chain ID copied to clipboard!', { duration: 2000 });
                                            }}
                                            title="Copy Chain ID"
                                            aria-label="Copy Chain ID"
                                        >
                                            <Icon name="copy" size={13} />
                                        </button>
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* needs more stages */}
                    {needsMoreStages && stages.length > 0 && (
                        <div style={{ marginBottom: 22 }}>
                            <CoachCard icon="alert-triangle" tone="warn" title="Add one more stage">
                                A supply chain needs at least {MIN_STAGES} stages. You have {stages.length}/{MIN_STAGES}.
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
                            />
                        ))}

                        {/* add stage / max reached */}
                        {stages.length < MAX_STAGES ? (
                            <div className="tl-row">
                                <div className="tl-rail">
                                    <div className="tl-line top" style={{ background: stages.length === 0 ? "transparent" : undefined }} />
                                    <div className="tl-dot ghost"><Icon name={connected ? "plus" : "lock"} size={14} /></div>
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
                                            padding: "22px 16px",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: 6,
                                            cursor: connected ? "pointer" : "not-allowed",
                                            color: "var(--ink-2)",
                                            opacity: connected ? 1 : 0.6,
                                        }}
                                    >
                                        <span className="empty-ico" style={{ width: 38, height: 38, marginBottom: 0 }}>
                                            <Icon name={connected ? "plus" : "lock"} size={20} />
                                        </span>
                                        <span style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
                                            {connected ? "Add a stage" : "Connect wallet to add stages"}
                                        </span>
                                        <span className="faint" style={{ fontSize: 12 }}>
                                            {stages.length} of {MAX_STAGES} stages used
                                        </span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="tl-row">
                                <div className="tl-rail">
                                    <div className="tl-line top" />
                                    <div className="tl-dot ghost"><Icon name="check" size={14} /></div>
                                </div>
                                <div className="tl-body">
                                    <div className="dashed" style={{ padding: "22px 16px", textAlign: "center" }}>
                                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>Maximum stages reached</div>
                                        <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>{stages.length} of {MAX_STAGES} stages used</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* finalize */}
                    {stages.length >= MIN_STAGES && actionChainId && (
                        <div className="card card-pad" style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 14.5 }}>Ready to finalize this supply chain?</div>
                                <div className="muted" style={{ fontSize: 12.8, marginTop: 2 }}>
                                    Finalizing makes the chain read-only and permanently verifiable. You can&apos;t add stages after.
                                </div>
                                {titleMissing ? (
                                    <div style={{ fontSize: 12, marginTop: 6, color: "var(--warn)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                                        <Icon name="alert-triangle" size={13} />
                                        Add a product name above to finalize.
                                    </div>
                                ) : (
                                    <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>
                                        This completes and submits your supply chain to the blockchain.
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
                carryFields={carryFields}
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
                    acceptDelayedBroadcast: false,
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
            const sourceTransaction = Transaction.fromBEEF(previousTx.outputs[0].beef as number[]);

            // Create locking script for the new output and unlocking template for the input
            const unlockTemplate = await unlockPushdrop(userWallet);
            const lockingScript = await createPushdrop(userWallet, data, receiverPubKey);

            // STEP 1: Create Action with estimated unlocking script length
            const unlockingScriptLength = await unlockTemplate.estimateLength();

            const actionRes = await userWallet.createAction({
                description: "Create next pushdrop token",
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
            console.error("Error creating pushdrop token:", error);
            throw error;
        }
    }

    // If neither params were valid or provided return null
    return null;
}

// Decrypt a stage's on-chain data to recover its custom fields (key + last
// value), so the canonical-field carry-forward survives reloads / new sessions.
// Best-effort: returns [] on any failure. Mirrors the decrypt path used by the
// stage-details view.
async function recoverCanonicalFields(transactionId: string): Promise<{ key: string; lastValue: string }[]> {
    try {
        const receiverResponse = await fetch(`/api/chains/receiver?transactionId=${encodeURIComponent(transactionId)}`);
        const receiverData = await receiverResponse.json();
        const receiverKey = receiverData.receiver || "self";

        const overlayData = await getTransactionByTxid(transactionId);
        if (!overlayData || !overlayData.outputs || !overlayData.outputs[0] || !overlayData.outputs[0].beef) {
            return [];
        }

        const transaction = Transaction.fromBEEF(overlayData.outputs[0].beef);
        const encryptedData = transaction.outputs[0].lockingScript.chunks[0].data as number[];

        const tryDecrypt = (k: string): Record<string, unknown> | null => {
            try {
                const keyBytes = Hash.sha256(Utils.toArray(k, 'utf8'));
                const key = new SymmetricKey(keyBytes);
                const decrypted = key.decrypt(encryptedData) as number[];
                return JSON.parse(Utils.toUTF8(decrypted));
            } catch {
                return null;
            }
        };

        const obj = tryDecrypt(receiverKey) || (receiverKey !== "self" ? tryDecrypt("self") : null);
        if (!obj) return [];

        const reserved = new Set(['title', 'imageURL', 'receiverPubKey']);
        return Object.entries(obj)
            .filter(([k, v]) => !reserved.has(k) && k.trim() && v != null && String(v).trim())
            .map(([key, v]) => ({ key, lastValue: String(v) }));
    } catch {
        return [];
    }
}
