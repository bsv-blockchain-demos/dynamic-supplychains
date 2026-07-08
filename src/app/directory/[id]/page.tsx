'use client';

import { useParams } from "next/navigation";
import { SingleExample } from "../../../components/examples/singleExample";

export default function ExampleDetailPage() {
    const params = useParams();
    const actionChainId = params.id as string;

    return (
        <main className="mx-auto max-w-[760px] px-6 py-8 sm:px-10 sm:py-12">
            <SingleExample actionChainId={actionChainId} />
        </main>
    );
}
