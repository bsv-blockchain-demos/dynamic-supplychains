'use client';

import { useState } from "react";
import { ActionChainStage } from "../../lib/mongo";

interface CreateStageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (stage: ActionChainStage) => void;
}

interface MetadataField {
    id: string;
    key: string;
    value: string;
}

export const CreateStageModal = ({ isOpen, onClose, onSubmit }: CreateStageModalProps) => {
    const [title, setTitle] = useState("");
    const [metadataFields, setMetadataFields] = useState<MetadataField[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const addMetadataField = () => {
        const newField: MetadataField = {
            id: Date.now().toString(),
            key: "",
            value: ""
        };
        setMetadataFields([...metadataFields, newField]);
    };

    const removeMetadataField = (id: string) => {
        setMetadataFields(metadataFields.filter(field => field.id !== id));
    };

    const updateMetadataField = (id: string, key: string, value: string) => {
        setMetadataFields(metadataFields.map(field => 
            field.id === id ? { ...field, key, value } : field
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Convert metadata fields to JSON object
        const metadataObject: Record<string, string> = {};
        metadataFields.forEach(field => {
            if (field.key && field.value) {
                metadataObject[field.key] = field.value;
            }
        });

        // TransactionID will come from the wallet create pushdrop
        const txid = await createPushdropToken(metadataObject);

        // Create new stage object
        const newStage: ActionChainStage = {
            title: title,
            Timestamp: new Date(),
            TransactionID: txid,
        };

        // TODO: Implement API call to save stage to database
        console.log("Creating stage:", newStage);

        // Call the onSubmit callback with the new stage
        onSubmit(newStage);

        // Reset form and close modal
        setTitle("");
        setMetadataFields([]);
        setIsSubmitting(false);
        onClose();
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setMetadataFields([]);
            setTitle("");
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
                    onClick={() => {
                        setMetadataFields([]);
                        setTitle("");
                        onClose();
                    }}
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
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm font-medium text-black">
                                Metadata
                            </label>
                        </div>
                        
                        {/* Dynamic metadata fields */}
                        <div className="space-y-3 mb-3">
                            {metadataFields.map((field) => (
                                <div key={field.id} className="flex gap-2 items-start">
                                    <input
                                        type="text"
                                        value={field.key}
                                        onChange={(e) => updateMetadataField(field.id, e.target.value, field.value)}
                                        placeholder="Key/ID"
                                        className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-black text-sm"
                                    />
                                    <input
                                        type="text"
                                        value={field.value}
                                        onChange={(e) => updateMetadataField(field.id, field.key, e.target.value)}
                                        placeholder="Value"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-black text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeMetadataField(field.id)}
                                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                        title="Remove field"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add field button */}
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={addMetadataField}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors text-sm font-medium cursor-pointer shadow-md"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Field
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setMetadataFields([]);
                                setTitle("");
                                onClose();
                            }}
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

async function createPushdropToken(metadata: Record<string, string>) {
    // TODO: Implement pushdrop creation logic
    return "txid";
}