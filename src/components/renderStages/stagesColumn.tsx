'use client';

import { ActionChainStage } from "../../lib/mongo";
import { StageItem } from "./stageItem";
import { CreateStageModal } from "../stageActions/createStageModal";
import { CHAIN_TEMPLATES, ChainTemplate } from "../stageActions/createModalTemplates";
import { useState } from "react";

const MAX_STAGES = 8;
const MIN_STAGES = 2;

export const StagesColumn = (props: { stages?: ActionChainStage[] }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stages, setStages] = useState<ActionChainStage[]>(props.stages || []);
    const [chainTitle, setChainTitle] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState<ChainTemplate | null>(null);

    const handleAddStage = (newStage: ActionChainStage) => {
        // Add new stage to the BOTTOM of the array (append)
        setStages([...stages, newStage]);
    };

    const isMaxReached = stages.length >= MAX_STAGES;
    const needsMoreStages = stages.length < MIN_STAGES;

    return (
        <>
            <div className="w-full flex flex-col items-center gap-8 py-8">
                {/* Chain Title Input */}
                <div className="w-full max-w-xl">
                    <label htmlFor="chainTitle" className="block text-sm font-medium text-white mb-2">
                        Action Chain Title
                    </label>
                    <input
                        id="chainTitle"
                        type="text"
                        value={chainTitle}
                        onChange={(e) => setChainTitle(e.target.value)}
                        placeholder="Choose a template or enter your own title"
                        className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition text-black font-medium bg-white shadow-lg"
                    />
                    
                    {/* Template Selection Buttons */}
                    <div className="mt-3">
                        <p className="text-xs font-medium text-blue-200 mb-2">Quick Templates:</p>
                        <div className="flex gap-2 flex-wrap">
                            {CHAIN_TEMPLATES.map((template) => (
                                <button
                                    key={template.title}
                                    type="button"
                                    onClick={() => {
                                        if (selectedTemplate?.title === template.title) {
                                            // Deselect if clicking the already selected template
                                            setSelectedTemplate(null);
                                        } else {
                                            // Select the template and set the title
                                            setChainTitle(template.title);
                                            setSelectedTemplate(template);
                                        }
                                    }}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all hover:cursor-pointer ${
                                        selectedTemplate?.title === template.title
                                            ? 'bg-blue-500 text-white shadow-lg ring-2 ring-blue-300'
                                            : 'bg-white text-blue-900 hover:bg-blue-50 shadow-md hover:shadow-lg'
                                    }`}
                                >
                                    {template.title}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {chainTitle && (
                        <p className="text-xs text-blue-200 mt-3">
                            💡 Tip: Template stages will appear with pre-filled metadata fields when creating stages
                        </p>
                    )}
                </div>

                {/* Info message */}
                {needsMoreStages && stages.length > 0 && (
                    <div className="w-full max-w-xl bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                        <p className="text-sm text-yellow-700">
                            <strong>Note:</strong> You need at least {MIN_STAGES} stages. Currently: {stages.length}/{MIN_STAGES}
                        </p>
                    </div>
                )}

                {/* Render existing stages */}
                {stages.map((stage, index) => (
                    <StageItem key={`${stage.TransactionID}-${index}`} stage={stage} />
                ))}

                {/* Add new stage card */}
                {!isMaxReached ? (
                    <div
                        onClick={() => setIsModalOpen(true)}
                        className="w-full max-w-xl bg-white rounded-xl border-2 border-dashed border-gray-400 hover:border-blue-500 transition-all cursor-pointer min-h-[280px] flex items-center justify-center group shadow-[6px_8px_16px_rgba(0,0,0,0.25)] hover:shadow-[8px_12px_24px_rgba(0,0,0,0.3)]"
                    >
                        <div className="text-center">
                            <div className="text-6xl text-gray-300 group-hover:text-blue-400 transition-colors mb-2">
                                +
                            </div>
                            <p className="text-gray-400 group-hover:text-blue-500 transition-colors text-sm font-medium">
                                Add Stage
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {stages.length}/{MAX_STAGES} stages
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-xl bg-gray-50 rounded-xl border-2 border-gray-300 min-h-[280px] flex items-center justify-center shadow-[6px_8px_16px_rgba(0,0,0,0.25)]">
                        <div className="text-center">
                            <p className="text-gray-500 font-medium">
                                Maximum stages reached
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {stages.length}/{MAX_STAGES} stages
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            <CreateStageModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleAddStage}
                selectedTemplate={selectedTemplate}
                stageIndex={stages.length}
            />
        </>
    );
};