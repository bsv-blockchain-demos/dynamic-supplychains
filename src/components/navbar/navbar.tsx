import Link from "next/link";
import { ConnectWallet } from "./connectWallet";

export const Navbar = () => {
    return (
        <nav className="bg-blue-900 border-b border-blue-700 shadow-lg">
            <div className="max-w-6xl mx-auto px-8 py-4">
                <div className="flex items-center justify-between">
                    {/* Navigation Links */}
                    <div className="flex items-center space-x-8">
                        <Link 
                            href="/" 
                            className="text-white hover:text-blue-200 font-medium transition-colors duration-200"
                        >
                            Create
                        </Link>
                        <Link 
                            href="/examples" 
                            className="text-white hover:text-blue-200 font-medium transition-colors duration-200"
                        >
                            Example
                        </Link>
                    </div>

                    {/* Wallet Connection Button */}
                    <ConnectWallet />
                </div>
            </div>
        </nav>
    );
};