'use client';

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { PageHead } from "../common/page-head";
import { Icon } from "../common/icon";
import { useWalletContext } from "../../context/walletContext";

interface ActionChainCard {
    _id: string;
    userId: string;
    title?: string;
    imageURL?: string;
    stageCount: number;
    createdAt?: Date;
    finalizedAt?: Date;
    firstStage?: string;
    lastStage?: string;
    isPrivate?: boolean;
}

function ChainCard({ chain }: { chain: ActionChainCard }) {
    const creator = `${chain.userId.slice(0, 8)}…${chain.userId.slice(-6)}`;
    const flow =
        chain.firstStage && chain.lastStage
            ? `${chain.firstStage} → ${chain.lastStage}`
            : chain.firstStage || "";
    const sealed = chain.finalizedAt ? new Date(chain.finalizedAt).toLocaleDateString() : "";
    return (
        <div className="card card-pad" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
            {chain.imageURL && (
                <div style={{ height: 120, borderRadius: "var(--r-sm)", overflow: "hidden", background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={chain.imageURL} alt={chain.title || "Product image"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
            )}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div className="disp" style={{ fontSize: 16.5, lineHeight: 1.2 }}>{chain.title || "Untitled chain"}</div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flex: "0 0 auto" }}>
                    <span className="badge badge-ok"><Icon name="check-circle" size={11} />Finalized</span>
                    {chain.isPrivate && (
                        <span className="badge"><Icon name="lock" size={11} />Private</span>
                    )}
                </div>
            </div>
            <dl className="kv" style={{ rowGap: 6 }}>
                <dt>Stages</dt>
                <dd><b>{chain.stageCount}</b></dd>
                <dt>Creator</dt>
                <dd className="mono" style={{ fontSize: 12 }}>{creator}</dd>
                {flow && (
                    <>
                        <dt>Flow</dt>
                        <dd style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{flow}</dd>
                    </>
                )}
                {sealed && (
                    <>
                        <dt>Sealed</dt>
                        <dd>{sealed}</dd>
                    </>
                )}
            </dl>
            <hr className="divider" />
            <span className="accent-tx" style={{ fontWeight: 600, fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 6 }}>
                View chain
                <Icon name="arrow-right" size={15} />
            </span>
        </div>
    );
}

export const ExamplesList = () => {
    const { userPubKey } = useWalletContext();
    const [actionChains, setActionChains] = useState<ActionChainCard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [serverSearchQuery, setServerSearchQuery] = useState("");
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(21);

    const fetchActionChains = async (query?: string, page: number = 1) => {
        setIsLoading(true);
        try {
            const skip = (page - 1) * limit;
            const params = new URLSearchParams();
            if (query) {
                params.append('query', query);
            }
            params.append('limit', limit.toString());
            params.append('skip', skip.toString());
            // Private chains are only returned for their creator
            if (userPubKey) {
                params.append('viewer', userPubKey);
            }

            const response = await fetch(`/api/examples?${params.toString()}`);
            const data = await response.json();

            if (response.ok) {
                setActionChains(data.actionChains);
                setTotalCount(data.total);
                setHasMore(data.hasMore);
                setCurrentPage(page);
            } else {
                // Handle API errors (e.g., invalid query)
                const errorMessage = data.error || 'Failed to fetch action chains';
                toast.error(errorMessage, {
                    duration: 4000,
                    position: 'top-center',
                });
                console.error('API error:', errorMessage);

                // Clear search if it was invalid
                if (response.status === 400 && query) {
                    setSearchQuery('');
                    setServerSearchQuery('');
                }
            }
        } catch (error) {
            console.error('Error fetching action chains:', error);
            toast.error('Network error. Please try again.', {
                duration: 4000,
                position: 'top-center',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchActionChains(serverSearchQuery || undefined, 1);
        // refetch when the wallet changes so the creator's private chains appear
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userPubKey]);

    // Handle Enter key press to trigger server-side search
    const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setServerSearchQuery(searchQuery);
            setCurrentPage(1); // Reset to first page on new search
            fetchActionChains(searchQuery.trim() || undefined, 1);
        }
    };

    const clearSearch = () => {
        setSearchQuery("");
        setServerSearchQuery("");
        setCurrentPage(1);
        fetchActionChains(undefined, 1);
    };

    // Pagination handlers
    const handlePreviousPage = () => {
        if (currentPage > 1) {
            const newPage = currentPage - 1;
            fetchActionChains(serverSearchQuery || undefined, newPage);
        }
    };

    const handleNextPage = () => {
        const totalPages = Math.ceil(totalCount / limit);
        if (currentPage < totalPages) {
            const newPage = currentPage + 1;
            fetchActionChains(serverSearchQuery || undefined, newPage);
        }
    };

    // Client-side filter action chains based on search query (for typing)
    // Only used when server search query is empty
    const filteredChains = useMemo(() => {
        // If there's a server search query active, don't filter client-side
        if (serverSearchQuery) {
            return actionChains;
        }

        if (!searchQuery.trim()) {
            return actionChains;
        }

        const query = searchQuery.toLowerCase();
        return actionChains.filter((chain) => {
            // Search by title
            if (chain.title?.toLowerCase().includes(query)) return true;

            // Search by chain ID
            if (chain._id.toLowerCase().includes(query)) return true;

            // Search by creator ID
            if (chain.userId.toLowerCase().includes(query)) return true;

            // Search by first or last stage
            if (chain.firstStage?.toLowerCase().includes(query)) return true;
            if (chain.lastStage?.toLowerCase().includes(query)) return true;

            return false;
        });
    }, [actionChains, searchQuery, serverSearchQuery]);

    const totalPages = Math.ceil(totalCount / limit);

    return (
        <>
            <PageHead
                eyebrow="Supply chain directory"
                eyebrowIcon="scroll-text"
                title="Finalized supply chains"
                sub="Completed, sealed supply chains, each a verifiable on-chain record. Browse them to see the engine across different industries."
            />

            {/* Search */}
            {!isLoading && (actionChains.length > 0 || serverSearchQuery) && (
                <div style={{ position: "relative", marginBottom: 22 }}>
                    <Icon name="search" size={17} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            // Clear server search when user modifies the query
                            if (serverSearchQuery && e.target.value !== serverSearchQuery) {
                                setServerSearchQuery("");
                            }
                        }}
                        onKeyDown={handleSearchSubmit}
                        placeholder="Search title, chain ID, creator, or stage (press Enter)"
                        className="input input-search"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="copybtn"
                            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}
                            title="Clear search"
                            aria-label="Clear search"
                        >
                            <Icon name="x" size={16} />
                        </button>
                    )}
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", padding: "6px 0 20px", color: "var(--ink-2)" }}>
                        <span className="spinner sm" />
                        <span style={{ fontSize: 13 }}>Loading supply chains from the blockchain…</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="card card-pad" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                                <div className="skel" style={{ height: 20, width: "70%" }} />
                                <div className="skel" style={{ height: 12, width: "50%" }} />
                                <div className="skel" style={{ height: 12, width: "85%" }} />
                                <div className="skel" style={{ height: 12, width: "60%" }} />
                                <div className="skel" style={{ height: 30, width: "40%", marginTop: 4 }} />
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Empty (no chains exist, and not a no-match search) */}
            {!isLoading && actionChains.length === 0 && !serverSearchQuery && (
                <div className="card" style={{ padding: "52px 40px", marginTop: 8 }}>
                    <div className="empty">
                        <div className="empty-ico"><Icon name="scroll-text" size={26} /></div>
                        <h3>No finalized supply chains yet</h3>
                        <p>Once someone seals a chain, it appears here as a verifiable record. Build and finalize one to see it listed.</p>
                        <Link href="/create" className="btn btn-primary"><Icon name="plus" size={16} />Build your own</Link>
                    </div>
                </div>
            )}

            {/* No results (client filter or server search returned nothing) */}
            {!isLoading && filteredChains.length === 0 && (actionChains.length > 0 || serverSearchQuery) && (
                <div className="card" style={{ padding: "52px 40px" }}>
                    <div className="empty">
                        <div className="empty-ico"><Icon name="search" size={26} /></div>
                        <h3>No supply chains match your search</h3>
                        <p>Try a different title, chain ID, creator, or stage name, or clear the search to see every finalized chain.</p>
                        <button type="button" className="btn btn-outline" onClick={clearSearch}><Icon name="x" size={15} />Clear search</button>
                    </div>
                </div>
            )}

            {/* Grid */}
            {!isLoading && filteredChains.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredChains.map((chain) => (
                        <Link key={chain._id} href={`/directory/${chain._id}`} style={{ display: "block" }}>
                            <ChainCard chain={chain} />
                        </Link>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {!isLoading && (serverSearchQuery || !searchQuery) && totalCount > limit && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 26, flexWrap: "wrap", gap: 12 }}>
                    <span className="faint" style={{ fontSize: 12.5 }}>
                        {serverSearchQuery
                            ? `Showing ${((currentPage - 1) * limit) + 1}–${Math.min(currentPage * limit, totalCount)} of ${totalCount} matching "${serverSearchQuery}"`
                            : `Showing ${((currentPage - 1) * limit) + 1}–${Math.min(currentPage * limit, totalCount)} of ${totalCount}`}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button type="button" className="btn btn-outline btn-sm" onClick={handlePreviousPage} disabled={currentPage === 1}>
                            <Icon name="arrow-right" size={14} style={{ transform: "rotate(180deg)" }} />Prev
                        </button>
                        <span className="faint" style={{ fontSize: 12.5 }}>Page {currentPage} of {totalPages}</span>
                        <button type="button" className="btn btn-outline btn-sm" onClick={handleNextPage} disabled={!hasMore}>
                            Next<Icon name="arrow-right" size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Client-side filter count */}
            {!isLoading && actionChains.length > 0 && searchQuery && !serverSearchQuery && (
                <p className="faint" style={{ fontSize: 12.5, textAlign: "center", marginTop: 26 }}>
                    Showing {filteredChains.length} of {actionChains.length} finalized supply chain{actionChains.length !== 1 ? 's' : ''}
                </p>
            )}

            {/* Simple count when no pagination needed */}
            {!isLoading && actionChains.length > 0 && (serverSearchQuery || !searchQuery) && totalCount <= limit && (
                <p className="faint" style={{ fontSize: 12.5, textAlign: "center", marginTop: 26 }}>
                    {serverSearchQuery
                        ? `Showing ${totalCount} finalized supply chain${totalCount !== 1 ? 's' : ''} matching "${serverSearchQuery}"`
                        : `Showing ${totalCount} finalized supply chain${totalCount !== 1 ? 's' : ''}`}
                </p>
            )}
        </>
    );
};
