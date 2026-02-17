"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Lock, AlertTriangle, Loader2 } from "lucide-react";
import { useConnection } from "wagmi";
import { useLock } from "@/hooks/use-lock";
import { toast } from "@/hooks/use-toast";
import { formatAmount } from "@/lib/format";

const MAX_LOCK_WEEKS = 208; // ~4 years
const MIN_LOCK_WEEKS = 1; // 7 days
const TOKEN_SYMBOL = "MEGA";

export default function CreateLock() {
  const { isConnected } = useConnection();
  const [amount, setAmount] = useState("");
  const [lockWeeks, setLockWeeks] = useState(208);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [successState, setSuccessState] = useState<{
    txHash: string;
    amount: string;
    lockDuration: string;
    vePower: string;
  } | null>(null);

  const {
    balance,
    insufficientBalance,
    needsApproval,
    approve,
    isApproving,
    createLock,
    isCreating,
    error: lockError,
    clearError,
  } = useLock({ amountIn: amount, lockWeeks });

  // Derived values
  const megaAmount = parseFloat(amount) || 0;
  const lockRatio = lockWeeks / MAX_LOCK_WEEKS;
  const veMegaAmount = megaAmount * lockRatio;
  const hasValidAmount = !!amount && megaAmount > 0;

  const formatLockDuration = (weeks: number) => {
    if (weeks >= 52) {
      const years = Math.floor(weeks / 52);
      const remainingWeeks = weeks % 52;
      if (remainingWeeks === 0) return `${years} year${years !== 1 ? "s" : ""}`;
      return `${years}y ${remainingWeeks}w`;
    }
    return `${weeks * 7} days`;
  };

  const handleAmountChange = (value: string) => {
    if (value === "") { setAmount(value); return; }
    // MEGA has 18 decimals
    if (/^\d*\.?\d{0,18}$/.test(value)) {
      setAmount(value);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLockWeeks(parseInt(e.target.value));
  };

  // Button state
  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet";
    if (!hasValidAmount) return "Enter an amount";
    if (insufficientBalance) return `Insufficient ${TOKEN_SYMBOL} balance`;
    return "Create Lock";
  };

  const buttonActive =
    isConnected && hasValidAmount && !insufficientBalance;

  // Confirmation button
  const getConfirmButtonText = () => {
    if (isApproving) return `Approving ${TOKEN_SYMBOL}...`;
    if (needsApproval) return `Approve ${TOKEN_SYMBOL}`;
    if (isCreating) return "Creating Lock...";
    return "Create Lock";
  };

  const handleConfirmLock = async () => {
    if (needsApproval) {
      toast({
        title: "Approval Pending",
        description: `Approving ${TOKEN_SYMBOL} for locking...`,
      });
      try {
        await approve();
        toast({
          title: "Approved",
          description: `${TOKEN_SYMBOL} approved successfully.`,
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
      title: "Lock Pending",
      description: `Locking ${amount} ${TOKEN_SYMBOL} for ${formatLockDuration(lockWeeks)}...`,
    });

    try {
      const txHash = await createLock();
      setSuccessState({
        txHash: txHash ?? "",
        amount: formatAmount(amount, 4),
        lockDuration: formatLockDuration(lockWeeks),
        vePower: veMegaAmount.toFixed(4),
      });
      setAmount("");
      setShowConfirmation(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRejected =
        msg.includes("user rejected") || msg.includes("User denied");
      toast({
        title: isRejected ? "Rejected" : "Lock Failed",
        description: isRejected
          ? "You rejected the transaction."
          : "Transaction failed. Please try again.",
      });
      clearError();
    }
  };

  // ─── Success View ───────────────────────────────────────────────────────────
  if (successState) {
    const explorerUrl = successState.txHash
      ? `https://monadscan.com/tx/${successState.txHash}`
      : "";

    return (
      <div className="w-full max-w-lg mx-auto space-y-3">
        {/* Summary Card */}
        <div className="bg-[#0a1612] rounded-3xl border border-white/10 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#f7931a]/20 border border-[#f7931a]/30 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l4 4 6-8" stroke="#f7931a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-sm font-semibold text-white">New lock</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Image
                src="/assets/Logo.svg"
                alt={TOKEN_SYMBOL}
                width={20}
                height={20}
                className="w-5 h-5 flex-shrink-0"
              />
              <span className="text-sm font-bold text-white truncate">
                {successState.amount} {TOKEN_SYMBOL}
              </span>
              <span className="text-sm text-white/40 flex-shrink-0">
                locked for {successState.lockDuration}
              </span>
            </div>
          </div>
        </div>

        {/* Success Card */}
        <div className="bg-[#0a1612] rounded-3xl border border-white/10 overflow-hidden">
          <div className="px-6 py-12 flex flex-col items-center gap-4">
            {/* Checkmark */}
            <div className="w-16 h-16 rounded-full bg-[#f7931a]/20 border-2 border-[#f7931a]/40 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M6 14l6 6 10-12" stroke="#f7931a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Title */}
            <div className="text-center">
              <p className="text-2xl font-bold text-white">Lock (veNFT)</p>
              <p className="text-2xl font-bold text-white">has been created</p>
            </div>

            {/* Voting power note */}
            <p className="text-sm text-white/40 text-center">
              {successState.vePower} ve{TOKEN_SYMBOL} voting power
            </p>

            {/* Explorer link */}
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

          {/* Manage locks button */}
          <div className="px-6 pb-6">
            <Link
              href="/lock"
              className="flex items-center justify-center w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"
            >
              Manage locks
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Confirmation View ──────────────────────────────────────────────────────
  if (showConfirmation) {
    return (
      <div className="w-full max-w-lg mx-auto space-y-3">
        {/* Summary Card */}
        <div className="bg-[#0a1612] rounded-3xl border border-white/10 p-5">
          <div className="flex items-center justify-between gap-4">
            {/* Token + Amount */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center">
                <Image
                  src="/assets/Logo.svg"
                  alt={TOKEN_SYMBOL}
                  width={44}
                  height={44}
                  className="w-full h-full"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-white truncate">
                  {formatAmount(amount, 6)} {TOKEN_SYMBOL}
                </p>
                <p className="text-sm text-white/40">You lock</p>
              </div>
            </div>

            {/* Lock icon */}
            <div className="flex-shrink-0 text-white/40">
              <Lock className="w-5 h-5" />
            </div>

            {/* Duration + Voting Power */}
            <div className="min-w-0 text-right">
              <p className="text-xl font-bold text-[#f7931a] truncate">
                {formatLockDuration(lockWeeks)}
              </p>
              <p className="text-sm text-white/40">
                {veMegaAmount.toFixed(4)} ve{TOKEN_SYMBOL}
              </p>
            </div>
          </div>
        </div>

        {/* Details + Actions Card */}
        <div className="bg-[#0a1612] rounded-3xl border border-white/10 overflow-hidden">
          {/* In-progress overlay */}
          {(isCreating || isApproving) && (
            <div className="px-6 py-10 flex flex-col items-center gap-4 border-b border-white/5">
              <div className="w-16 h-16 rounded-full bg-[#f7931a]/10 border-2 border-[#f7931a]/30 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-[#f7931a] animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">
                  {isApproving
                    ? `Approving ${TOKEN_SYMBOL}`
                    : "Creating Lock"}
                </p>
                <p className="text-sm text-white/50 mt-1">
                  Confirm in your wallet
                </p>
              </div>
            </div>
          )}

          {/* Lock Details */}
          <div className="px-6 pt-4 pb-2">
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <span className="text-sm text-white/60">Lock amount</span>
              <span className="text-sm font-medium text-white">
                {formatAmount(amount, 6)} {TOKEN_SYMBOL}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <span className="text-sm text-white/60">Lock duration</span>
              <span className="text-sm font-medium text-white">
                {formatLockDuration(lockWeeks)}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-white/5">
              <span className="text-sm text-white/60">Unlock date</span>
              <span className="text-sm font-medium text-white">
                {new Date(
                  Date.now() + lockWeeks * 7 * 24 * 3600 * 1000
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-white/60">Voting power</span>
              <span className="text-sm font-medium text-[#f7931a]">
                {veMegaAmount.toFixed(4)} ve{TOKEN_SYMBOL}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 pb-6 pt-3 flex gap-3">
            <button
              onClick={() => {
                setShowConfirmation(false);
                clearError();
              }}
              disabled={isCreating || isApproving}
              className="flex-1 py-4 rounded-2xl font-bold text-base transition-all duration-200 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Change
            </button>
            <button
              onClick={handleConfirmLock}
              disabled={isCreating || isApproving}
              className="flex-1 py-4 rounded-2xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 bg-[#f7931a] hover:bg-[#ff9f2a] text-white shadow-lg shadow-[#f7931a]/25 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {getConfirmButtonText()}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Lock View ─────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      {/* Card 1: Header Info */}
      <div className="bg-[#0a1612] rounded-3xl border border-white/10 p-6">
        <h1 className="text-xl font-semibold text-white mb-6">
          Create new lock
        </h1>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-[#0d1f1a] border border-white/10 flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5 text-white/60" />
          </div>
          <p className="text-sm text-white/50 leading-relaxed">
            When you lock tokens, you&apos;ll receive a veNFT (voting escrow
            NFT). You can increase your lock amount or extend the lock duration
            at any time.
          </p>
        </div>
      </div>

      {/* Card 2: Form */}
      <div className="bg-[#0a1612] rounded-3xl border border-white/10 overflow-hidden">
        {/* Amount Section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base font-semibold text-white">Amount</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/50" suppressHydrationWarning>
                Balance{" "}
                <span className="text-[#f7931a]">
                  {formatAmount(balance, 4)} {TOKEN_SYMBOL}
                </span>
              </span>
              <button
                onClick={() => setAmount(balance)}
                className="text-xs font-semibold text-[#f7931a] hover:text-[#ff9f2a] transition-colors px-2 py-1 rounded bg-[#f7931a]/10 hover:bg-[#f7931a]/20"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Amount Input Box */}
          <div className="bg-[#0d1f1a] rounded-2xl border border-white/10 p-4">
            <div className="flex items-center justify-between gap-4">
              {/* Token Badge */}
              <div className="flex items-center gap-2 bg-[#1a3d32] rounded-full px-3 py-2 border border-white/10 flex-shrink-0">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                  <Image
                    src="/assets/Logo.svg"
                    alt={TOKEN_SYMBOL}
                    width={28}
                    height={28}
                    className="w-7 h-7"
                  />
                </div>
                <span className="font-semibold text-white">{TOKEN_SYMBOL}</span>
              </div>

              {/* Amount Input */}
              <div className="flex-1 text-right">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-3xl font-bold text-[#f7931a] text-right placeholder:text-white/20 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Slider Section */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-white/50">Lock duration</span>
            <span className="text-sm font-semibold text-white">
              {formatLockDuration(lockWeeks)}
            </span>
          </div>
          <input
            type="range"
            min={MIN_LOCK_WEEKS}
            max={MAX_LOCK_WEEKS}
            value={lockWeeks}
            onChange={handleSliderChange}
            className="w-full h-1 rounded-full cursor-pointer"
            style={{
              background: `linear-gradient(to right, #f7931a 0%, #f7931a ${(lockWeeks / MAX_LOCK_WEEKS) * 100}%, rgba(255,255,255,0.1) ${(lockWeeks / MAX_LOCK_WEEKS) * 100}%, rgba(255,255,255,0.1) 100%)`,
            }}
          />
          <div className="flex justify-between mt-3 text-xs text-white/40">
            <span>7 days</span>
            <span>1 year</span>
            <span>2 years</span>
            <span>3 years</span>
            <span>~4 years</span>
          </div>
        </div>

        {/* Summary Boxes */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0d1f1a] rounded-2xl border border-white/10 p-4 text-center">
              <div className="text-xl font-bold text-white mb-1">
                {formatLockDuration(lockWeeks)}
              </div>
              <div className="text-xs text-white/40">New lock time</div>
            </div>
            <div className="bg-[#0d1f1a] rounded-2xl border border-white/10 p-4 text-center">
              <div className="text-xl font-bold text-white mb-1">
                {veMegaAmount.toFixed(2)} ve{TOKEN_SYMBOL}
              </div>
              <div className="text-xs text-white/40">
                Estimated voting power
              </div>
            </div>
          </div>
        </div>

        {/* Insufficient balance warning */}
        {insufficientBalance && (
          <div className="mx-6 mb-6 bg-[#f7931a]/10 rounded-xl p-4 flex items-center gap-3 border border-[#f7931a]/20">
            <AlertTriangle className="w-5 h-5 text-[#f7931a] flex-shrink-0" />
            <span className="text-sm text-[#f7931a] font-medium">
              Not enough {TOKEN_SYMBOL} balance
            </span>
          </div>
        )}

        {/* Error display */}
        {lockError && (
          <div className="mx-6 mb-6 bg-red-500/10 rounded-xl p-4 flex items-center gap-3 border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-400 font-medium">{lockError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/lock"
              className="flex items-center justify-center py-4 rounded-2xl border border-white/20 text-white/80 hover:text-white hover:border-white/40 font-bold transition-colors"
            >
              Cancel
            </Link>
            <button
              disabled={!buttonActive}
              onClick={() => {
                if (buttonActive) setShowConfirmation(true);
              }}
              suppressHydrationWarning
              className={`flex items-center justify-center py-4 rounded-2xl font-bold text-base transition-all duration-200 ${
                buttonActive
                  ? "bg-[#f7931a] hover:bg-[#ff9f2a] text-white shadow-lg shadow-[#f7931a]/25 active:scale-[0.98]"
                  : "bg-white/10 text-white/40 cursor-not-allowed"
              }`}
            >
              <span suppressHydrationWarning>{getButtonText()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
