'use client';

import { useState } from "react";
import { ActionChainStage } from "../../lib/mongo";

interface CreateStageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (stage: ActionChainStage) => void;
}

export const CreateStageModal = ({ isOpen, onClose, onSubmit }: CreateStageModalProps) => {
    const [title, setTitle] = useState("");
    const [transactionId, setTransactionId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Create new stage object
        const newStage: ActionChainStage = {
            title: title,
            Timestamp: new Date(),
            TransactionID: transactionId
        };

        // TODO: Implement API call to save stage to database
        console.log("Creating stage:", newStage);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));

        // Call the onSubmit callback with the new stage
        onSubmit(newStage);

        // Reset form and close modal
        setTitle("");
        setTransactionId("");
        setIsSubmitting(false);
        onClose();
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4"
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
                    type="button"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Modal Header */}
                <h2 className="text-2xl font-bold text-black mb-6">
                    Create New Stage
                </h2>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Stage Title */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-black mb-2">
                            Stage Title
                        </label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Wellhead, Processing Plant"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-black"
                            required
                        />
                    </div>

                    {/* Stage Metadata */}
                    <div>
                        <label htmlFor="transactionId" className="block text-sm font-medium text-black mb-2">
                            Any metadata
                        </label>
                        <textarea
                            id="transactionId"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            placeholder="Enter any metadata for your action-chain"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-black resize-none"
                            rows={5}
                            required
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-100 transition-colors font-medium cursor-pointer"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:bg-blue-300 disabled:cursor-not-allowed cursor-pointer"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Creating..." : "Create Stage"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};