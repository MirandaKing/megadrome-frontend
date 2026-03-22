"use client"

import { useState, useMemo, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Search, ChevronDown, Check, X, Loader2, Clock } from "lucide-react"
import { useAccount, useReadContracts } from "wagmi"
import { formatUnits, type Address } from "viem"
import { ADDRESSES, ABIS } from "@/lib/contracts"
import { usePools } from "@/hooks/use-pools"
import { useLocks } from "@/hooks/use-locks"
import { useVote } from "@/hooks/use-vote"
import { useToast } from "@/hooks/use-toast"

const CHAIN_ID = 143
const EPOCH_DURATION = 604800 // 1 week in seconds
function epochStart(nowSec: number) {
  return Math.floor(nowSec / EPOCH_DURATION) * EPOCH_DURATION
}

const QUICK_PCTS = [0, 10, 25, 50, 75, 100]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtAmount(n: string | bigint, dec = 18): string {
  const v = typeof n === "bigint" ? Number(formatUnits(n, dec)) : parseFloat(n)
  if (v >= 1e6) return `${(v / 1e6).toFixed(4)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(3)}K`
  return v.toLocaleString("en-US", { maximumFractionDigits: 5 })
}

function fmtDuration(unlockTimestamp: number): string {
  if (!unlockTimestamp) return ""
  const diff = unlockTimestamp * 1000 - Date.now()
  if (diff <= 0) return "expired"
  const days = Math.floor(diff / 86400000)
  if (days >= 365) {
    const yrs = Math.floor(days / 365)
    return `${yrs} year${yrs > 1 ? "s" : ""}`
  }
  return `${days} day${days !== 1 ? "s" : ""}`
}

// ─── TokenIcon ────────────────────────────────────────────────────────────────

function TokenIcon({
  symbol,
  logoUrl,
  size = 32,
}: {
  symbol: string
  logoUrl: string
  size?: number
}) {
  const [err, setErr] = useState(false)
  if (!logoUrl || err) {
    return (
      <div
        className="rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold shrink-0"
        style={{ width: size, height: size, fontSize: Math.max(8, Math.round(size * 0.3)) }}
      >
        {symbol.slice(0, 2).toUpperCase()}
      </div>
    )
  }
  return (
    <Image
      src={logoUrl}
      alt={symbol}
      width={size}
      height={size}
      className="rounded-full shrink-0"
      onError={() => setErr(true)}
    />
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Vote() {
  const { isConnected } = useAccount()
  const { toast } = useToast()
  const { pools } = usePools()
  const { locks } = useLocks()

  // ── UI state ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("")
  const [openDropdownPool, setOpenDropdownPool] = useState<string | null>(null)
  const [showVoteModal, setShowVoteModal] = useState(false)

  // ── Vote allocation state ──────────────────────────────────────────────────
  // poolLockMap[poolAddress] = list of lock tokenId strings that will vote for it
  const [poolLockMap, setPoolLockMap] = useState<Record<string, string[]>>({})
  // weights[lockId][poolAddress] = percentage 0–100
  const [weights, setWeights] = useState<Record<string, Record<string, number>>>({})

  // ── Vote hook ──────────────────────────────────────────────────────────────
  const { castVote } = useVote()

  // Track which lock is currently being voted (per-lock loading, not shared)
  const [votingLockId, setVotingLockId] = useState<string | null>(null)

  // ── Fetch lastVoted for all locks (batch) ──────────────────────────────────
  const addresses = ADDRESSES[CHAIN_ID]
  const { data: lastVotedData } = useReadContracts({
    contracts: locks.map((l) => ({
      address: addresses?.voter as Address,
      abi: ABIS.Voter,
      functionName: "lastVoted" as const,
      args: [l.tokenId],
    })),
    query: { enabled: locks.length > 0 && !!addresses?.voter },
  })

  // hasVotedThisEpoch[lockId] = true if the lock already voted this epoch
  const hasVotedThisEpoch = useMemo(() => {
    const nowEpochStart = epochStart(Math.floor(Date.now() / 1000))
    const map: Record<string, boolean> = {}
    locks.forEach((l, i) => {
      const ts = Number((lastVotedData?.[i]?.result as bigint | undefined) ?? 0n)
      map[l.tokenId.toString()] = ts >= nowEpochStart
    })
    return map
  }, [lastVotedData, locks])

  // Prevent hydration mismatch: isConnected differs between SSR and client
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // ── Computed ───────────────────────────────────────────────────────────────
  const filteredPools = useMemo(
    () =>
      pools.filter(
        (p) =>
          !p.isCL &&
          (p.token0.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.token1.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.token0.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.token1.address.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [pools, searchQuery]
  )

  const selectedPoolCount = Object.values(poolLockMap).filter(
    (v) => v.length > 0
  ).length

  // ── Helpers ────────────────────────────────────────────────────────────────
  function getLockSelectedPools(lockId: string): string[] {
    return Object.entries(poolLockMap)
      .filter(([, ids]) => ids.includes(lockId))
      .map(([addr]) => addr)
  }

  function getLockTotal(lockId: string): number {
    return Object.values(weights[lockId] ?? {}).reduce((s, v) => s + v, 0)
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  function togglePoolLock(poolAddr: string, lockId: string) {
    const curr = poolLockMap[poolAddr] ?? []
    const isAlreadySelected = curr.includes(lockId)
    setPoolLockMap((prev) => ({
      ...prev,
      [poolAddr]: isAlreadySelected
        ? curr.filter((id) => id !== lockId)
        : [...curr, lockId],
    }))
    setWeights((prev) => {
      const lockW = { ...(prev[lockId] ?? {}) }
      if (isAlreadySelected) delete lockW[poolAddr]
      else lockW[poolAddr] = 0
      return { ...prev, [lockId]: lockW }
    })
    setOpenDropdownPool(null)
  }

  function setWeight(lockId: string, poolAddr: string, pct: number) {
    setWeights((prev) => ({
      ...prev,
      [lockId]: {
        ...(prev[lockId] ?? {}),
        [poolAddr]: Math.min(100, Math.max(0, Math.round(pct))),
      },
    }))
  }

  function clearLock(lockId: string) {
    setWeights((prev) => ({ ...prev, [lockId]: {} }))
    setPoolLockMap((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((pa) => {
        next[pa] = (next[pa] ?? []).filter((id) => id !== lockId)
      })
      return next
    })
  }

  async function handleVote(lock: ReturnType<typeof useLocks>["locks"][number]) {
    const lockId = lock.tokenId.toString()
    const lockWeights = weights[lockId] ?? {}
    const poolAddrs = Object.keys(lockWeights).filter((a) => lockWeights[a] > 0)
    if (!poolAddrs.length) return

    const pcts = poolAddrs.map((a) => lockWeights[a])
    setVotingLockId(lockId)
    toast({ title: `Casting votes for Lock #${lock.tokenId}…` })
    try {
      await castVote(lock.tokenId, poolAddrs as Address[], pcts)
      toast({ title: "Votes cast successfully!" })
    } catch (err) {
      toast({
        title: "Vote failed",
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setVotingLockId(null)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pb-28">
      {/* ── Stats section ──────────────────────────────────────────────────── */}
      <div className="flex flex-col-reverse gap-3 md:flex-row mb-6">
        {/* Left: global stats */}
        <div className="flex-1 bg-[#0d1f1a]/80 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-4 mb-6">
            <div className="hidden lg:flex w-14 h-14 rounded-full border border-white/10 items-center justify-center shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-white/60"
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
            </div>
            <p className="text-white/70 text-sm max-w-sm">
              Vote with your veMEGA to direct MEGA emissions to liquidity pools
              and earn rewards.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 sm:divide-x divide-white/10">
            <div className="sm:pr-5">
              <div className="text-lg font-semibold text-white">-</div>
              <div className="text-sm text-white/50">Total Votes</div>
            </div>
            <div className="sm:px-5">
              <div className="text-lg font-semibold text-white">-</div>
              <div className="text-sm text-white/50">Weekly Rewards</div>
            </div>
            <div className="sm:px-5">
              <div className="text-lg font-semibold text-white">
                {filteredPools.length}
              </div>
              <div className="text-sm text-white/50">Active Gauges</div>
            </div>
            <div className="sm:pl-5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#f7931a]" />
                <div className="text-lg font-semibold text-white">-</div>
              </div>
              <div className="text-sm text-white/50">Epoch Ends</div>
            </div>
          </div>
        </div>

        {/* Right: user locks card */}
        <div className="relative w-full md:max-w-md overflow-hidden rounded-2xl border border-[#f7931a]/20 bg-linear-to-br from-[#f7931a]/10 to-[#15713a]/10">
          <div className="p-6 h-full flex flex-col justify-center">
            {!mounted || !isConnected ? (
              <div className="text-sm text-white/50 text-center">
                Connect wallet to view your locks
              </div>
            ) : locks.length === 0 ? (
              <div className="space-y-3 text-center">
                <div className="text-sm text-white/50">
                  No locks found. Create a lock to participate in governance.
                </div>
                <Link
                  href="/lock"
                  className="inline-block bg-[#f7931a] hover:bg-[#ff9f2a] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                >
                  Create Lock
                </Link>
              </div>
            ) : (
              <>
                <div className="text-sm text-white/60 mb-3">
                  Your Locks ({locks.length})
                </div>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {locks.map((lock) => (
                    <div
                      key={lock.tokenId.toString()}
                      className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5"
                    >
                      <div>
                        <div className="text-sm font-semibold">
                          Lock #{lock.tokenId.toString()}
                        </div>
                        <div className="text-xs text-white/50">
                          {fmtAmount(lock.lockedAmount)} MEGA · {fmtDuration(lock.unlockTimestamp)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-[#f7931a]">
                          {fmtAmount(lock.votingPower)}
                        </div>
                        <div className="text-[11px] text-white/40">veMEGA</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  href="/lock"
                  className="mt-3 text-center bg-[#1a3d32] hover:bg-[#1f4a3d] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors border border-white/10"
                >
                  Manage Locks
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Pool selection table ──────────────────────────────────────────── */}
      <div className="bg-[#0a1612] rounded-2xl border border-white/10 overflow-visible">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 p-5 sm:items-center border-b border-white/5">
          <div className="flex items-center gap-2 text-xl font-semibold text-white">
            Select liquidity pools for voting
            <span className="px-2 py-0.5 text-xs rounded-full bg-[#f7931a]/20 text-[#f7931a]">
              {filteredPools.length}
            </span>
          </div>
          <div className="relative flex items-center border border-white/20 rounded-full focus-within:border-[#f7931a] transition-colors">
            <Search className="w-4 h-4 ml-3.5 text-white/50 shrink-0" />
            <input
              type="text"
              placeholder="Symbol or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-52 px-3.5 py-2.5 bg-transparent text-sm text-white placeholder:text-white/50 outline-none"
            />
          </div>
        </div>

        {/* Table header (desktop) */}
        <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_180px] gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white/40 border-b border-white/5">
          <div>Pools</div>
          <div className="text-right">Fees</div>
          <div className="text-right">Incentives</div>
          <div className="text-right">Total Rewards</div>
          <div className="text-right">vAPR</div>
          <div />
        </div>

        {/* Pool rows */}
        <div className="divide-y divide-white/5">
          {filteredPools.map((pool) => {
            const selectedLocks = poolLockMap[pool.poolAddress] ?? []
            const isSelected = selectedLocks.length > 0
            const isDropdownOpen = openDropdownPool === pool.poolAddress

            return (
              <div
                key={pool.id}
                className="relative grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_180px] gap-4 px-6 py-5 hover:bg-white/2 transition-colors"
              >
                {/* Pool info */}
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2 shrink-0">
                    <TokenIcon
                      symbol={pool.token0.symbol}
                      logoUrl={pool.token0.logoUrl}
                      size={36}
                    />
                    <TokenIcon
                      symbol={pool.token1.symbol}
                      logoUrl={pool.token1.logoUrl}
                      size={36}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm text-white">
                        {pool.token0.symbol} / {pool.token1.symbol}
                      </span>
                      <span className="px-1.5 py-px text-[10px] font-semibold rounded-full bg-white/10 text-white/50">
                        {pool.fee}
                      </span>
                    </div>
                    <div className="text-xs text-[#f7931a]">{pool.poolType}</div>
                    <div className="text-xs text-white/40 mt-0.5">
                      TVL {pool.tvl}
                    </div>
                  </div>
                </div>

                {/* Fees */}
                <div className="flex justify-between lg:flex-col lg:items-end text-xs gap-2">
                  <span className="text-white/50 lg:hidden">Fees</span>
                  <span className="text-white">-</span>
                </div>

                {/* Incentives */}
                <div className="flex justify-between lg:flex-col lg:items-end text-xs gap-2">
                  <span className="text-white/50 lg:hidden">Incentives</span>
                  <span className="text-white">-</span>
                </div>

                {/* Total Rewards */}
                <div className="flex justify-between lg:flex-col lg:items-end text-xs gap-2">
                  <span className="text-white/50 lg:hidden">Total Rewards</span>
                  <span className="text-white">-</span>
                </div>

                {/* vAPR */}
                <div className="flex justify-between lg:flex-col lg:items-end text-xs gap-2">
                  <span className="text-white/50 lg:hidden">vAPR</span>
                  <span className="text-white">-</span>
                </div>

                {/* Select button + lock dropdown */}
                <div className="flex lg:justify-end items-start">
                  <div className="relative">
                    <button
                      onClick={() =>
                        setOpenDropdownPool(
                          isDropdownOpen ? null : pool.poolAddress
                        )
                      }
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        isSelected
                          ? "bg-[#f7931a] text-white"
                          : "bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {isSelected
                        ? `${selectedLocks.length} lock${selectedLocks.length > 1 ? "s" : ""} selected`
                        : "Select"}
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {/* Lock picker dropdown */}
                    {isDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setOpenDropdownPool(null)}
                        />
                        <div className="absolute right-0 top-full mt-1.5 z-50 bg-[#0d1f1a] border border-white/10 rounded-xl shadow-2xl min-w-60 overflow-hidden">
                          <div className="px-4 py-2.5 border-b border-white/5 text-xs text-white/50 font-semibold uppercase tracking-wider">
                            Vote with lock
                          </div>
                          {!mounted || !isConnected ? (
                            <div className="px-4 py-3 text-sm text-white/50">
                              Connect wallet to vote
                            </div>
                          ) : locks.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-white/50">
                              No locks available.{" "}
                              <Link
                                href="/lock"
                                className="text-[#f7931a] hover:underline"
                              >
                                Create one
                              </Link>
                            </div>
                          ) : (
                            locks.map((lock) => {
                              const lockId = lock.tokenId.toString()
                              const isLockSelected =
                                selectedLocks.includes(lockId)
                              return (
                                <button
                                  key={lockId}
                                  onClick={() =>
                                    togglePoolLock(pool.poolAddress, lockId)
                                  }
                                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                                >
                                  <div className="text-left">
                                    <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                                      Lock #{lockId}
                                      <span className="text-white/40 text-xs">🔒</span>
                                    </div>
                                    <div className="text-xs text-white/50 mt-0.5">
                                      {fmtAmount(lock.lockedAmount)} MEGA locked for{" "}
                                      {fmtDuration(lock.unlockTimestamp)}
                                    </div>
                                    <div className="text-xs text-[#f7931a] mt-0.5">
                                      {fmtAmount(lock.votingPower)} veMEGA
                                    </div>
                                  </div>
                                  <div
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-3 transition-colors ${
                                      isLockSelected
                                        ? "border-[#f7931a] bg-[#f7931a]"
                                        : "border-white/30"
                                    }`}
                                  >
                                    <Check
                                      className={`w-3 h-3 ${isLockSelected ? "text-white" : "invisible"}`}
                                    />
                                  </div>
                                </button>
                              )
                            })
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filteredPools.length === 0 && (
          <div className="text-center py-16 text-white/40">
            No pools found.
          </div>
        )}
      </div>

      {/* ── Sticky bottom bar ────────────────────────────────────────────── */}
      {mounted && (locks.length > 0 || selectedPoolCount > 0) && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-linear-to-t from-[#0a1612] via-[#0a1612]/95 to-transparent z-50 pointer-events-none">
          <div className="max-w-7xl mx-auto pointer-events-auto">
            <div className="flex items-center justify-between gap-4 bg-[#0d1f1a] rounded-2xl p-4 border border-white/10 shadow-2xl">
              <div className="flex items-center gap-4">
                <Image
                  src="/assets/Logo.svg"
                  alt="Logo"
                  width={32}
                  height={32}
                  className="rounded-full shrink-0"
                />
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-sm font-bold text-white">
                      {locks.length} Active lock{locks.length !== 1 ? "s" : ""}
                    </div>
                    <Link
                      href="/lock"
                      className="text-xs text-[#f7931a] hover:underline"
                    >
                      Open locks
                    </Link>
                  </div>
                  <div className="w-px h-8 bg-white/10 hidden sm:block" />
                  <div className="hidden sm:block text-sm text-white/60">
                    <span className="text-white font-bold">{selectedPoolCount}</span>{" "}
                    Pool{selectedPoolCount !== 1 ? "s" : ""} Selected
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowVoteModal(true)}
                disabled={selectedPoolCount === 0}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  selectedPoolCount > 0
                    ? "bg-[#f7931a] hover:bg-[#ff9f2a] text-white shadow-lg shadow-[#f7931a]/25"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                }`}
              >
                Vote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Vote modal ────────────────────────────────────────────────────── */}
      {showVoteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowVoteModal(false)}
          />
          <div className="relative bg-[#0a1612] rounded-2xl border border-white/10 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
              <h2 className="text-lg font-bold text-white">Vote</h2>
              <button
                onClick={() => setShowVoteModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* Per-lock sections */}
            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {locks.map((lock) => {
                const lockId = lock.tokenId.toString()
                const lockSelectedPools = getLockSelectedPools(lockId)
                if (lockSelectedPools.length === 0) return null

                const alreadyVoted = hasVotedThisEpoch[lockId] ?? false
                const isThisLockBusy = votingLockId === lockId
                const total = getLockTotal(lockId)
                const remaining = 100 - total
                const canVote = total === 100 && !isThisLockBusy && !alreadyVoted

                return (
                  <div
                    key={lockId}
                    className="bg-[#0d1f1a] rounded-2xl border border-white/10 overflow-hidden"
                  >
                    {/* Lock header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-white/5">
                      <div className="flex items-center gap-3 min-w-0">
                        <Image
                          src="/assets/Logo.svg"
                          alt=""
                          width={28}
                          height={28}
                          className="rounded-full shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white">
                              Lock #{lockId}
                            </span>
                            <span className="text-white/40 text-sm">🔒</span>
                            <span className="text-xs text-white/50">
                              {fmtAmount(lock.lockedAmount)} MEGA locked for{" "}
                              {fmtDuration(lock.unlockTimestamp)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <Link
                              href="/lock"
                              className="text-xs text-[#f7931a] hover:underline"
                            >
                              Increase
                            </Link>
                            <Link
                              href="/lock"
                              className="text-xs text-[#f7931a] hover:underline"
                            >
                              Extend
                            </Link>
                            <span className="text-white/20">·</span>
                            <button
                              onClick={() => clearLock(lockId)}
                              className="text-xs text-white/50 hover:text-white hover:underline transition-colors"
                            >
                              Clear Votes
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        {!alreadyVoted && (
                        <div className="text-right">
                          <div className="text-xs text-white/50">
                            Total Voting Power
                          </div>
                          <div
                            className={`text-sm font-bold ${
                              remaining > 0
                                ? "text-[#f7931a]"
                                : remaining === 0
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {Math.max(0, remaining)}% available
                          </div>
                        </div>
                        )}
                        {alreadyVoted ? (
                          <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500/15 text-green-400 text-sm font-bold">
                            <Check className="w-4 h-4" />
                            Voted
                          </div>
                        ) : (
                          <button
                            onClick={() => handleVote(lock)}
                            disabled={!canVote}
                            className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${
                              canVote
                                ? "bg-[#f7931a] hover:bg-[#ff9f2a] text-white shadow-lg shadow-[#f7931a]/20"
                                : "bg-white/10 text-white/30 cursor-not-allowed"
                            }`}
                          >
                            {isThisLockBusy ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Vote"
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pool rows for this lock */}
                    {lockSelectedPools.map((poolAddr) => {
                      const pool = pools.find(
                        (p) =>
                          p.poolAddress.toLowerCase() ===
                          poolAddr.toLowerCase()
                      )
                      if (!pool) return null
                      const pct = weights[lockId]?.[poolAddr] ?? 0

                      return (
                        <div
                          key={poolAddr}
                          className="px-5 py-4 border-b border-white/5 last:border-0 grid grid-cols-1 md:grid-cols-[1fr_100px_120px_200px] gap-4 items-center"
                        >
                          {/* Pool info */}
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-2 shrink-0">
                              <TokenIcon
                                symbol={pool.token0.symbol}
                                logoUrl={pool.token0.logoUrl}
                                size={28}
                              />
                              <TokenIcon
                                symbol={pool.token1.symbol}
                                logoUrl={pool.token1.logoUrl}
                                size={28}
                              />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white">
                                {pool.token0.symbol} / {pool.token1.symbol}
                              </div>
                              <div className="text-xs text-[#f7931a]">
                                {pool.poolType}
                              </div>
                            </div>
                          </div>

                          {/* Voting APR */}
                          <div className="text-center">
                            <div className="text-[11px] text-white/50 mb-1">
                              Voting APR
                            </div>
                            <div className="text-sm text-green-400 font-semibold">
                              -
                            </div>
                          </div>

                          {/* Est. Rewards */}
                          <div className="text-center">
                            <div className="text-[11px] text-white/50 mb-1">
                              Est. Rewards
                            </div>
                            <div className="text-sm text-white">-</div>
                          </div>

                          {/* Voting Power input */}
                          <div>
                            <div className="text-[11px] text-white/50 mb-1.5">
                              Voting Power · {fmtAmount(lock.votingPower)} veMEGA
                            </div>
                            {/* % input */}
                            <div className="flex items-center gap-2 bg-[#0a1612] border border-white/10 rounded-lg px-3 py-2 mb-2 focus-within:border-[#f7931a] transition-colors">
                              <span className="text-white/40 text-sm font-semibold">
                                %
                              </span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={pct === 0 ? "" : pct}
                                onChange={(e) =>
                                  setWeight(
                                    lockId,
                                    poolAddr,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                placeholder="0.00"
                                className="flex-1 bg-transparent text-right text-sm font-bold outline-none text-white placeholder:text-white/20"
                              />
                            </div>
                            {/* Quick picks */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => togglePoolLock(poolAddr, lockId)}
                                title="Remove"
                                className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                              {QUICK_PCTS.map((p) => (
                                <button
                                  key={p}
                                  onClick={() => setWeight(lockId, poolAddr, p)}
                                  className={`flex-1 py-1 text-[11px] font-semibold rounded transition-colors ${
                                    pct === p
                                      ? "bg-[#f7931a] text-white"
                                      : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                                  }`}
                                >
                                  {p}%
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}

              {/* If no locks have selected pools */}
              {locks.every((l) => getLockSelectedPools(l.tokenId.toString()).length === 0) && (
                <div className="text-center py-8 text-white/50 text-sm">
                  No pools selected. Close this modal and select pools to vote.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
