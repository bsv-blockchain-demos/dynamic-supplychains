'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWallet } from "./connectWallet";

export const Navbar = () => {
    const pathname = usePathname();

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