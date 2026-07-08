'use client';

import { Utils, Hash, SymmetricKey, Transaction } from "@bsv/sdk";
import { getTransactionByTxid } from "../../utils/overlayFunctions";
import { useEffect, useState, useCallback } from "react";
import { Modal } from "../common/modal";
import { StageDetailsContent, StageDetailsData } from "./stageDetailsContent";

interface StageItemDetailsModalProps {
    transactionId: string;
    imageURL?: string;
    onClose: () => void;
}

export const StageItemDetailsModal = ({ transactionId, imageURL, onClose }: StageItemDetailsModalProps) => {
    const [data, setData] = useState<StageDetailsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // First, fetch the receiver information from the chainTransfers collection
            const receiverResponse = await fetch(`/api/chains/receiver?transactionId=${encodeURIComponent(transactionId)}`);
            const receiverData = await receiverResponse.json();

            const receiverKey = receiverData.receiver || "self";
            const receiverDisplay = receiverKey === "self"
                ? "Self (your wallet)"
                : receiverKey;

            // Fetch the transaction from overlay
            const overlayData = await getTransactionByTxid(transactionId);

            if (!overlayData || !overlayData.outputs || !overlayData.outputs[0] || !overlayData.outputs[0].beef) {
                throw new Error("Transaction not found in overlay. It may still be broadcasting or failed to broadcast.");
            }

            // Get the transaction and extract encrypted data
            const transaction = Transaction.fromBEEF(overlayData.outputs[0].beef);
            const lockingScript = transaction.outputs[0].lockingScript;

            // Get the encryptedData from the pushdrop transaction
            const encryptedData = lockingScript.chunks[0].data as number[];

            // Try to decrypt - first with the receiver key, then with "self" if that fails
            let decryptedObject: Record<string, unknown> | null = null;
            let decryptionError: string | null = null;

            // Try the receiver key first
            try {
                const receiverBytes = Utils.toArray(receiverKey, 'utf8');
                const keyBytes = Hash.sha256(receiverBytes);
                const key = new SymmetricKey(keyBytes);

                const decryptedData = key.decrypt(encryptedData) as number[];
                const decryptedString = Utils.toUTF8(decryptedData);
                decryptedObject = JSON.parse(decryptedString);
            } catch {
                // If receiver key fails and it's not "self", try "self" as fallback
                if (receiverKey !== "self") {
                    try {
                        const selfBytes = Utils.toArray("self", 'utf8');
                        const selfKeyBytes = Hash.sha256(selfBytes);
                        const selfKey = new SymmetricKey(selfKeyBytes);

                        const decryptedData = selfKey.decrypt(encryptedData) as number[];
                        const decryptedString = Utils.toUTF8(decryptedData);
                        decryptedObject = JSON.parse(decryptedString);
                    } catch {
                        decryptionError = "Unable to decrypt with receiver key or self";
                        console.log("Decryption failed for both receiver and self:", receiverDisplay);
                    }
                } else {
                    decryptionError = "Unable to decrypt";
                    console.log("Decryption failed for receiver:", receiverDisplay);
                }
            }

            setData({
                ...decryptedObject,
                _metadata: {
                    receiver: receiverDisplay,
                    canDecrypt: decryptedObject !== null,
                    decryptionError: decryptionError,
                    sender: receiverData.sender
                }
            });
        } catch (err) {
            console.error("Error fetching stage details:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch data");
        } finally {
            setIsLoading(false);
        }
    }, [transactionId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <Modal
            open
            onClose={onClose}
            icon="package"
            title="Stage details"
            sub="A permanent, on-chain step in this supply chain."
            width={560}
            footer={
                <>
                    <span className="faint" style={{ fontSize: 12 }}>This data lives permanently on-chain.</span>
                    <button type="button" className="btn btn-outline" onClick={onClose}>Close</button>
                </>
            }
        >
            <StageDetailsContent
                transactionId={transactionId}
                imageURL={imageURL}
                data={data}
                isLoading={isLoading}
                error={error}
                onRetry={fetchData}
            />
        </Modal>
    );
};
