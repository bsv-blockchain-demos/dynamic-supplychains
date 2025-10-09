'use client';

import { StagesColumn } from "../components/renderStages/stagesColumn";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Supply Chain Action Builder
          </h1>
          <p className="text-blue-100">
            Create your own blockchain action chains
          </p>
        </div>

        {/* Stages Column - Empty State */}
        <div className="flex justify-center">
          <StagesColumn stages={[]} />
        </div>
      </div>
    </div>
  );
}
