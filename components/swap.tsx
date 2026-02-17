"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ArrowDown, AlertTriangle, Loader2 } from "lucide-react";
import { useConnection } from "wagmi";
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
  const { isConnected } = useConnection();
  const { slippage: storeSlippage, setSlippage: setStoreSlippage } =
    useSettingsStore();

  // Token selection state
  const [fromToken, setFromToken] = useState<TokenInfo>(defaultFromToken);
  const [toToken, setToToken] = useState<TokenInfo>(defaultToToken);
  const [fromAmount, setFromAmount] = useState("");
  const [showFromModal, setShowFromModal] = useState(false);
  const [showToModal, setShowToModal] = useState(false);
  const [showSlippage, setShowSlippage] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [successState, setSuccessState] = useState<{
    txHash: string;
    fromAmount: string;
    fromSymbol: string;
    toAmount: string;
    toSymbol: string;
    isWrap: boolean;
  } | null>(null);

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
    clearError,
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
    if (value === "") { setFromAmount(value); return; }
    const decimals = fromToken.decimals;
    const regex = new RegExp(`^\\d*\\.?\\d{0,${decimals}}$`);
    if (regex.test(value)) {
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
    (isWrapOperation || !!toAmount);

  const getMainButtonText = () => {
    if (!isConnected) return "Connect Wallet";
    if (sameTokenSelected) return "Select different tokens";
    if (!fromAmount || parseFloat(fromAmount) <= 0) return "Enter an amount";
    if (insufficientBalance) return `Insufficient ${fromToken.symbol} balance`;
    if (isWrapOperation) return `Convert ${fromToken.symbol}`;
    if (quote.isLoading) return "Fetching quote...";
    if (quote.error) return "Insufficient liquidity";
    return "Swap";
  };

  const getConfirmButtonText = () => {
    if (isApproving) return "Approving...";
    if (needsApproval) return `Approve ${fromToken.symbol}`;
    if (isSwapping) return isWrapOperation ? "Converting..." : "Swapping...";
    if (isWrapOperation) return `Convert ${fromToken.symbol}`;
    return "Swap";
  };

  const handleMainButtonClick = () => {
    if (!isConnected) return;
    if (!canSwap) return;
    if (isWrapOperation) {
      // Wrap/unwrap goes directly to confirmation (no quote needed)
      setShowConfirmation(true);
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmSwap = async () => {
    const action = isWrapOperation ? "Convert" : "Swap";
    const actionVerb = isWrapOperation ? "Converting" : "Swapping";

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
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isRejected =
          msg.includes("user rejected") || msg.includes("User denied");
        toast({
          title: isRejected ? "Rejected" : "Approval Failed",
          description: isRejected
            ? "You rejected the approval."
            : "Could not approve token.",
        });
        clearError();
        return;
      }
    }

    toast({
      title: `${action} Pending`,
      description: `${actionVerb} ${fromAmount} ${fromToken.symbol} to ${toToken.symbol}...`,
    });
    try {
      const txHash = await swap();

      // Show success state in UI
      setSuccessState({
        txHash: txHash ?? "",
        fromAmount,
        fromSymbol: fromToken.symbol,
        toAmount: isWrapOperation ? fromAmount : formatAmount(toAmount, 6),
        toSymbol: toToken.symbol,
        isWrap: isWrapOperation,
      });
      setFromAmount("");
      setShowConfirmation(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRejected =
        msg.includes("user rejected") || msg.includes("User denied");
      toast({
        title: isRejected ? "Rejected" : `${action} Failed`,
        description: isRejected
          ? "You rejected the transaction."
          : "Transaction failed. Please try again.",
      });
      clearError();
    }
  };

  const buttonActive =
    canSwap ||
    (isConnected &&
      hasValidAmount &&
      needsApproval &&
      !isApproving &&
      !insufficientBalance);

  const isMainButtonDisabled = Boolean(!buttonActive && isConnected);

  // ─── Success View ──────────────────────────────────────────────────────────
  if (successState) {
    const explorerUrl = successState.txHash
      ? `https://monadscan.com/tx/${successState.txHash}`
      : "";
    const actionLabel = successState.isWrap ? "Converted" : "Swapped";

    return (
      <>
        <div className="w-full max-w-lg mx-auto space-y-3">
          {/* Top Token Summary Card */}
          <div className="bg-[#0a1612] rounded-3xl border border-white/10 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                  <Image
                    src={fromToken.logoUrl}
                    alt={successState.fromSymbol}
                    width={44}
                    height={44}
                    className="w-full h-full"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/assets/Logo.svg"; }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-white truncate">
                    {formatAmount(successState.fromAmount, 6)} {successState.fromSymbol}
                  </p>
                  <p className="text-sm text-white/40">You paid</p>
                </div>
              </div>
              <div className="flex-shrink-0 text-white/40">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10h12M12 5l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="flex items-center gap-3 min-w-0 justify-end">
                <div className="min-w-0 text-right">
                  <p className="text-xl font-bold text-[#f7931a] truncate">
                    {formatAmount(successState.toAmount, 6)} {successState.toSymbol}
                  </p>
                  <p className="text-sm text-white/40">You received</p>
                </div>
                <div className="w-11 h-11 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                  <Image
                    src={toToken.logoUrl}
                    alt={successState.toSymbol}
                    width={44}
                    height={44}
                    className="w-full h-full"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/assets/Logo.svg"; }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Success state card */}
          <div className="bg-[#0a1612] rounded-3xl border border-white/10 overflow-hidden">
            <div className="px-6 py-12 flex flex-col items-center gap-4">
              {/* Green checkmark */}
              <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M6 14l6 6 10-12" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* Title */}
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {actionLabel} {successState.fromSymbol}
                </p>
                <p className="text-2xl font-bold text-white">
                  for {successState.toSymbol}
                </p>
              </div>

              {/* View on explorer */}
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#f7931a] hover:text-[#ff9f2a] transition-colors text-sm font-medium underline underline-offset-2"
                >
                  View confirmation
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              )}
            </div>

            {/* Swap again button */}
            <div className="px-6 pb-6">
              <button
                onClick={() => setSuccessState(null)}
                className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"
              >
                {successState.isWrap ? "Convert again" : "Swap again"}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── Confirmation View ─────────────────────────────────────────────────────
  if (showConfirmation) {
    const receiveAmount = isWrapOperation ? fromAmount : toAmount;
    return (
      <>
        <div className="w-full max-w-lg mx-auto space-y-3">
          {/* Top Token Summary Card - horizontal Aerodrome style */}
          <div className="bg-[#0a1612] rounded-3xl border border-white/10 p-5">
            <div className="flex items-center justify-between gap-3">
              {/* From side */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                  <Image
                    src={fromToken.logoUrl}
                    alt={fromToken.symbol}
                    width={44}
                    height={44}
                    className="w-full h-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/assets/Logo.svg";
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-white truncate">
                    {formatAmount(fromAmount, 6)} {fromToken.symbol}
                  </p>
                  <p className="text-sm text-white/40">You pay</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0 text-white/40">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M4 10h12M12 5l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* To side */}
              <div className="flex items-center gap-3 min-w-0 justify-end">
                <div className="min-w-0 text-right">
                  <p className="text-xl font-bold text-[#f7931a] truncate">
                    {formatAmount(receiveAmount, 6)} {toToken.symbol}
                  </p>
                  <p className="text-sm text-white/40">You receive</p>
                </div>
                <div className="w-11 h-11 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                  <Image
                    src={toToken.logoUrl}
                    alt={toToken.symbol}
                    width={44}
                    height={44}
                    className="w-full h-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/assets/Logo.svg";
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Details + Actions Card */}
          <div className="bg-[#0a1612] rounded-3xl border border-white/10 overflow-hidden">
            {/* In-progress overlay */}
            {(isSwapping || isApproving) && (
              <div className="px-6 py-10 flex flex-col items-center gap-4 border-b border-white/5">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-[#f7931a]/10 border-2 border-[#f7931a]/30 flex items-center justify-center">
                    <Loader2 className="w-7 h-7 text-[#f7931a] animate-spin" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">
                    {isApproving
                      ? `Approving ${fromToken.symbol}`
                      : isWrapOperation
                      ? `Converting ${fromToken.symbol}`
                      : `Swapping ${fromToken.symbol} for ${toToken.symbol}`}
                  </p>
                  <p className="text-sm text-white/50 mt-1">
                    Confirm in your wallet
                  </p>
                </div>
              </div>
            )}

            {/* Swap Details */}
            {!isWrapOperation && (
              <div className="px-6 pt-4 pb-2">
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <span className="text-sm text-white/60">Fees</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                      <Image
                        src={fromToken.logoUrl}
                        alt={fromToken.symbol}
                        width={20}
                        height={20}
                        className="w-full h-full"
                      />
                    </div>
                    <span className="text-white/30 text-xs">&raquo;</span>
                    <div className="flex items-center gap-1 bg-[#f7931a]/10 rounded-full px-2 py-0.5 border border-[#f7931a]/20">
                      <Image
                        src="/assets/Logo.svg"
                        alt="MEGA"
                        width={12}
                        height={12}
                        className="w-3 h-3"
                      />
                      <span className="text-xs font-semibold text-[#f7931a]">
                        {feePercent}%
                      </span>
                    </div>
                    <span className="text-white/30 text-xs">&raquo;</span>
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                      <Image
                        src={toToken.logoUrl}
                        alt={toToken.symbol}
                        width={20}
                        height={20}
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <span className="text-sm text-white/60">Exchange rate</span>
                  <span className="text-sm font-medium text-white">
                    {exchangeRate > 0
                      ? `1 ${fromToken.symbol} = ${formatAmount(
                          exchangeRate,
                          4
                        )} ${toToken.symbol}`
                      : "—"}
                    {exchangeRate > 0 && (
                      <span className="text-white/40 text-xs ml-1">
                        ({quote.routeIsStable ? "Stable" : "Volatile"})
                      </span>
                    )}
                  </span>
                </div>
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
                    {priceImpact}%
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-white/60">
                    Minimum received
                  </span>
                  <span className="text-sm font-medium text-white">
                    {minReceived} {toToken.symbol}
                    <span className="text-white/40 text-xs ml-1">
                      ({slippage}% slippage)
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Wrap info */}
            {/* {isWrapOperation && (
              <div className="px-6 py-4">
                <div className="bg-[#1a3d32]/40 rounded-xl p-3 border border-white/5">
                  <p className="text-sm text-white/60 text-center">
                    1:1 conversion · No fees · No slippage
                  </p>
                </div>
              </div>
            )} */}

            {/* High price impact warning */}
            {quote.priceImpact > 5 && !isWrapOperation && (
              <div className="mx-6 mb-3 bg-red-500/10 rounded-xl p-3 flex items-center gap-2 border border-red-500/20">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-xs text-red-400 font-medium">
                  High price impact! You may receive significantly less than
                  expected.
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="px-6 pb-6 pt-3 flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  clearError();
                }}
                disabled={isSwapping || isApproving}
                className="flex-1 py-4 rounded-2xl font-bold text-base transition-all duration-200 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Change
              </button>
              <button
                onClick={handleConfirmSwap}
                disabled={isSwapping || isApproving}
                suppressHydrationWarning
                className="flex-1 py-4 rounded-2xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 bg-[#f7931a] hover:bg-[#ff9f2a] text-white shadow-lg shadow-[#f7931a]/25 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <span suppressHydrationWarning>{getConfirmButtonText()}</span>
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── Main Swap View ────────────────────────────────────────────────────────
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
                {/* Fees - Aerodrome style */}
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <span className="text-sm text-white/60">Fees</span>
                  <div className="flex items-center gap-1.5">
                    {/* From Token */}
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                      <Image
                        src={fromToken.logoUrl}
                        alt={fromToken.symbol}
                        width={20}
                        height={20}
                        className="w-full h-full"
                      />
                    </div>
                    {/* Arrow */}
                    <span className="text-white/30 text-xs">&raquo;</span>
                    {/* Fee Badge */}
                    <div className="flex items-center gap-1 bg-[#f7931a]/10 rounded-full px-2 py-0.5 border border-[#f7931a]/20">
                      <Image
                        src="/assets/Logo.svg"
                        alt="MEGA"
                        width={12}
                        height={12}
                        className="w-3 h-3"
                      />
                      <span className="text-xs font-semibold text-[#f7931a]">
                        {feePercent}%
                      </span>
                    </div>
                    {/* Arrow */}
                    <span className="text-white/30 text-xs">&raquo;</span>
                    {/* To Token */}
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                      <Image
                        src={toToken.logoUrl}
                        alt={toToken.symbol}
                        width={20}
                        height={20}
                        className="w-full h-full"
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
                  <span className="text-sm text-white/60">
                    Minimum received
                  </span>
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
              disabled={isMainButtonDisabled}
              onClick={handleMainButtonClick}
              suppressHydrationWarning
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                buttonActive
                  ? "bg-[#f7931a] hover:bg-[#ff9f2a] text-white shadow-lg shadow-[#f7931a]/25 active:scale-[0.98]"
                  : "bg-white/10 text-white/40 cursor-not-allowed"
              }`}
            >
              <span suppressHydrationWarning>{getMainButtonText()}</span>
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
