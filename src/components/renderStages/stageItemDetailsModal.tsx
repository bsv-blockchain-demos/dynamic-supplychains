'use client';

import { Utils, Hash, SymmetricKey, Transaction } from "@bsv/sdk";
import { getTransactionByTxid } from "../../utils/overlayFunctions";
import { useEffect, useState, useCallback } from "react";

interface StageItemDetailsModalProps {
    transactionId: string;
    onClose: () => void;
}

export const StageItemDetailsModal = ({ transactionId, onClose }: StageItemDetailsModalProps) => {
    const [data, setData] = useState<any>(null);
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
            let decryptedObject: any = null;
            let decryptionError = null;
            
            // Try the receiver key first
            try {
                const receiverBytes = Utils.toArray(receiverKey, 'utf8');
                const keyBytes = Hash.sha256(receiverBytes);
                const key = new SymmetricKey(keyBytes);
                
                const decryptedData = key.decrypt(encryptedData) as number[];
                const decryptedString = Utils.toUTF8(decryptedData);
                decryptedObject = JSON.parse(decryptedString);
            } catch (err) {
                // If receiver key fails and it's not "self", try "self" as fallback
                if (receiverKey !== "self") {
                    try {
                        const selfBytes = Utils.toArray("self", 'utf8');
                        const selfKeyBytes = Hash.sha256(selfBytes);
                        const selfKey = new SymmetricKey(selfKeyBytes);
                        
                        const decryptedData = selfKey.decrypt(encryptedData) as number[];
                        const decryptedString = Utils.toUTF8(decryptedData);
                        decryptedObject = JSON.parse(decryptedString);
                    } catch (selfErr) {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal Content */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-3xl font-bold text-gray-900">Stage Details</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100 hover:cursor-pointer"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="space-y-6">
                        <div>
                            <p className="text-sm text-gray-500 font-medium mb-2">Transaction ID</p>
                            <p className="text-sm text-gray-900 break-all font-mono bg-gray-50 p-4 rounded-lg border border-gray-200">
                                {transactionId}
                            </p>
                        </div>

                        {isLoading && (
                            <div className="flex items-center justify-center py-16">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-sm text-red-600 mb-3">{error}</p>
                                <button
                                    onClick={fetchData}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline hover:cursor-pointer"
                                >
                                    🔄 Retry
                                </button>
                            </div>
                        )}

                        {!isLoading && !error && data && (
                            <>
                                {/* Receiver Information */}
                                {data._metadata && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                                        <div>
                                            <p className="text-sm text-gray-600 font-medium mb-2">Locked to Receiver:</p>
                                            <p className="text-sm text-gray-900 break-all font-mono">
                                                {data._metadata.receiver === "Self (your wallet)" ? (
                                                    <span className="text-green-700 font-semibold">
                                                        🔓 {data._metadata.receiver}
                                                    </span>
                                                ) : (
                                                    <span className="text-blue-700">
                                                        🔒 {data._metadata.receiver.slice(0, 20)}...{data._metadata.receiver.slice(-12)}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        {data._metadata.sender && (
                                            <div>
                                                <p className="text-sm text-gray-600 font-medium mb-2">Sent by:</p>
                                                <p className="text-sm text-gray-700 break-all font-mono">
                                                    📤 {data._metadata.sender.slice(0, 20)}...{data._metadata.sender.slice(-12)}
                                                </p>
                                            </div>
                                        )}
                                        {!data._metadata.canDecrypt && (
                                            <div className="bg-yellow-50 border border-yellow-300 rounded p-3">
                                                <p className="text-sm text-yellow-800">
                                                    ⚠️ {data._metadata.decryptionError}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Decrypted Data */}
                                {data._metadata?.canDecrypt !== false && (
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium mb-3">Decrypted Data</p>
                                        <pre className="text-sm text-gray-900 bg-gray-50 p-4 rounded-lg overflow-auto border border-gray-200 whitespace-pre-wrap">
                                            {JSON.stringify(
                                                Object.fromEntries(
                                                    Object.entries(data).filter(([key]) => key !== '_metadata')
                                                ),
                                                null,
                                                2
                                            )}
                                        </pre>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
