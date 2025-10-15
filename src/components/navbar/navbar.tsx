'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWallet } from "./connectWallet";
import { useWalletContext } from "../../context/walletContext";
import { useState, useEffect } from "react";

export const Navbar = () => {
    const pathname = usePathname();
    const { userPubKey } = useWalletContext();
    const [pendingCount, setPendingCount] = useState<number>(0);

    // Fetch pending received chains count
    useEffect(() => {
        const fetchPendingCount = async () => {
            if (!userPubKey) {
                setPendingCount(0);
                return;
            }

            try {
                const response = await fetch(`/api/chains/pending-count?receiverPubKey=${encodeURIComponent(userPubKey)}`);
                const data = await response.json();
                
                if (response.ok) {
                    setPendingCount(data.count || 0);
                }
            } catch (error) {
                console.error('Error fetching pending count:', error);
                setPendingCount(0);
            }
        };

        fetchPendingCount();
        
        // Refresh count every 30 seconds
        const interval = setInterval(fetchPendingCount, 30000);
        
        return () => clearInterval(interval);
    }, [userPubKey]);

    return (
        <nav className="bg-blue-900 border-b border-blue-700 shadow-lg">
            <div className="max-w-6xl mx-auto px-8 py-4">
                <div className="flex items-center justify-between">
                    {/* Navigation Links */}
                    <div className="flex items-center space-x-8">
                        <Link 
                            href="/" 
                            className={`font-medium transition-colors duration-200 ${
                                pathname === '/' 
                                    ? 'text-white border-b-2 border-blue-400 pb-1' 
                                    : 'text-white hover:text-blue-200'
                            }`}
                        >
                            Create
                        </Link>
                        <Link 
                            href="/receive" 
                            className={`font-medium transition-colors duration-200 relative ${
                                pathname?.startsWith('/receive') 
                                    ? 'text-white border-b-2 border-blue-400 pb-1' 
                                    : 'text-white hover:text-blue-200'
                            }`}
                        >
                            Received
                            {pendingCount > 0 && (
                                <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg">
                                    {pendingCount > 9 ? '9+' : pendingCount}
                                </span>
                            )}
                        </Link>
                        <Link 
                            href="/examples" 
                            className={`font-medium transition-colors duration-200 ${
                                pathname?.startsWith('/examples') 
                                    ? 'text-white border-b-2 border-blue-400 pb-1' 
                                    : 'text-white hover:text-blue-200'
                            }`}
                        >
                            Examples
                        </Link>
                    </div>

                    {/* Wallet Connection Button */}
                    <ConnectWallet />
                </div>
            </div>
        </nav>
    );
};