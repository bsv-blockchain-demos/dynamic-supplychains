'use client';

import { useParams } from "next/navigation";
import { SingleExample } from "../../../components/examples/singleExample";

export default function ExampleDetailPage() {
    const params = useParams();
    const actionChainId = params.id as string;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-8">
            <div className="max-w-6xl mx-auto">
                <SingleExample actionChainId={actionChainId} />
            </div>
        </div>
    );
};