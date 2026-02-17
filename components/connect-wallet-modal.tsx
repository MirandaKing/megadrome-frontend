"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useConnect, useConnection, useDisconnect } from "wagmi";
import { Loader2 } from "lucide-react";

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Wallet Icons
const MetaMaskIcon = () => (
  <Image
    src="/assets/MetaMask-icon-fox.svg"
    alt="MetaMask"
    width={24}
    height={24}
  />
);

const WalletConnectIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className="size-6"
  >
    <rect width="24" height="24" rx="12" fill="#3396FF" />
    <path
      d="M6.71596 8.6095C9.68402 5.70813 14.5085 5.70813 17.4877 8.6095L17.8434 8.9541C17.9879 9.09862 17.9879 9.33206 17.8434 9.47657L16.6206 10.666C16.5428 10.7438 16.4205 10.7438 16.3538 10.666L15.8647 10.188C13.786 8.16484 10.4288 8.16484 8.35006 10.188L7.82759 10.6994C7.74978 10.7772 7.6275 10.7772 7.5608 10.6994L6.338 9.50992C6.19349 9.36541 6.19349 9.13197 6.338 8.98745L6.72707 8.6095H6.71596ZM20.0111 11.0773L21.1005 12.1445C21.245 12.289 21.245 12.5225 21.1005 12.667L16.1871 17.4581C16.0426 17.6026 15.798 17.6026 15.6535 17.4581L12.163 14.0565C12.1296 14.0232 12.0629 14.0232 12.0296 14.0565L8.53904 17.4581C8.39453 17.6026 8.14997 17.6026 8.00545 17.4581L3.09203 12.667C2.94751 12.5225 2.94751 12.289 3.09203 12.1445L4.18143 11.0773C4.32594 10.9328 4.5705 10.9328 4.71501 11.0773L8.20555 14.4789C8.2389 14.5123 8.3056 14.5123 8.33894 14.4789L11.8295 11.0773C11.974 10.9328 12.2186 10.9328 12.3631 11.0773L15.8536 14.4789C15.8869 14.5123 15.9536 14.5123 15.987 14.4789L19.4775 11.0773C19.622 10.9328 19.8666 10.9328 20.0111 11.0773Z"
      fill="white"
    />
  </svg>
);

const BrowserWalletIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className="size-6"
  >
    <g clipPath="url(#clip0_browser)">
      <path
        d="M24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24C18.6274 24 24 18.6274 24 12Z"
        fill="black"
      />
      <path
        d="M17.25 12V9.08333H7.91667C7.60725 9.08333 7.3105 8.96042 7.09171 8.74162C6.87292 8.52283 6.75 8.22609 6.75 7.91667C6.75 7.60725 6.87292 7.3105 7.09171 7.09171C7.3105 6.87292 7.60725 6.75 7.91667 6.75H16.0833V9.08333"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.75 7.91675V16.0834C6.75 16.3928 6.87292 16.6896 7.09171 16.9084C7.3105 17.1271 7.60725 17.2501 7.91667 17.2501H17.25V14.3334"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.4999 12C15.1905 12 14.8938 12.1229 14.675 12.3417C14.4562 12.5605 14.3333 12.8572 14.3333 13.1667C14.3333 13.4761 14.4562 13.7728 14.675 13.9916C14.8938 14.2104 15.1905 14.3333 15.4999 14.3333H17.8333V12H15.4999Z"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_browser">
        <rect width="24" height="24" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

export default function ConnectWalletModal({
  isOpen,
  onClose,
}: ConnectWalletModalProps) {
  const { connectors, connect, isPending, error } = useConnect();
  const { isConnected } = useConnection();
  const { disconnect } = useDisconnect();

  // Close modal when connected
  useEffect(() => {
    if (isConnected && isOpen) {
      onClose();
    }
  }, [isConnected, isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Get display info for connectors
  const getConnectorIcon = (connectorId: string, connectorName: string) => {
    const id = connectorId.toLowerCase();
    const name = connectorName.toLowerCase();

    if (id.includes("metamask") || name.includes("metamask")) {
      return <MetaMaskIcon />;
    }
    if (id.includes("walletconnect") || name.includes("walletconnect")) {
      return <WalletConnectIcon />;
    }
    // Default to MetaMask icon for injected wallets
    if (id.includes("injected")) {
      return <MetaMaskIcon />;
    }
    return <BrowserWalletIcon />;
  };

  const getConnectorName = (connector: (typeof connectors)[0]) => {
    if (connector.id === "injected" && connector.name === "Injected") {
      return "Browser Wallet";
    }
    return connector.name;
  };

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden"
      onClick={handleBackdropClick}
    >
      {/* Full screen modal with gradient background */}
      <div
        className="min-h-screen w-full overflow-x-hidden overflow-y-auto"
        style={{
          background:
            "linear-gradient(180deg, #FFC4A2 24%, #FFE4C0 70%, #F8F5F1 100%)",
        }}
      >
        <div className="flex min-h-screen">
          {/* Left Panel - Hidden on mobile */}
          <div className="relative hidden max-w-lg shrink-0 flex-col items-start gap-8 bg-[#f7931a] p-16 text-white lg:flex">
            <h2 className="text-4xl font-semibold">
              Swap, deposit,
              <br />
              take the lead
            </h2>
            <p className="text-lg">
              Megadrome is a{" "}
              <span className="font-semibold">decentralized exchange</span>{" "}
              where you can execute low-fee swaps, deposit tokens to earn
              rewards, and actively participate in the onchain economy.
            </p>
            <button
              onClick={onClose}
              className="group inline-flex items-center gap-1.5 font-semibold hover:opacity-80 transition-opacity"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4 transition-transform duration-300 group-hover:-translate-x-1"
              >
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
              Back to app
            </button>

            {/* Decorative SVG at bottom */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="584"
              height="160"
              viewBox="0 0 584 160"
              fill="none"
              className="pointer-events-none absolute bottom-8 right-8 w-auto opacity-20"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M26.5032 26.6221L0.584473 0.703356L1.28783 0L27.2066 25.9187C100.593 99.3053 200.127 140.533 303.911 140.533C407.695 140.533 507.229 99.3053 580.616 25.9188L581.319 26.6221C507.746 100.195 407.959 141.528 303.911 141.528C199.863 141.528 100.076 100.195 26.5032 26.6221Z"
                fill="white"
              />
            </svg>
          </div>

          {/* Right Panel - Wallet Connection */}
          <div className="flex grow flex-col items-center justify-center gap-8 p-6 md:p-16">
            {/* Logo */}
            <Link href="/" onClick={onClose}>
              <span className="sr-only">Megadrome</span>
              <div className="flex items-center gap-2">
                <Image
                  src="/logo-1.png"
                  alt="Megadrome Logo"
                  width={48}
                  height={48}
                  className="w-12 h-12"
                />
                <span className="text-gray-800 text-2xl font-semibold tracking-wide">
                  megadrome
                </span>
              </div>
            </Link>

            {/* Wallet Card */}
            <div className="w-full max-w-xs rounded-xl bg-[#f5f3e6] p-5">
              <div className="flex w-full flex-col gap-5">
                <h1 className="sr-only">Connect</h1>

                {/* Info text */}
                <div className="text-xs text-gray-600">
                  <p>
                    Connect your wallet to continue.
                    <br />
                    <span className="text-[#f7931a] font-medium">
                      Monad Testnet
                    </span>{" "}
                    only.
                  </p>
                </div>

                {/* Error message */}
                {error && (
                  <div className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">
                    {error.message}
                  </div>
                )}

                {/* Wallet buttons */}
                <div className="flex flex-col gap-2">
                  {connectors.map((connector) => (
                    <button
                      key={connector.uid}
                      className="relative inline-flex items-center border border-transparent text-center font-semibold transition hover:opacity-80 bg-white text-gray-800 px-4 py-2.5 rounded-full justify-start text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      type="button"
                      disabled={isPending}
                      onClick={() => connect({ connector })}
                    >
                      <div className="inline-flex items-center justify-center gap-3 transition">
                        {isPending ? (
                          <Loader2 className="w-6 h-6 animate-spin text-[#f7931a]" />
                        ) : (
                          getConnectorIcon(connector.id, connector.name)
                        )}
                        {getConnectorName(connector)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <footer className="w-full text-center text-xs text-gray-500">
              2026 © Megadrome Finance. v1.0.0
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
