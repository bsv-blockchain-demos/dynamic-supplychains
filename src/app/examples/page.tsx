'use client';

import { ExamplesList } from "../../components/examples/examplesList";

export default function ExamplesPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-8">
            <div className="max-w-6xl mx-auto">
                <ExamplesList />
            </div>
        </div>
    );
};