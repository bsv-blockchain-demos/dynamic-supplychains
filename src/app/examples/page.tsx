'use client';

import { StagesColumn } from "../../components/renderStages/stagesColumn";
import { ActionChainStage } from "../../lib/mongo";

export default function ExamplesPage() {
    // Example stages - you can replace this with real data from your API
    const exampleStages: ActionChainStage[] = [
        {
            title: "Wellhead",
            Timestamp: new Date("2025-01-15T10:30:00"),
            TransactionID: "abc123def456"
        },
        {
            title: "Gathering Pipeline Custody",
            Timestamp: new Date("2025-01-16T14:45:00"),
            TransactionID: "xyz789uvw012"
        },
        {
            title: "Processing Plant",
            Timestamp: new Date("2025-01-17T09:15:00"),
            TransactionID: "mno345pqr678"
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-4">
                        Natural Gas Blockchain Demo
                    </h1>
                    <p className="text-blue-100">
                        Create your own action chain stages
                    </p>
                </div>

                {/* Stages Column */}
                <div className="flex justify-center">
                    <StagesColumn stages={exampleStages} />
                </div>
            </div>
        </div>
    );
};