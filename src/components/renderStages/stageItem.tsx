'use client';

import { ActionChainStage } from "../../lib/mongo";
import { useState } from "react";
import { StageItemDetails } from "./stageItemDetails";

export const StageItem = (props: { stage: ActionChainStage }) => {
    const { stage } = props;
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="w-full flex justify-center">
            <div className="relative w-full max-w-xl">
                {/* Stage Card */}
                <div 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full bg-white rounded-xl border-2 border-gray-300 overflow-hidden hover:shadow-[8px_12px_24px_rgba(0,0,0,0.3)] transition-all shadow-[6px_8px_16px_rgba(0,0,0,0.25)] cursor-pointer hover:border-blue-400"
                >
                {/* Stage Image */}
                <div className="relative h-64 bg-gradient-to-br from-blue-100 to-blue-50">
                    {stage.imageURL ? (
                        <img 
                            src={stage.imageURL} 
                            alt={stage.title || "Stage image"}
                            className="absolute inset-0 w-full h-full object-contain"
                        />
                    ) : (
                        /* Placeholder for stage illustration */
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                            </svg>
                        </div>
                    )}
                </div>

                {/* Stage Content */}
                <div className="p-6">
                    <div className="flex flex-col gap-2">
                        <h3 className="text-xl font-bold text-gray-900">
                            {stage.title || "Untitled Stage"}
                        </h3>
                        <p className="text-sm text-gray-600">
                            Transaction ID: {stage.TransactionID}
                        </p>
                        <p className="text-xs text-gray-400">
                            {new Date(stage.Timestamp).toLocaleString()}
                        </p>
                    </div>
                </div>
                </div>

                {/* Details Panel - positioned absolutely to the right of the card */}
                {isExpanded && (
                    <div className="absolute left-[calc(100%+1rem)] top-0 z-10">
                        <StageItemDetails 
                            key={stage.TransactionID}
                            transactionId={stage.TransactionID}
                            onClose={() => setIsExpanded(false)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};