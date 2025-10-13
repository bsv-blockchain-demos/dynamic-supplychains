'use client';

import { useEffect, useState } from "react";

interface StageItemDetailsProps {
    transactionId: string;
    onClose: () => void;
}

export const StageItemDetails = ({ transactionId, onClose }: StageItemDetailsProps) => {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // User will implement the fetch and decrypt logic here
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // TODO: Implement Overlay fetch and decryption
                // const overlayData = await getTransactionByTxid(transactionId);
                // const decryptedData = await decrypt(overlayData);
                // setData(decryptedData);
                
                // Placeholder for now
                setData({ transactionId });
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to fetch data");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [transactionId]);

    return (
        <div className="w-80 bg-white rounded-xl border-2 border-blue-300 shadow-lg p-6 animate-in slide-in-from-right">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Stage Details</h3>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
                <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Transaction ID</p>
                    <p className="text-sm text-gray-900 break-all font-mono bg-gray-50 p-2 rounded">
                        {transactionId}
                    </p>
                </div>

                {isLoading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {!isLoading && !error && data && (
                    <div>
                        <p className="text-xs text-gray-500 font-medium mb-2">Decrypted Data</p>
                        <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded overflow-auto max-h-96 border border-gray-200">
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};