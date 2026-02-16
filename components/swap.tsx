"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ArrowDown, AlertTriangle, Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import TokenSelectModal, { Token } from "./token-select-modal";
import { useSwap } from "@/hooks/use-swap";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { toast } from "@/hooks/use-toast";
import { TOKEN_LIST, type TokenInfo } from "@/lib/token-list";
import { formatAmount } from "@/lib/format";

// Default tokens from the shared token list
const defaultFromToken = TOKEN_LIST.find((t) => t.symbol === "MON")!;
const defaultToToken = TOKEN_LIST.find((t) => t.symbol === "USDC")!;

export default function Swap() {
  const { isConnected } = useAccount();
  const { slippage: storeSlippage, setSlippage: setStoreSlippage } =
    useSettingsStore();

  // Token selection state
  const [fromToken, setFromToken] = useState<TokenInfo>(defaultFromToken);
  const [toToken, setToToken] = useState<TokenInfo>(defaultToToken);
  const [fromAmount, setFromAmount] = useState("");
  const [showFromModal, setShowFromModal] = useState(false);
  const [showToModal, setShowToModal] = useState(false);
  const [showSlippage, setShowSlippage] = useState(false);

  // Slippage from zustand store
  const slippage = storeSlippage.toString();

  // Use the swap hook with real on-chain data
  const {
    amountOut,
    quote,
    swap,
    isSwapping,
    needsApproval,
    approve,
    isApproving,
    error: swapError,
    balanceIn,
    balanceOut,
    insufficientBalance,
  } = useSwap({
    tokenIn: fromToken,
    tokenOut: toToken,
    amountIn: fromAmount,
  });

  // Derived display values
  const toAmount = amountOut;
  const exchangeRate = quote.exchangeRate;
  const priceImpact = quote.priceImpact.toFixed(5);
  const feePercent = quote.routeIsStable ? "0.05" : "0.30";
  const minReceived = toAmount
    ? (parseFloat(toAmount) * (1 - parseFloat(slippage) / 100)).toFixed(
        toToken.decimals <= 6 ? toToken.decimals : 6
      )
    : "0.00";

  const formattedBalanceIn = balanceIn ? formatAmount(balanceIn, 4) : "0.0";
  const formattedBalanceOut = balanceOut ? formatAmount(balanceOut, 4) : "0.0";

  // Handlers
  const handleFromAmountChange = (value: string) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setFromAmount(value);
    }
  };

  const handleSwapTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount("");
  };

  const handleSelectFromToken = (token: Token) => {
    setFromToken(token as unknown as TokenInfo);
    setShowFromModal(false);
    setFromAmount("");
  };

  const handleSelectToToken = (token: Token) => {
    setToToken(token as unknown as TokenInfo);
    setShowToModal(false);
  };

  // Determine if same token is selected on both sides
  // Allow MON <-> WMON swaps (wrap/unwrap operations)
  const sameTokenSelected = fromToken.symbol === toToken.symbol;

  // Detect wrap/unwrap operations (MON <-> WMON)
  const isWrapOperation =
    (fromToken.symbol === "MON" && toToken.symbol === "WMON") ||
    (fromToken.symbol === "WMON" && toToken.symbol === "MON");

  // Button state logic
  const hasValidAmount = !!fromAmount && parseFloat(fromAmount) > 0;
  const canSwap =
    isConnected &&
    hasValidAmount &&
    !insufficientBalance &&
    !isSwapping &&
    !isApproving &&
    !quote.isLoading &&
    !sameTokenSelected &&
    (isWrapOperation || !!toAmount); // For wrap, don't need quote

  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet";
    if (sameTokenSelected) return "Select different tokens";
    if (!fromAmount || parseFloat(fromAmount) <= 0) return "Enter an amount";
    if (insufficientBalance) return `Insufficient ${fromToken.symbol} balance`;

    // Wrap operation button text
    if (isWrapOperation) {
      if (isApproving) return "Approving...";
      if (needsApproval) return `Approve ${fromToken.symbol}`;
      if (isSwapping) return `Converting...`;
      return `Convert ${fromToken.symbol}`;
    }

    // Regular swap button text
    if (quote.isLoading) return "Fetching quote...";
    if (quote.error) return "Insufficient liquidity";
    if (isApproving) return "Approving...";
    if (needsApproval) return `Approve ${fromToken.symbol}`;
    if (isSwapping) return "Swapping...";
    return "Swap";
  };

  const handleSwapClick = async () => {
    if (!canSwap && !needsApproval) return;

    if (needsApproval) {
      toast({
        title: "Approval Pending",
        description: `Approving ${fromToken.symbol} for trading...`,
      });
      try {
        await approve();
        toast({
          title: "Approved",
          description: `${fromToken.symbol} approved successfully.`,
        });
      } catch {
        toast({
          title: "Approval Failed",
          description: swapError || "Could not approve token.",
        });
        return;
      }
    }

    // Different toast messages for wrap/unwrap vs swap
    const action = isWrapOperation ? "Convert" : "Swap";
    const actionVerb = isWrapOperation ? "Converting" : "Swapping";
    const actionPastTense = isWrapOperation ? "Converted" : "Swapped";

    toast({
      title: `${action} Pending`,
      description: `${actionVerb} ${fromAmount} ${fromToken.symbol} to ${toToken.symbol}...`,
    });
    try {
      const txHash = await swap();
      const explorerUrl = txHash ? `https://monadscan.com/tx/${txHash}` : "";

      toast({
        title: `${action} Successful`,
        description: (
          <div className="flex flex-col gap-1">
            <span>
              {actionPastTense} {fromAmount} {fromToken.symbol} to{" "}
              {isWrapOperation ? fromAmount : formatAmount(toAmount, 6)}{" "}
              {toToken.symbol}
            </span>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#f7931a] hover:underline text-xs"
              >
                View on Explorer →
              </a>
            )}
          </div>
        ),
      });
      setFromAmount("");
    } catch {
      toast({
        title: `${action} Failed`,
        description: swapError || "Transaction failed. Please try again.",
      });
    }
  };

  const buttonActive =
    canSwap ||
    (isConnected &&
      hasValidAmount &&
      needsApproval &&
      !isApproving &&
      !insufficientBalance);

  // Compute button disabled state - disabled only when connected but not active
  const isButtonDisabled = Boolean(!buttonActive && isConnected);

  return (
    <>
      <div className="w-full max-w-lg mx-auto">
        {/* Main Swap Card */}
        <div className="bg-[#0a1612] rounded-3xl border border-white/10 overflow-hidden">
          {/* Sell Section */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-base font-semibold text-white">Sell</span>
              <div className="flex items-center gap-2">
                <span
                  className="text-sm text-white/50"
                  suppressHydrationWarning
                >
                  Balance{" "}
                  <span className="text-[#f7931a]">
                    {formattedBalanceIn} {fromToken.symbol}
                  </span>
                </span>
                <button
                  onClick={() => setFromAmount(balanceIn)}
                  className="text-xs font-semibold text-[#f7931a] hover:text-[#ff9f2a] transition-colors px-2 py-1 rounded bg-[#f7931a]/10 hover:bg-[#f7931a]/20"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Sell Input Box */}
            <div className="bg-[#0d1f1a] rounded-2xl border border-white/10 p-4">
              <div className="flex items-center justify-between gap-4">
                {/* Token Selector - Left */}
                <button
                  onClick={() => setShowFromModal(true)}
                  className="flex items-center gap-2 bg-[#1a3d32] hover:bg-[#1f4a3d] transition-all rounded-full px-3 py-2 border border-white/10"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                    <Image
                      src={fromToken.logoUrl}
                      alt={fromToken.symbol}
                      width={28}
                      height={28}
                      className="w-7 h-7"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/assets/Logo.svg";
                      }}
                    />
                  </div>
                  <span className="font-semibold text-white">
                    {fromToken.symbol}
                  </span>
                  <ChevronDown className="w-4 h-4 text-white/60" />
                </button>

                {/* Amount Input - Right */}
                <div className="flex-1 text-right">
                  <input
                    type="text"
                    value={fromAmount}
                    onChange={(e) => handleFromAmountChange(e.target.value)}
                    placeholder="0"
                    className="w-full bg-transparent text-3xl font-bold text-[#f7931a] text-right placeholder:text-white/20 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Divider with Swap Button */}
          <div className="relative px-6">
            <div className="absolute inset-x-6 top-1/2 h-px bg-white/10" />
            <div className="flex justify-center">
              <button
                onClick={handleSwapTokens}
                className="relative z-10 w-10 h-10 rounded-full bg-[#1a3d32] border-4 border-[#0a1612] flex items-center justify-center hover:bg-[#f7931a] transition-all duration-300 group"
              >
                <ArrowDown className="w-4 h-4 text-[#f7931a] group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>

          {/* Buy Section */}
          <div className="p-6 pt-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-base font-semibold text-white">Buy</span>
              <span className="text-sm text-white/50" suppressHydrationWarning>
                Balance{" "}
                <span className="text-[#f7931a]">
                  {formattedBalanceOut} {toToken.symbol}
                </span>
              </span>
            </div>

            {/* Buy Input Box */}
            <div className="bg-[#0d1f1a] rounded-2xl border border-white/10 p-4">
              <div className="flex items-center justify-between gap-4">
                {/* Token Selector - Left */}
                <button
                  onClick={() => setShowToModal(true)}
                  className="flex items-center gap-2 bg-[#1a3d32] hover:bg-[#1f4a3d] transition-all rounded-full px-3 py-2 border border-white/10"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                    <Image
                      src={toToken.logoUrl}
                      alt={toToken.symbol}
                      width={28}
                      height={28}
                      className="w-7 h-7"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/assets/Logo.svg";
                      }}
                    />
                  </div>
                  <span className="font-semibold text-white">
                    {toToken.symbol}
                  </span>
                  <ChevronDown className="w-4 h-4 text-white/60" />
                </button>

                {/* Amount Output - Right */}
                <div className="flex-1 text-right">
                  <div className="text-3xl font-bold text-white truncate">
                    {quote.isLoading ? (
                      <span className="text-white/40 animate-pulse">...</span>
                    ) : toAmount ? (
                      formatAmount(toAmount, 6)
                    ) : (
                      "0"
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Swap Details - Hide for wrap/unwrap operations */}
          {fromAmount &&
            parseFloat(fromAmount) > 0 &&
            !sameTokenSelected &&
            !isWrapOperation && (
            <div className="px-6 pb-6 space-y-0 border-t border-white/5 pt-4">
              {/* Fees */}
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-sm text-white/60">Fees</span>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#f7931a]/20 flex items-center justify-center">
                    <Image
                      src="/assets/Logo.svg"
                      alt="MEGA"
                      width={14}
                      height={14}
                      className="w-3.5 h-3.5"
                    />
                  </div>
                  <span className="text-sm font-medium text-white">
                    {feePercent}%
                  </span>
                  <span className="text-white/30">&raquo;</span>
                  <div className="w-5 h-5 rounded-full bg-[#f7931a]/20 flex items-center justify-center">
                    <Image
                      src="/assets/Logo.svg"
                      alt="MEGA"
                      width={14}
                      height={14}
                      className="w-3.5 h-3.5"
                    />
                  </div>
                </div>
              </div>

              {/* Exchange Rate */}
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-sm text-white/60">Exchange rate</span>
                <span className="text-sm font-medium text-white">
                  {exchangeRate > 0 ? (
                    <>
                      1 {fromToken.symbol} = {formatAmount(exchangeRate, 4)}{" "}
                      {toToken.symbol}
                      <span className="text-white/40 text-xs ml-1">
                        ({quote.routeIsStable ? "Stable" : "Volatile"})
                      </span>
                    </>
                  ) : quote.isLoading ? (
                    "Loading..."
                  ) : (
                    "—"
                  )}
                </span>
              </div>

              {/* Price Impact */}
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-sm text-white/60">Price impact</span>
                <span
                  className={`text-sm font-medium ${
                    quote.priceImpact > 5
                      ? "text-red-400"
                      : quote.priceImpact > 1
                      ? "text-yellow-400"
                      : "text-white"
                  }`}
                >
                  {quote.isLoading ? "..." : `${priceImpact}%`}
                </span>
              </div>

              {/* Minimum Received */}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-white/60">Minimum received</span>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowSlippage(!showSlippage)}
                      className="text-sm text-[#f7931a] hover:text-[#ff9f2a] transition-colors flex items-center gap-1"
                    >
                      Slippage {slippage}%
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {showSlippage && (
                      <div className="absolute right-0 top-full mt-2 bg-[#0a1612] rounded-xl border border-white/10 shadow-xl z-50 p-2 flex gap-1">
                        {["0.1", "0.5", "1", "3"].map((val) => (
                          <button
                            key={val}
                            onClick={() => {
                              setStoreSlippage(parseFloat(val));
                              setShowSlippage(false);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              slippage === val
                                ? "bg-[#f7931a] text-white"
                                : "bg-white/5 text-white/60 hover:bg-white/10"
                            }`}
                          >
                            {val}%
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-white">
                    {minReceived} {toToken.symbol}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Warning Banner */}
          {insufficientBalance && (
            <div className="mx-6 mb-6 bg-[#f7931a]/10 rounded-xl p-4 flex items-center gap-3 border border-[#f7931a]/20">
              <AlertTriangle className="w-5 h-5 text-[#f7931a] flex-shrink-0" />
              <span className="text-sm text-[#f7931a] font-medium">
                Warning: Not enough {fromToken.symbol} amount
              </span>
            </div>
          )}

          {/* High Price Impact Warning */}
          {quote.priceImpact > 5 && hasValidAmount && (
            <div className="mx-6 mb-6 bg-red-500/10 rounded-xl p-4 flex items-center gap-3 border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-400 font-medium">
                High price impact! You may receive significantly less than
                expected.
              </span>
            </div>
          )}

          {/* Error Display */}
          {swapError && (
            <div className="mx-6 mb-6 bg-red-500/10 rounded-xl p-4 flex items-center gap-3 border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-400 font-medium">
                {swapError}
              </span>
            </div>
          )}

          {/* Swap Button */}
          <div className="px-6 pb-6">
            <button
              disabled={isButtonDisabled}
              onClick={handleSwapClick}
              suppressHydrationWarning
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                buttonActive
                  ? "bg-[#f7931a] hover:bg-[#ff9f2a] text-white shadow-lg shadow-[#f7931a]/25 active:scale-[0.98]"
                  : "bg-white/10 text-white/40 cursor-not-allowed"
              }`}
            >
              {(isSwapping || isApproving) && (
                <Loader2 className="w-5 h-5 animate-spin" />
              )}
              <span suppressHydrationWarning>{getButtonText()}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Token Selection Modals */}
      <TokenSelectModal
        isOpen={showFromModal}
        onClose={() => setShowFromModal(false)}
        onSelect={handleSelectFromToken}
        selectedToken={fromToken as unknown as Token}
        excludeToken={toToken as unknown as Token}
      />
      <TokenSelectModal
        isOpen={showToModal}
        onClose={() => setShowToModal(false)}
        onSelect={handleSelectToToken}
        selectedToken={toToken as unknown as Token}
        excludeToken={fromToken as unknown as Token}
      />
    </>
  );
}
