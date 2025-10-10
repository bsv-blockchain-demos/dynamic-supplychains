"use client"

import {
    WalletClient,
} from '@bsv/sdk'
import { useContext, createContext, useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";

type WalletContextType = {
    userWallet: WalletClient | null;
    userPubKey: string | null;
    initializeWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
    userWallet: null,
    userPubKey: null,
    initializeWallet: async () => { },
});

export const WalletContextProvider = ({ children }: { children: React.ReactNode }) => {
    const [userWallet, setUserWallet] = useState<WalletContextType['userWallet']>(null);
    const [userPubKey, setUserPubKey] = useState<WalletContextType['userPubKey']>(null);

    const initializeWallet = useCallback(async () => {
        try {
            const newWallet = new WalletClient('auto', 'localhost:4000');

            const isConnected = await newWallet.isAuthenticated();
            if (!isConnected) {
                console.error('Wallet not authenticated');
                return;
            }

            const { publicKey } = await newWallet.getPublicKey({ identityKey: true });

            // Only update state once everything is fetched
            setUserWallet(newWallet);
            setUserPubKey(publicKey);
            toast.success('Wallet connected successfully', {
                duration: 5000,
                position: 'top-center',
                id: 'wallet-connect-success',
            });
        } catch (error) {
            console.error('Failed to initialize wallet:', error);
            toast.error('Failed to connect wallet', {
                duration: 5000,
                position: 'top-center',
                id: 'wallet-connect-error',
            });
        }
    }, []);

    useEffect(() => {
        initializeWallet();
    }, []);

    return (
        <WalletContext.Provider value={{ userWallet, userPubKey, initializeWallet }}>
            {children}
        </WalletContext.Provider>
    );
};

export const useWalletContext = () => useContext(WalletContext);