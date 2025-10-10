import { useWalletContext } from "../../context/walletContext";

export const ConnectWallet = () => {
    const { userPubKey, initializeWallet } = useWalletContext();

    const handleConnect = async () => {
        await initializeWallet();
    };

    return (
        <button
            onClick={handleConnect}
            disabled={!!userPubKey}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-green-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200"
        >
            {userPubKey ? `Connected: ${userPubKey.slice(0, 6)}...${userPubKey.slice(-4)}` : 'Connect Wallet'}
        </button>
    );
};