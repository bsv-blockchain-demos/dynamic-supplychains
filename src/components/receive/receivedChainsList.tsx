'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWalletContext } from "../../context/walletContext";
import { Spinner } from "../ui/spinner";
import { ActionChainStage } from "../../lib/mongo";
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

interface ReceivedChainsListProps {
    onSelectChain: (chain: ReceivedChain) => void;
}

function InboxCard({ chain, onSelect }: { chain: ReceivedChain; onSelect: () => void }) {
    const from = `${chain.senderPubKey.slice(0, 8)}…${chain.senderPubKey.slice(-6)}`;
    const first = chain.stages[0]?.title;
    const last = chain.stages[chain.stages.length - 1]?.title;
    const flow = chain.stages.length >= 2 && first && last ? `${first} → ${last}` : first || "";
    const when = new Date(chain.sentAt).toLocaleDateString();

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect();
                }
            }}
            className="card card-pad"
            style={{ display: "flex", flexDirection: "column", gap: 12, padding: 18, cursor: "pointer" }}
        >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                    <div className="disp" style={{ fontSize: 17 }}>{chain.title || "Untitled chain"}</div>
                    <div className="faint" style={{ fontSize: 12, marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                        <Icon name="key-round" size={12} />
                        from <span className="mono">{from}</span>
                    </div>
                </div>
                {chain.continued ? (
                    <span className="badge badge-accent"><Icon name="corner-down-right" size={11} />Continued</span>
                ) : (
                    <span className="badge badge-ok"><Icon name="inbox" size={11} />New</span>
                )}
            </div>

            <div className="muted" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, minWidth: 0 }}>
                <span className="stat-pill"><b>{chain.stageCount}</b> stages</span>
                {flow && (
                    <>
                        <Icon name="arrow-right" size={13} style={{ color: "var(--ink-3)", flex: "0 0 auto" }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{flow}</span>
                    </>
                )}
            </div>

            <hr className="divider" />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span className="faint" style={{ fontSize: 11.5 }}>received {when}</span>
                <span className={`btn btn-sm ${chain.continued ? "btn-outline" : "btn-primary"}`}>
                    <Icon name={chain.continued ? "eye" : "corner-down-right"} size={14} />
                    {chain.continued ? "View" : "Continue"}
                </span>
            </div>
        </div>
    );
}

export const ReceivedChainsList = ({ onSelectChain }: ReceivedChainsListProps) => {
    const [receivedChains, setReceivedChains] = useState<ReceivedChain[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { userPubKey, initializeWallet, isConnecting } = useWalletContext();

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

    const head = (
        <PageHead
            eyebrow="Inbox"
            eyebrowIcon="inbox"
            title="Chains sent to you"
            sub="Supply chains another party handed off to your wallet. Continue one to add the next stage, or forward it on."
        />
    );

    if (!userPubKey) {
        return (
            <>
                {head}
                <div className="gate">
                    <Icon name="key-round" size={20} style={{ color: "var(--warn)" }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>Connect your wallet to view received chains</div>
                        <div className="muted" style={{ fontSize: 12.8, marginTop: 1 }}>
                            Chains are locked to your wallet ID, so we need it connected to find yours.
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
            </>
        );
    }

    if (isLoading) {
        return (
            <>
                {head}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "56px 0" }}>
                    <Spinner size="lg" />
                    <p className="muted">Loading received chains…</p>
                </div>
            </>
        );
    }

    if (receivedChains.length === 0) {
        return (
            <>
                {head}
                <div className="card" style={{ padding: "56px 40px", marginTop: 8 }}>
                    <div className="empty">
                        <div className="empty-ico"><Icon name="inbox" size={28} /></div>
                        <h3>No chains received yet</h3>
                        <p>
                            A received chain arrives when someone locks a stage to{" "}
                            <InfoTip title="Your wallet ID" body="Your public key: the address others lock stages to so only you can continue them.">
                                your wallet ID
                            </InfoTip>
                            . Once it does, you can add the next stage or seal the chain.
                        </p>
                        <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
                            <Link href="/create" className="btn btn-primary"><Icon name="plus" size={16} />Build your own</Link>
                            <Link href="/directory" className="btn btn-outline"><Icon name="scroll-text" size={16} />Browse the directory</Link>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    const awaiting = receivedChains.filter((c) => !c.continued).length;

    return (
        <>
            <PageHead
                eyebrow="Inbox"
                eyebrowIcon="inbox"
                title="Chains sent to you"
                sub="Supply chains another party handed off to your wallet. Continue one to add the next stage, or forward it on."
                right={
                    awaiting > 0 ? (
                        <span className="badge badge-accent"><Icon name="inbox" size={12} />{awaiting} awaiting you</span>
                    ) : undefined
                }
            />

            <CoachCard icon="info" title="Continue vs. forward">
                <b style={{ color: "var(--ink)" }}>Continue</b> adds your stage and keeps the chain.{" "}
                <b style={{ color: "var(--ink)" }}>Forward</b> adds your stage and locks the next one to another party, passing custody along.
            </CoachCard>

            <div className="grid gap-4 sm:grid-cols-2" style={{ marginTop: 16 }}>
                {receivedChains.map((chain) => (
                    <InboxCard key={chain.transferId} chain={chain} onSelect={() => onSelectChain(chain)} />
                ))}
            </div>

            <p className="faint" style={{ fontSize: 12, textAlign: "center", marginTop: 24 }}>
                Showing {receivedChains.length} received chain{receivedChains.length !== 1 ? "s" : ""}
            </p>
        </>
    );
};
