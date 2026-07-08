'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionChainStage } from "../../lib/mongo";
import { StageRow } from "../renderStages/stageRow";
import { Spinner } from "../ui/spinner";
import { toast } from "react-hot-toast";
import { CoachCard } from "../common/coach-card";
import { InfoTip } from "../common/info-tip";
import { Icon } from "../common/icon";
import { useWalletContext } from "../../context/walletContext";

interface ActionChainDetail {
    _id: string;
    userId: string;
    title?: string;
    imageURL?: string;
    stages: ActionChainStage[];
    createdAt?: Date;
    updatedAt?: Date;
    finalized?: boolean;
    finalizedAt?: Date;
    isPrivate?: boolean;
}

interface SingleExampleProps {
    actionChainId: string;
}

export const SingleExample = ({ actionChainId }: SingleExampleProps) => {
    const router = useRouter();
    const { userPubKey } = useWalletContext();
    const [actionChain, setActionChain] = useState<ActionChainDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);

    useEffect(() => {
        const fetchActionChain = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const viewerParam = userPubKey ? `&viewer=${encodeURIComponent(userPubKey)}` : '';
                const response = await fetch(`/api/examples?actionChainId=${encodeURIComponent(actionChainId)}${viewerParam}`);
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
        // Refetch when the wallet changes: a private chain becomes visible to its creator.
    }, [actionChainId, userPubKey]);

    const isCreator = !!userPubKey && actionChain?.userId === userPubKey;

    const handleToggleVisibility = async () => {
        if (!actionChain || !userPubKey) return;
        const nextIsPrivate = !actionChain.isPrivate;
        setIsTogglingVisibility(true);
        try {
            const response = await fetch('/api/chains/visibility', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    actionChainId: actionChain._id,
                    userId: userPubKey,
                    isPrivate: nextIsPrivate,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                toast.error(data.error || 'Failed to update visibility');
                return;
            }
            setActionChain({ ...actionChain, isPrivate: nextIsPrivate });
            toast.success(
                nextIsPrivate
                    ? 'Chain hidden from the public directory'
                    : 'Chain is now visible in the public directory',
                { duration: 3000 }
            );
        } catch (error) {
            console.error('Error updating visibility:', error);
            toast.error('Failed to update visibility');
        } finally {
            setIsTogglingVisibility(false);
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "64px 0" }}>
                <Spinner size="lg" />
                <p className="muted">Loading supply chain…</p>
            </div>
        );
    }

    if (error || !actionChain) {
        return (
            <div className="card" style={{ padding: "52px 40px" }}>
                <div className="empty">
                    <div className="empty-ico"><Icon name="alert-triangle" size={26} /></div>
                    <h3>Supply chain not found</h3>
                    <p>{error || 'This supply chain does not exist or has not been finalized.'}</p>
                    <button type="button" className="btn btn-outline" onClick={() => router.push('/directory')}>
                        <Icon name="arrow-right" size={15} style={{ transform: "rotate(180deg)" }} />
                        Back to directory
                    </button>
                </div>
            </div>
        );
    }

    const creator = `${actionChain.userId.slice(0, 8)}…${actionChain.userId.slice(-6)}`;

    return (
        <>
            <button
                type="button"
                onClick={() => router.push('/directory')}
                className="btn btn-ghost btn-sm"
                style={{ marginBottom: 18, paddingLeft: 8 }}
            >
                <Icon name="arrow-right" size={15} style={{ transform: "rotate(180deg)" }} />
                Back to directory
            </button>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 22 }}>
                {actionChain.imageURL && (
                    <div style={{ width: "100%", maxWidth: 420, height: 220, margin: "0 auto 18px", borderRadius: "var(--r-lg)", overflow: "hidden", border: "1px solid var(--line)", background: "var(--surface-2)" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={actionChain.imageURL} alt={actionChain.title || "Product image"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                )}
                <span className="badge badge-ok"><Icon name="shield-check" size={12} />Verified on-chain · read-only</span>
                {actionChain.isPrivate && (
                    <span className="badge" style={{ marginLeft: 8 }}><Icon name="lock" size={12} />Private</span>
                )}
                <h1 className="disp" style={{ fontSize: 32, marginTop: 12 }}>{actionChain.title || "Untitled chain"}</h1>
                <div className="muted" style={{ display: "flex", gap: 18, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13 }}><b style={{ color: "var(--ink)" }}>{actionChain.stages.length}</b> stages</span>
                    <span style={{ fontSize: 13 }}>creator <span className="mono" style={{ fontSize: 12 }}>{creator}</span></span>
                    {actionChain.finalizedAt && (
                        <span style={{ fontSize: 13 }}>sealed {new Date(actionChain.finalizedAt).toLocaleDateString()}</span>
                    )}
                </div>
            </div>

            {/* Chain ID */}
            <div className="card card-pad" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                <div style={{ minWidth: 0 }}>
                    <div className="faint" style={{ fontSize: 11.5, marginBottom: 2 }}>
                        <InfoTip title="Chain ID" body="The supply chain's unique on-chain identifier. Anyone with it can look up and verify the full custody trail.">
                            Chain ID
                        </InfoTip>
                    </div>
                    <div className="mono" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis" }}>{actionChain._id}</div>
                </div>
                <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ flex: "0 0 auto" }}
                    onClick={() => {
                        navigator.clipboard.writeText(actionChain._id);
                        toast.success('Chain ID copied to clipboard!', { duration: 2000 });
                    }}
                >
                    <Icon name="copy" size={14} />Copy
                </button>
            </div>

            {/* Visibility toggle (creator only) */}
            {isCreator && (
                <div className="card card-pad" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                            <InfoTip title="Directory visibility" body="Private chains are hidden from the public directory and direct links. You can still see this chain while your wallet is connected.">
                                Directory visibility
                            </InfoTip>
                        </div>
                        <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                            {actionChain.isPrivate
                                ? "Private: only you can see this chain, and only while your wallet is connected."
                                : "Public: anyone can find this chain in the directory."}
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ flex: "0 0 auto" }}
                        onClick={handleToggleVisibility}
                        disabled={isTogglingVisibility}
                    >
                        {isTogglingVisibility ? (
                            <Spinner size="sm" />
                        ) : (
                            <Icon name={actionChain.isPrivate ? "unlock" : "lock"} size={14} />
                        )}
                        {actionChain.isPrivate ? "Make public" : "Make private"}
                    </button>
                </div>
            )}

            {/* Trust explainer */}
            <CoachCard icon="fingerprint">
                Every stage below is a real, verifiable transaction recorded on the blockchain. The{" "}
                <InfoTip title="TXID" body="Transaction ID: the permanent on-chain receipt for a stage. It proves exactly when the stage was recorded and can't be forged.">
                    TXID
                </InfoTip>{" "}
                is its permanent receipt, which is why this record can be trusted.
            </CoachCard>

            {/* Stage timeline (read-only) */}
            <div className="timeline" style={{ marginTop: 18 }}>
                {actionChain.stages.map((stage, index) => (
                    <StageRow
                        key={`${stage.TransactionID}-${index}`}
                        stage={stage}
                        index={index}
                        isFirst={index === 0}
                        lock="sent"
                    />
                ))}
            </div>

            {/* Read-only notice */}
            <div style={{ marginTop: 18 }}>
                <CoachCard icon="check-circle" tone="ok" title="Finalized & read-only">
                    This supply chain is sealed. No further stages can be added.
                </CoachCard>
            </div>
        </>
    );
};
