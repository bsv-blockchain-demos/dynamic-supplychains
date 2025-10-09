import { ActionChainStage } from "../../lib/mongo";
import Image from "next/image";

export const StageItem = (props: { stage: ActionChainStage }) => {
    const { stage } = props;

    return (
        <div className="w-full max-w-xl bg-white rounded-xl border-2 border-gray-300 overflow-hidden hover:shadow-[8px_12px_24px_rgba(0,0,0,0.3)] transition-all shadow-[6px_8px_16px_rgba(0,0,0,0.25)]">
            {/* Stage Image */}
            <div className="relative h-64 bg-gradient-to-br from-blue-100 to-blue-50">
                {/* Placeholder for stage illustration */}
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    {/* You can replace this with actual images later */}
                    <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>

            {/* Stage Content */}
            <div className="p-6">
                <div className="flex justify-between items-start gap-4">
                    {/* Left side - Title and description */}
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {stage.title || "Untitled Stage"}
                        </h3>
                        <p className="text-sm text-gray-600">
                            Transaction ID: {stage.TransactionID}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {new Date(stage.Timestamp).toLocaleString()}
                        </p>
                    </div>

                    {/* Right side - Tokens section */}
                    <div className="flex-shrink-0 border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 min-w-[120px]">
                        <p className="text-sm text-gray-400 text-center">
                            No tokens yet
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};