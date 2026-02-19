"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import {
  useIncreaseAmount,
  useExtendLock,
  useMergeLock,
  useTransferLock,
} from "@/hooks/use-manage-lock";
import { useLocks, type LockInfo } from "@/hooks/use-locks";
import { toast } from "@/hooks/use-toast";
import { formatAmount } from "@/lib/format";

const TOKEN_SYMBOL = "MEGA";
const MAX_LOCK_WEEKS = 208;

type Tab = "increase" | "extend" | "merge" | "transfer";

function formatDuration(weeks: number) {
  if (weeks >= 52) {
    const years = Math.floor(weeks / 52);
    const rem = weeks % 52;
    return rem === 0 ? `${years} year${years !== 1 ? "s" : ""}` : `${years}y ${rem}w`;
  }
  return `${weeks * 7} days`;
}

function formatUnlockDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Increase Tab ──────────────────────────────────────────────────────────────
function IncreaseTab({ lock, onSuccess }: { lock: LockInfo; onSuccess: () => void }) {
  const [amount, setAmount] = useState("");
  const {
    rawBalance, needsApproval, approve, isApproving,
    increaseAmount, isIncreasing, error, clearError, insufficientBalance,
  } = useIncreaseAmount(lock.tokenId, amount);

  const hasValidAmount = !!amount && parseFloat(amount) > 0;
  const canIncrease = hasValidAmount && !insufficientBalance && !isIncreasing && !isApproving;

  const handleIncrease = async () => {
    if (needsApproval) {
      toast({ title: "Approval Pending", description: `Approving ${TOKEN_SYMBOL}...` });
      try {
        await approve();
        toast({ title: "Approved", description: `${TOKEN_SYMBOL} approved.` });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        const rejected = msg.includes("user rejected") || msg.includes("User denied");
        toast({ title: rejected ? "Rejected" : "Approval Failed", description: rejected ? "You rejected the approval." : "Could not approve." });
        clearError(); return;
      }
    }
    toast({ title: "Increase Pending", description: `Adding ${amount} ${TOKEN_SYMBOL} to lock #${lock.tokenId}...` });
    try {
      await increaseAmount();
      toast({ title: "Success", description: `Added ${amount} ${TOKEN_SYMBOL} to lock.` });
      onSuccess(); setAmount("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const rejected = msg.includes("user rejected") || msg.includes("User denied");
      toast({ title: rejected ? "Rejected" : "Increase Failed", description: rejected ? "You rejected the transaction." : "Transaction failed." });
      clearError();
    }
  };

  const getButtonText = () => {
    if (isApproving) return `Approving ${TOKEN_SYMBOL}...`;
    if (needsApproval) return `Approve ${TOKEN_SYMBOL}`;
    if (isIncreasing) return "Increasing...";
    return "Increase";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Add to lock</span>
        <span className="text-sm text-white/50" suppressHydrationWarning>
          Balance <span className="text-[#f7931a]">{formatAmount(formatUnits(rawBalance, 18), 4)} {TOKEN_SYMBOL}</span>
        </span>
      </div>

      <div className="bg-[#0d1f1a] rounded-2xl border border-white/10 p-4 overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#1a3d32] rounded-full px-3 py-2 border border-white/10 flex-shrink-0">
            <Image src="/assets/Logo.svg" alt={TOKEN_SYMBOL} width={28} height={28} className="w-7 h-7" />
            <span className="font-semibold text-white">{TOKEN_SYMBOL}</span>
          </div>
          <input
            type="text"
            value={amount}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "" || /^\d*\.?\d{0,18}$/.test(v)) setAmount(v);
            }}
            placeholder="0"
            className="min-w-0 flex-1 bg-transparent text-3xl font-bold text-[#f7931a] text-right placeholder:text-white/20 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0d1f1a] rounded-2xl border border-white/10 p-4 text-center">
          <div className="text-lg font-bold text-white">{formatDuration(lock.remainingWeeks)}</div>
          <div className="text-xs text-white/40 mt-1">Lock time</div>
        </div>
        <div className="bg-[#0d1f1a] rounded-2xl border border-white/10 p-4 text-center">
          <div className="text-lg font-bold text-white truncate">{formatAmount(lock.votingPower, 4)} ve{TOKEN_SYMBOL}</div>
          <div className="text-xs text-white/40 mt-1">Estimated voting power</div>
        </div>
      </div>

      <div className="bg-[#f7931a]/5 rounded-xl p-4 border border-[#f7931a]/10">
        <p className="text-xs text-white/50 leading-relaxed">
          <span className="font-semibold text-white/70">Note:</span> You can increase the lock amount or{" "}
          <span className="text-[#f7931a]">extend the locked time</span>. These actions will increase your voting power.
        </p>
      </div>

      {insufficientBalance && (
        <div className="bg-[#f7931a]/10 rounded-xl p-3 flex items-center gap-2 border border-[#f7931a]/20">
          <AlertTriangle className="w-4 h-4 text-[#f7931a] flex-shrink-0" />
          <span className="text-xs text-[#f7931a]">Not enough {TOKEN_SYMBOL} balance</span>
        </div>
      )}

      {(isIncreasing || isApproving) && (
        <div className="flex items-center gap-3 py-2">
          <Loader2 className="w-4 h-4 text-[#f7931a] animate-spin" />
          <span className="text-sm text-white/60">Confirm in your wallet...</span>
        </div>
      )}

      <button
        onClick={handleIncrease}
        disabled={!canIncrease || isApproving || isIncreasing}
        className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 ${
          canIncrease ? "bg-[#f7931a] hover:bg-[#ff9f2a] text-white shadow-lg shadow-[#f7931a]/25 active:scale-[0.98]" : "bg-white/10 text-white/40 cursor-not-allowed"
        }`}
      >
        {getButtonText()}
      </button>
    </div>
  );
}

// ── Extend Tab ────────────────────────────────────────────────────────────────
function ExtendTab({ lock, onSuccess }: { lock: LockInfo; onSuccess: () => void }) {
  const [newLockWeeks, setNewLockWeeks] = useState(Math.min(MAX_LOCK_WEEKS, lock.remainingWeeks + 1));
  const { extendLock, isExtending, error, clearError } = useExtendLock(lock.tokenId, newLockWeeks);

  const canExtend = newLockWeeks > lock.remainingWeeks && !isExtending;
  // Estimate new voting power based on ratio
  const currentAmount = parseFloat(lock.lockedAmount) || 0;
  const newVePower = currentAmount * (newLockWeeks / MAX_LOCK_WEEKS);

  const handleExtend = async () => {
    toast({ title: "Extend Pending", description: `Extending lock #${lock.tokenId} to ${formatDuration(newLockWeeks)}...` });
    try {
      await extendLock();
      toast({ title: "Success", description: "Lock duration extended successfully." });
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const rejected = msg.includes("user rejected") || msg.includes("User denied");
      toast({ title: rejected ? "Rejected" : "Extend Failed", description: rejected ? "You rejected the transaction." : "Transaction failed." });
      clearError();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-white/50">New lock duration</span>
        <span className="text-sm font-semibold text-white">{formatDuration(newLockWeeks)}</span>
      </div>
      <input
        type="range"
        min={Math.max(1, lock.remainingWeeks)}
        max={MAX_LOCK_WEEKS}
        value={newLockWeeks}
        onChange={(e) => setNewLockWeeks(parseInt(e.target.value))}
        className="w-full h-1 rounded-full cursor-pointer"
        style={{
          background: `linear-gradient(to right, #f7931a 0%, #f7931a ${((newLockWeeks - lock.remainingWeeks) / (MAX_LOCK_WEEKS - lock.remainingWeeks)) * 100}%, rgba(255,255,255,0.1) ${((newLockWeeks - lock.remainingWeeks) / (MAX_LOCK_WEEKS - lock.remainingWeeks)) * 100}%, rgba(255,255,255,0.1) 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-white/40">
        <span>Current ({formatDuration(lock.remainingWeeks)})</span>
        <span>Max (~4 years)</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0d1f1a] rounded-2xl border border-white/10 p-4 text-center">
          <div className="text-lg font-bold text-white">{formatDuration(newLockWeeks)}</div>
          <div className="text-xs text-white/40 mt-1">New lock time</div>
        </div>
        <div className="bg-[#0d1f1a] rounded-2xl border border-white/10 p-4 text-center">
          <div className="text-lg font-bold text-white">{newVePower.toFixed(4)} ve{TOKEN_SYMBOL}</div>
          <div className="text-xs text-white/40 mt-1">New estimated voting power</div>
        </div>
      </div>

      <div className="bg-[#f7931a]/5 rounded-xl p-4 border border-[#f7931a]/10">
        <p className="text-xs text-white/50 leading-relaxed">
          <span className="font-semibold text-white/70">Note:</span> You can extend the locked time or{" "}
          <span className="text-[#f7931a]">increase the lock amount</span>. These actions will increase your voting power. The maximum lock time is 4 years.
        </p>
      </div>

      {isExtending && (
        <div className="flex items-center gap-3 py-2">
          <Loader2 className="w-4 h-4 text-[#f7931a] animate-spin" />
          <span className="text-sm text-white/60">Confirm in your wallet...</span>
        </div>
      )}

      <button
        onClick={handleExtend}
        disabled={!canExtend}
        className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 ${
          canExtend ? "bg-[#f7931a] hover:bg-[#ff9f2a] text-white shadow-lg shadow-[#f7931a]/25 active:scale-[0.98]" : "bg-white/10 text-white/40 cursor-not-allowed"
        }`}
      >
        {isExtending ? "Extending..." : "Extend lock time"}
      </button>
    </div>
  );
}

// ── Merge Tab ─────────────────────────────────────────────────────────────────
function MergeTab({ lock, allLocks, onSuccess }: { lock: LockInfo; allLocks: LockInfo[]; onSuccess: () => void }) {
  const [selectedToId, setSelectedToId] = useState<string>("");
  const targetTokenId = selectedToId ? BigInt(selectedToId) : null;
  const { mergeLock, isMerging, error, clearError } = useMergeLock(lock.tokenId, targetTokenId);

  const otherLocks = allLocks.filter((l) => l.tokenId !== lock.tokenId);
  const canMerge = !!selectedToId && !isMerging;

  const handleMerge = async () => {
    toast({ title: "Merge Pending", description: `Merging lock #${lock.tokenId} into #${selectedToId}...` });
    try {
      await mergeLock();
      toast({ title: "Merged", description: "Locks merged successfully." });
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const rejected = msg.includes("user rejected") || msg.includes("User denied");
      toast({ title: rejected ? "Rejected" : "Merge Failed", description: rejected ? "You rejected the transaction." : "Transaction failed." });
      clearError();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Select the lock you want to merge into</span>
        <Link href="/lock/create" className="text-xs text-[#f7931a] hover:underline">Create new lock</Link>
      </div>

      <div className="relative">
        <select
          value={selectedToId}
          onChange={(e) => setSelectedToId(e.target.value)}
          className="w-full appearance-none rounded-xl border border-white/20 bg-[#0d1f1a] px-4 py-3.5 text-sm text-white transition hover:border-white/40 focus:border-[#f7931a] focus:outline-none cursor-pointer"
        >
          <option value="" className="bg-[#0d1f1a] text-white/50">Your locks...</option>
          {otherLocks.map((l) => (
            <option key={l.tokenId.toString()} value={l.tokenId.toString()} className="bg-[#0d1f1a] text-white">
              Lock #{l.tokenId.toString()} — {formatAmount(l.lockedAmount, 4)} {TOKEN_SYMBOL} ({formatDuration(l.remainingWeeks)})
            </option>
          ))}
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0d1f1a] rounded-2xl border border-white/10 p-4 text-center">
          <div className="text-lg font-bold text-white">{formatDuration(lock.remainingWeeks)}</div>
          <div className="text-xs text-white/40 mt-1">Lock time</div>
        </div>
        <div className="bg-[#0d1f1a] rounded-2xl border border-white/10 p-4 text-center">
          <div className="text-lg font-bold text-white">{formatAmount(lock.votingPower, 4)} ve{TOKEN_SYMBOL}</div>
          <div className="text-xs text-white/40 mt-1">Estimated voting power</div>
        </div>
      </div>

      <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-red-400 font-semibold mb-1">Warning</p>
            <p className="text-xs text-red-400/80">Merging two locks keeps the longer lock time and combines both amounts to increase your final voting power.</p>
            <p className="text-xs text-red-400/80 mt-1">Merging will reset any rewards and rebases. Before continuing, please be sure you have claimed all available rewards.</p>
          </div>
        </div>
      </div>

      {isMerging && (
        <div className="flex items-center gap-3 py-2">
          <Loader2 className="w-4 h-4 text-[#f7931a] animate-spin" />
          <span className="text-sm text-white/60">Confirm in your wallet...</span>
        </div>
      )}

      <button
        onClick={handleMerge}
        disabled={!canMerge}
        className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 ${
          canMerge ? "bg-[#f7931a] hover:bg-[#ff9f2a] text-white shadow-lg shadow-[#f7931a]/25 active:scale-[0.98]" : "bg-white/10 text-white/40 cursor-not-allowed"
        }`}
      >
        {isMerging ? "Merging..." : "Merge"}
      </button>
    </div>
  );
}

// ── Transfer Tab ──────────────────────────────────────────────────────────────
function TransferTab({ lock, onSuccess }: { lock: LockInfo; onSuccess: () => void }) {
  const [toAddress, setToAddress] = useState("");
  const { transferLock, isTransferring, isValidAddress, error, clearError } = useTransferLock(lock.tokenId, toAddress);

  const canTransfer = isValidAddress && !isTransferring;

  const handleTransfer = async () => {
    toast({ title: "Transfer Pending", description: `Transferring lock #${lock.tokenId}...` });
    try {
      await transferLock();
      toast({ title: "Transferred", description: "Lock transferred successfully." });
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const rejected = msg.includes("user rejected") || msg.includes("User denied");
      toast({ title: rejected ? "Rejected" : "Transfer Failed", description: rejected ? "You rejected the transaction." : "Transaction failed." });
      clearError();
    }
  };

  return (
    <div className="space-y-4">
      <span className="text-sm font-semibold text-white">Transfer to</span>

      <div className="relative">
        <input
          type="text"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          placeholder="0x..."
          className={`w-full rounded-xl border px-4 py-3.5 text-sm bg-[#0d1f1a] text-white placeholder:text-white/30 focus:outline-none transition ${
            toAddress && !isValidAddress ? "border-red-500/50 focus:border-red-500" : "border-white/20 focus:border-[#f7931a]"
          }`}
        />
      </div>
      <p className="text-xs text-white/40">Wallet address where the lock will be transferred.</p>
      {toAddress && !isValidAddress && (
        <p className="text-xs text-red-400">Invalid Ethereum address.</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0d1f1a] rounded-2xl border border-white/10 p-4 text-center">
          <div className="text-lg font-bold text-white">{formatDuration(lock.remainingWeeks)}</div>
          <div className="text-xs text-white/40 mt-1">Lock time</div>
        </div>
        <div className="bg-[#0d1f1a] rounded-2xl border border-white/10 p-4 text-center">
          <div className="text-lg font-bold text-white">{formatAmount(lock.votingPower, 4)} ve{TOKEN_SYMBOL}</div>
          <div className="text-xs text-white/40 mt-1">Estimated voting power</div>
        </div>
      </div>

      <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-red-400 font-semibold mb-1">Warning</p>
            <p className="text-xs text-red-400/80">Transferring a lock will also transfer any rewards and rebases!</p>
            <p className="text-xs text-red-400/80 mt-1">Before continuing, please make sure you have claimed all available rewards.</p>
          </div>
        </div>
      </div>

      {isTransferring && (
        <div className="flex items-center gap-3 py-2">
          <Loader2 className="w-4 h-4 text-[#f7931a] animate-spin" />
          <span className="text-sm text-white/60">Confirm in your wallet...</span>
        </div>
      )}

      <button
        onClick={handleTransfer}
        disabled={!canTransfer}
        className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 ${
          canTransfer ? "bg-[#f7931a] hover:bg-[#ff9f2a] text-white shadow-lg shadow-[#f7931a]/25 active:scale-[0.98]" : "bg-white/10 text-white/40 cursor-not-allowed"
        }`}
      >
        {isTransferring ? "Transferring..." : "Transfer"}
      </button>
    </div>
  );
}

// ── Main ManageLock Component ─────────────────────────────────────────────────
interface ManageLockProps {
  tokenId: string; // from URL param (string)
}

export default function ManageLock({ tokenId }: ManageLockProps) {
  const searchParams = useSearchParams();
  const manageParam = searchParams.get("manage") as Tab | null;
  const validTabs: Tab[] = ["increase", "extend", "merge", "transfer"];
  const initialTab: Tab = manageParam && validTabs.includes(manageParam) ? manageParam : "increase";

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const { locks, refetch } = useLocks();

  const tokenIdBigInt = tokenId ? BigInt(tokenId) : BigInt(0);
  const lock = locks.find((l) => l.tokenId === tokenIdBigInt);

  if (!lock && locks.length > 0) {
    return (
      <div className="w-full max-w-lg mx-auto space-y-4">
        <div className="bg-[#0a1612] rounded-3xl border border-white/10 p-8 text-center">
          <p className="text-white/50">Lock #{tokenId} not found.</p>
          <Link href="/lock" className="mt-4 inline-block text-[#f7931a] hover:underline text-sm">Back to locks</Link>
        </div>
      </div>
    );
  }

  if (!lock) {
    return (
      <div className="w-full max-w-lg mx-auto space-y-4">
        <div className="bg-[#0a1612] rounded-3xl border border-white/10 p-8 text-center">
          <Loader2 className="w-8 h-8 text-[#f7931a] animate-spin mx-auto mb-3" />
          <p className="text-white/50 text-sm">Loading lock details...</p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "increase", label: "Increase" },
    { id: "extend", label: "Extend" },
    { id: "merge", label: "Merge" },
    { id: "transfer", label: "Transfer" },
  ];

  const handleSuccess = () => { refetch(); };

  return (
    <div className="w-full max-w-lg mx-auto space-y-3">
      {/* Header Card */}
      <div className="bg-[#0a1612] rounded-3xl border border-white/10 p-5">
        <h2 className="text-base font-semibold text-white border-b border-white/10 pb-4 mb-4">
          Manage lock
        </h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0d1f1a] border border-white/10 flex items-center justify-center flex-shrink-0">
              <Image src="/assets/Logo.svg" alt={TOKEN_SYMBOL} width={28} height={28} className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Lock #{tokenId}</span>
                <span className="text-xs text-white/40">🔒</span>
              </div>
              <p className="text-xs text-white/40 mt-0.5">
                {formatAmount(lock.lockedAmount, 4)} {TOKEN_SYMBOL} · {lock.isExpired ? "Expired" : `locked for ${formatDuration(lock.remainingWeeks)}`}
              </p>
            </div>
          </div>
          <Link
            href="/lock"
            className="px-4 py-2 text-xs font-semibold bg-white/5 text-white/70 rounded-full hover:bg-white/10 hover:text-white transition-colors border border-white/10"
          >
            Change
          </Link>
        </div>
      </div>

      {/* Tabs + Content Card */}
      <div className="bg-[#0a1612] rounded-3xl border border-white/10 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors relative ${
                activeTab === tab.id ? "text-[#f7931a]" : "text-white/40 hover:text-white/70"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f7931a]" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === "increase" && <IncreaseTab lock={lock} onSuccess={handleSuccess} />}
          {activeTab === "extend" && <ExtendTab lock={lock} onSuccess={handleSuccess} />}
          {activeTab === "merge" && <MergeTab lock={lock} allLocks={locks} onSuccess={handleSuccess} />}
          {activeTab === "transfer" && <TransferTab lock={lock} onSuccess={handleSuccess} />}
        </div>
      </div>
    </div>
  );
}
