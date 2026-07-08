'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWallet } from "./connectWallet";
import { useWalletContext } from "../../context/walletContext";
import { useState, useEffect } from "react";
import { Brand } from "../common/brand";
import { Icon, type IconName } from "../common/icon";
import { ThemeToggle } from "../common/theme-toggle";

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

    const active: "home" | "create" | "receive" | "directory" =
        pathname?.startsWith('/create') ? 'create'
        : pathname?.startsWith('/receive') ? 'receive'
        : pathname?.startsWith('/directory') ? 'directory'
        : 'home';

    const navLink = (id: typeof active, href: string, label: string, icon: IconName) => (
        <Link href={href} className={`nav-link${active === id ? ' active' : ''}`}>
            <Icon name={icon} size={15} />
            {label}
            {id === 'receive' && pendingCount > 0 && (
                <span className="nav-pending" aria-label={`${pendingCount} pending`}>
                    {pendingCount > 9 ? '9+' : pendingCount}
                </span>
            )}
        </Link>
    );

    return (
        <nav className="nav">
            <Brand />
            <div className="nav-links">
                {navLink('create', '/create', 'Create', 'plus')}
                {navLink('receive', '/receive', 'Inbox', 'inbox')}
                {navLink('directory', '/directory', 'Directory', 'scroll-text')}
                <Link href="/#how-it-works" className="nav-link">
                    <Icon name="circle-help" size={15} />
                    How it works
                </Link>
            </div>
            <div className="nav-spacer" />
            <ThemeToggle />
            <ConnectWallet />
        </nav>
    );
};
