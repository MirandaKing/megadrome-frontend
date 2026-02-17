"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import ConnectWalletModal from "@/components/connect-wallet-modal";
import { useAccount, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { monad } from "@/lib/wagmi";
import {
  ChevronDown,
  LogOut,
  Copy,
  ExternalLink,
  Check,
  Menu,
  X,
  AlertTriangle,
} from "lucide-react";

export default function Header() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Wagmi hooks
  const { address, isConnected, chainId: accountChainId } = useAccount();
  const { disconnect } = useDisconnect();
  const globalChainId = useChainId();
  const { switchChain } = useSwitchChain();

  // Use account chainId if available, otherwise global chainId
  const currentChainId = accountChainId || globalChainId;

  // Prevent hydration mismatch: wagmi auto-reconnects on client,
  // so isConnected can differ between server (false) and client (true)
  useEffect(() => {
    setMounted(true);
  }, []);
  const pathname = usePathname();

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/swap", label: "Swap" },
    { href: "/liquidity", label: "Liquidity" },
    { href: "/vote", label: "Vote" },
    { href: "/lock", label: "Lock" },
    { href: "/incentivize", label: "Incentivize" },
  ];

  const isActiveLink = (href: string) => {
    if (href === "/liquidity") {
      return pathname.startsWith("/liquidity");
    }
    return pathname === href;
  };

  return (
    <>
      <header className="w-full border-b border-white/5 bg-transparent relative z-50">
        <div className="max-w-[1400px] mx-auto px-4 py-4 sm:px-6 sm:py-5 md:px-12 lg:px-20 w-full flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-1.png"
              alt="Megadrome Logo"
              width={36}
              height={36}
            />
            <span className="hidden sm:inline text-white text-xl font-semibold tracking-wide">megadrome</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors text-sm font-medium tracking-wide ${isActiveLink(link.href)
                  ? "text-white"
                  : "text-white/60 hover:text-white"
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Side - Connect Button & Hamburger */}
          <div className="flex items-center gap-3">
            {/* Connect Button / Wallet Dropdown */}
            {mounted && isConnected && address ? (
              currentChainId !== monad.id ? (
                <Button
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 rounded-lg px-4 py-2 h-auto font-medium text-sm transition-all flex items-center gap-2"
                  onClick={() => switchChain({ chainId: monad.id })}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span className="hidden sm:inline">Switch to Monad</span>
                  <span className="sm:hidden">Switch</span>
                </Button>
              ) : (
                <div className="relative">
                  <Button
                    className="bg-[#0d1f1a] hover:bg-[#1a3a2f] cursor-pointer text-white rounded-lg px-3 py-2 sm:px-4 h-auto font-medium text-sm border border-white/10 transition-all flex items-center gap-2"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    {/* Monad chain indicator */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" className="flex-shrink-0"><path fill="#836EF9" d="M12 3c-2.599 0-9 6.4-9 9s6.401 9 9 9s9-6.401 9-9s-6.401-9-9-9m-1.402 14.146c-1.097-.298-4.043-5.453-3.744-6.549s5.453-4.042 6.549-3.743c1.095.298 4.042 5.453 3.743 6.549c-.298 1.095-5.453 4.042-6.549 3.743" /></svg>
                    <span className="hidden sm:inline">{truncateAddress(address)}</span>
                    <span className="sm:hidden">{address.slice(0, 4)}...</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </Button>

                  {/* Dropdown menu */}
                  {isDropdownOpen && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsDropdownOpen(false)}
                      />

                      <div className="absolute right-0 top-full mt-2 w-56 bg-[#0a1612] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                        {/* Connected status */}
                        <div className="px-4 py-3 border-b border-white/5">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-xs text-white/60">Connected to Monad</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="p-2">
                          <button
                            onClick={copyAddress}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          >
                            {copied ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                            {copied ? 'Copied!' : 'Copy Address'}
                          </button>

                          <a
                            href={`https://monadscan.com/address/${address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            onClick={() => setIsDropdownOpen(false)}
                          >
                            <ExternalLink className="w-4 h-4" />
                            View on Explorer
                          </a>

                          <button
                            onClick={() => {
                              disconnect()
                              setIsDropdownOpen(false)
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Disconnect
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )
            ) : (
              <Button
                className="bg-[#f7931a] hover:bg-[#ff9f2a] cursor-pointer text-white rounded-lg px-4 py-2 h-auto font-bold text-sm border-0 transition-transform active:scale-95"
                onClick={() => setIsWalletModalOpen(true)}
              >
                Connect
              </Button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Slide-in Menu */}
          <div className="absolute right-0 top-0 h-full w-72 bg-[#0a1612] border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Menu Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
              <span className="text-white font-semibold">Menu</span>
              <button
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Menu Content */}
            <div className="p-6">
              {/* Navigation Links */}
              <nav className="space-y-2 mb-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActiveLink(link.href)
                      ? "bg-[#f7931a]/10 text-[#f7931a]"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                      }`}
                  >
                    {link.label === "Swap" && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m16 3 4 4-4 4" />
                        <path d="M20 7H4" />
                        <path d="m8 21-4-4 4-4" />
                        <path d="M4 17h16" />
                      </svg>
                    )}
                    {link.label === "Liquidity" && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                      </svg>
                    )}
                    {link.label === "Dashboard" && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect width="7" height="9" x="3" y="3" rx="1" />
                        <rect width="7" height="5" x="14" y="3" rx="1" />
                        <rect width="7" height="9" x="14" y="12" rx="1" />
                        <rect width="7" height="5" x="3" y="16" rx="1" />
                      </svg>
                    )}
                    {link.label === "Vote" && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m9 12 2 2 4-4" />
                        <path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z" />
                        <path d="M22 19H2" />
                      </svg>
                    )}
                    {link.label === "Lock" && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          width="18"
                          height="11"
                          x="3"
                          y="11"
                          rx="2"
                          ry="2"
                        />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    )}
                    {link.label === "Incentivize" && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2v4" />
                        <path d="m6.8 14-3.5 2" />
                        <path d="m20.7 16-3.5-2" />
                        <path d="M6.8 10 3.3 8" />
                        <path d="m20.7 8-3.5 2" />
                        <path d="m9 22 3-8 3 8" />
                        <path d="M8 22h8" />
                        <path d="M12 6a4 4 0 0 0-4 4c0 1.5.8 2.8 2 3.4" />
                        <path d="M12 6a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.4" />
                      </svg>
                    )}
                    <span className="font-medium">{link.label}</span>
                  </Link>
                ))}
              </nav>

              {/* Divider */}
              <div className="border-t border-white/10 my-6" />

              {/* Additional Links */}
              <div className="space-y-2">
                <a
                  href="https://docs.megadrome.finance"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
                  </svg>
                  <span className="font-medium">Docs</span>
                  <ExternalLink className="w-4 h-4 ml-auto opacity-50" />
                </a>
                <a
                  href="https://twitter.com/megadrome"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span className="font-medium">Twitter</span>
                  <ExternalLink className="w-4 h-4 ml-auto opacity-50" />
                </a>
                <a
                  href="https://discord.gg/megadrome"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                  </svg>
                  <span className="font-medium">Discord</span>
                  <ExternalLink className="w-4 h-4 ml-auto opacity-50" />
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t border-white/5 bg-[#080c0a]">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Monad Mainnet
              </div>
            </div>
          </div>
        </div>
      )}

      <ConnectWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </>
  );
}
