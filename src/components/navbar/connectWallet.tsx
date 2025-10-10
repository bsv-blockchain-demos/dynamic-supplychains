import { useWalletContext } from "../../context/walletContext";
import { Spinner } from "../ui/spinner";

export const ConnectWallet = () => {
    const { userPubKey, isConnecting, initializeWallet } = useWalletContext();

    const handleConnect = async () => {
        await initializeWallet();
    };

    return (
        <button
            onClick={handleConnect}
            disabled={!!userPubKey || isConnecting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-green-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 hover:cursor-pointer flex items-center gap-2"
        >
            {isConnecting && <Spinner size="sm" />}
            {isConnecting
                ? 'Connecting...'
                : userPubKey
                    ? `Connected: ${userPubKey.slice(0, 6)}...${userPubKey.slice(-4)}`
                    : 'Connect Wallet'
            }
        </button>
    );
};