"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
    Search,
    ChevronDown,
    ArrowDown,
    Plus,
    Minus,
    MoreHorizontal,
    Info,
    Clock,
    X,
    Check
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface VotePool {
    id: string
    token0: { symbol: string; icon: string }
    token1: { symbol: string; icon: string }
    type: string
    fee: string
    totalVotes: string
    totalVotesPercent: string
    rewardsUsd: string
    rewardsTokens: { amount: string; symbol: string; icon: string }[]
    apr: string
    verified: boolean
}

const sampleVotePools: VotePool[] = [
    {
        id: "1",
        token0: { symbol: "ETH", icon: "/assets/tokens/eth.svg" },
        token1: { symbol: "MEGA", icon: "/assets/Logo.svg" },
        type: "Concentrated Stable 1",
        fee: "0.01%",
        totalVotes: "52.41M",
        totalVotesPercent: "15.32%",
        rewardsUsd: "~$145,234.56",
        rewardsTokens: [
            { amount: "12,500", symbol: "MEGA", icon: "/assets/Logo.svg" },
            { amount: "25.5", symbol: "ETH", icon: "/assets/tokens/eth.svg" }
        ],
        apr: "156.45%",
        verified: true
    },
    {
        id: "2",
        token0: { symbol: "USDC", icon: "/assets/tokens/usdc.svg" },
        token1: { symbol: "MEGA", icon: "/assets/Logo.svg" },
        type: "Basic Volatile",
        fee: "0.3%",
        totalVotes: "38.72M",
        totalVotesPercent: "11.31%",
        rewardsUsd: "~$98,765.43",
        rewardsTokens: [
            { amount: "8,750", symbol: "MEGA", icon: "/assets/Logo.svg" },
            { amount: "15,000", symbol: "USDC", icon: "/assets/tokens/usdc.svg" }
        ],
        apr: "128.32%",
        verified: true
    },
    {
        id: "3",
        token0: { symbol: "ETH", icon: "/assets/tokens/eth.svg" },
        token1: { symbol: "USDC", icon: "/assets/tokens/usdc.svg" },
        type: "Concentrated Volatile 100",
        fee: "0.0367%",
        totalVotes: "29.15M",
        totalVotesPercent: "8.52%",
        rewardsUsd: "~$76,543.21",
        rewardsTokens: [
            { amount: "45.2", symbol: "ETH", icon: "/assets/tokens/eth.svg" },
            { amount: "12,500", symbol: "USDC", icon: "/assets/tokens/usdc.svg" }
        ],
        apr: "98.76%",
        verified: true
    },
    {
        id: "4",
        token0: { symbol: "ETH", icon: "/assets/tokens/eth.svg" },
        token1: { symbol: "BTC", icon: "/assets/tokens/btc.svg" },
        type: "Concentrated Volatile 100",
        fee: "0.0319%",
        totalVotes: "21.89M",
        totalVotesPercent: "6.40%",
        rewardsUsd: "~$54,321.09",
        rewardsTokens: [
            { amount: "0.85", symbol: "BTC", icon: "/assets/tokens/btc.svg" },
            { amount: "18.3", symbol: "ETH", icon: "/assets/tokens/eth.svg" }
        ],
        apr: "76.54%",
        verified: true
    },
    {
        id: "5",
        token0: { symbol: "USDC", icon: "/assets/tokens/usdc.svg" },
        token1: { symbol: "BTC", icon: "/assets/tokens/btc.svg" },
        type: "Concentrated Volatile 100",
        fee: "0.0354%",
        totalVotes: "18.45M",
        totalVotesPercent: "5.39%",
        rewardsUsd: "~$43,210.87",
        rewardsTokens: [
            { amount: "0.65", symbol: "BTC", icon: "/assets/tokens/btc.svg" },
            { amount: "8,500", symbol: "USDC", icon: "/assets/tokens/usdc.svg" }
        ],
        apr: "65.43%",
        verified: true
    }
]

export default function Vote() {
    const [searchQuery, setSearchQuery] = useState("")
    const [sortBy, setSortBy] = useState("Total Votes")
    const [votes, setVotes] = useState<Record<string, number>>({})
    const [showSortDropdown, setShowSortDropdown] = useState(false)

    // Mock user voting power
    const userVotingPower = 1000000 // 1M veMEGA
    const userVotingPowerFormatted = "1.00M"
    const epochEndsIn = "2d 14h 32m"

    const totalVotesAllocated = Object.values(votes).reduce((sum, v) => sum + v, 0)
    const remainingVotes = 100 - totalVotesAllocated

    const filteredPools = sampleVotePools.filter(pool =>
        pool.token0.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pool.token1.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleVoteChange = (poolId: string, value: number) => {
        const currentValue = votes[poolId] || 0
        const otherVotes = totalVotesAllocated - currentValue
        const maxAllowed = 100 - otherVotes

        setVotes({
            ...votes,
            [poolId]: Math.min(Math.max(0, value), maxAllowed)
        })
    }

    const handleIncrement = (poolId: string) => {
        const currentValue = votes[poolId] || 0
        if (currentValue < 100 && remainingVotes > 0) {
            handleVoteChange(poolId, currentValue + 1)
        }
    }

    const handleDecrement = (poolId: string) => {
        const currentValue = votes[poolId] || 0
        if (currentValue > 0) {
            handleVoteChange(poolId, currentValue - 1)
        }
    }

    const clearVotes = () => {
        setVotes({})
    }

    const sortOptions = ["Total Votes", "Rewards", "APR", "My Votes"]

    return (
        <div className="w-full max-w-7xl mx-auto px-4">
            {/* Hero Stats Section */}
            <div className="flex flex-col-reverse gap-3 md:flex-row mb-6">
                {/* Stats Card */}
                <div className="flex-1 bg-[#0d1f1a]/80 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="hidden lg:flex w-14 h-14 rounded-full border border-white/10 items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m9 12 2 2 4-4" />
                                <path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z" />
                                <path d="M22 19H2" />
                            </svg>
                        </div>
                        <p className="text-white/70 text-sm max-w-sm">
                            Vote with your veMEGA to direct MEGA emissions to liquidity pools and earn rewards.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 sm:divide-x divide-white/10">
                        <div className="sm:pr-5">
                            <div className="text-lg font-semibold text-white">~342.15M</div>
                            <div className="text-sm text-white/50">Total Votes</div>
                        </div>
                        <div className="sm:px-5">
                            <div className="text-lg font-semibold text-white">~$1.24M</div>
                            <div className="text-sm text-white/50">Weekly Rewards</div>
                        </div>
                        <div className="sm:px-5">
                            <div className="text-lg font-semibold text-white">234</div>
                            <div className="text-sm text-white/50">Active Gauges</div>
                        </div>
                        <div className="sm:pl-5">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-[#f7931a]" />
                                <div className="text-lg font-semibold text-white">{epochEndsIn}</div>
                            </div>
                            <div className="text-sm text-white/50">Epoch Ends</div>
                        </div>
                    </div>
                </div>

                {/* User Voting Power Card */}
                <div className="relative w-full md:max-w-md overflow-hidden rounded-2xl border border-[#f7931a]/20 bg-gradient-to-br from-[#f7931a]/10 to-[#15713a]/10">
                    <div className="p-6 flex flex-col justify-center h-full">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-[#f7931a]/20 flex items-center justify-center">
                                <Image
                                    src="/assets/Logo.svg"
                                    alt="veMEGA"
                                    width={24}
                                    height={24}
                                />
                            </div>
                            <div>
                                <div className="text-sm text-white/60">Your Voting Power</div>
                                <div className="text-xl font-bold text-white">{userVotingPowerFormatted} veMEGA</div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-white/60">Votes Allocated</span>
                            <span className="text-sm font-semibold text-[#f7931a]">{totalVotesAllocated}%</span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                            <div
                                className="h-full bg-gradient-to-r from-[#f7931a] to-[#15713a] transition-all duration-300"
                                style={{ width: `${totalVotesAllocated}%` }}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Link
                                href="/lock"
                                className="flex-1 text-center bg-[#1a3d32] hover:bg-[#1f4a3d] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors border border-white/10"
                            >
                                Get veMEGA
                            </Link>
                            {totalVotesAllocated > 0 && (
                                <button
                                    onClick={clearVotes}
                                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Pools Section */}
            <div className="bg-[#0a1612] rounded-2xl border border-white/10 overflow-hidden">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between gap-4 p-5 sm:items-center border-b border-white/5">
                    <div className="flex items-center gap-2 text-xl font-semibold text-white">
                        Vote for Gauges
                        <span className="px-2 py-0.5 text-xs rounded-full bg-[#f7931a]/20 text-[#f7931a]">
                            {sampleVotePools.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative flex items-center border border-white/20 rounded-full focus-within:border-[#f7931a]">
                            <Search className="w-4 h-4 ml-3.5 text-white/50" />
                            <input
                                type="text"
                                placeholder="Search pools..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full sm:w-48 px-3.5 py-2.5 bg-transparent text-sm text-white placeholder:text-white/50 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center justify-between border-b border-white/5 overflow-x-auto">
                    <div className="flex items-center divide-x divide-white/10">
                        {/* Token Filter */}
                        <button className="flex flex-col gap-1.5 px-6 py-4 text-left hover:bg-white/5 transition-colors min-w-[140px]">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/50">
                                Token
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-[#f7931a]">
                                All Tokens
                                <ChevronDown className="w-2.5 h-2.5" />
                            </div>
                        </button>

                        {/* Type Filter */}
                        <button className="flex flex-col gap-1.5 px-6 py-4 text-left hover:bg-white/5 transition-colors min-w-[140px]">
                            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                                Type
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-[#f7931a]">
                                Any
                                <ChevronDown className="w-2.5 h-2.5" />
                            </div>
                        </button>

                        {/* Sort */}
                        <div className="relative">
                            <button
                                onClick={() => setShowSortDropdown(!showSortDropdown)}
                                className="flex flex-col gap-1.5 px-6 py-4 text-left hover:bg-white/5 transition-colors min-w-[140px]"
                            >
                                <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                                    Sort
                                </div>
                                <div className="flex items-center gap-2 text-xs font-semibold text-[#f7931a]">
                                    {sortBy}
                                    <ArrowDown className="w-2.5 h-2.5" />
                                </div>
                            </button>

                            {showSortDropdown && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowSortDropdown(false)}
                                    />
                                    <div className="absolute left-0 top-full mt-1 bg-[#0a1612] rounded-xl border border-white/10 shadow-xl z-50 overflow-hidden min-w-[160px]">
                                        {sortOptions.map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => {
                                                    setSortBy(option)
                                                    setShowSortDropdown(false)
                                                }}
                                                className={`w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between ${sortBy === option
                                                    ? "text-[#f7931a] bg-[#f7931a]/10"
                                                    : "text-white/70 hover:text-white hover:bg-white/5"
                                                    }`}
                                            >
                                                {option}
                                                {sortBy === option && <Check className="w-4 h-4" />}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <button className="flex flex-col items-end gap-1.5 px-6 py-4 min-w-[100px]">
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                            Filters
                        </div>
                        <div className="text-xs font-semibold text-white/40">
                            Default
                        </div>
                    </button>
                </div>

                {/* Table Header (Desktop) */}
                <div className="hidden lg:grid grid-cols-6 gap-8 px-8 py-3.5 text-xs text-white/50 border-b border-white/5">
                    <div className="col-span-2">Pools</div>
                    <button className="flex items-center justify-end gap-1 text-white hover:text-white transition-colors">
                        Total Votes
                        <ArrowDown className="w-3 h-3" />
                    </button>
                    <button className="flex items-center justify-end gap-1 hover:text-white transition-colors">
                        Rewards
                    </button>
                    <button className="flex items-center justify-end gap-1 hover:text-white transition-colors">
                        APR
                    </button>
                    <div className="text-center">Your Vote</div>
                </div>

                {/* Pool Rows */}
                <div className="divide-y divide-white/5">
                    {filteredPools.map((pool) => (
                        <div
                            key={pool.id}
                            className="group grid grid-cols-1 gap-4 p-6 hover:bg-white/[0.02] transition-colors sm:grid-cols-3 sm:gap-8 sm:px-8 sm:py-7 lg:grid-cols-6"
                        >
                            {/* Pool Info */}
                            <div className="space-y-4 pb-2 sm:col-span-3 sm:border-b sm:border-white/5 sm:pb-8 lg:col-span-2 lg:border-b-0 lg:pb-0">
                                <div className="flex items-center gap-3">
                                    <div className="flex -space-x-2">
                                        <Image
                                            src={pool.token0.icon}
                                            alt={pool.token0.symbol}
                                            width={40}
                                            height={40}
                                            className="w-10 h-10 rounded-full border-2 border-[#0a1612]"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement
                                                target.src = "/assets/Logo.svg"
                                            }}
                                        />
                                        <Image
                                            src={pool.token1.icon}
                                            alt={pool.token1.symbol}
                                            width={40}
                                            height={40}
                                            className="w-10 h-10 rounded-full border-2 border-[#0a1612]"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement
                                                target.src = "/assets/Logo.svg"
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="text-sm font-semibold text-white">
                                                {pool.token0.symbol} / {pool.token1.symbol}
                                            </span>
                                            {pool.verified && (
                                                <img
                                                    src="/assets/verified-badge.svg"
                                                    alt="Verified"
                                                    className="w-3.5 h-3.5"
                                                />
                                            )}
                                            <span className="px-1.5 py-px text-[10px] font-semibold rounded-full bg-white/10 text-white/50 uppercase">
                                                {pool.fee}
                                            </span>
                                            <MoreHorizontal className="w-3 h-3 text-white/50" />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {pool.type.includes("Concentrated") && (
                                                <span className="w-3 text-center text-[8px] font-semibold leading-3 text-white bg-[#f7931a]">
                                                    A
                                                </span>
                                            )}
                                            <span className="text-xs font-semibold text-[#f7931a]">
                                                {pool.type}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Total Votes */}
                            <div className="flex justify-between gap-4 border-b border-white/5 pb-4 text-xs sm:flex-col sm:border-b-0 sm:pb-0 lg:text-right">
                                <div className="text-white/50 lg:hidden">Total Votes</div>
                                <div className="lg:text-sm text-white">{pool.totalVotes}</div>
                                <div className="text-white/50">{pool.totalVotesPercent}</div>
                            </div>

                            {/* Rewards */}
                            <div className="flex justify-between gap-4 border-b border-white/5 pb-4 text-xs sm:flex-col sm:border-b-0 sm:pb-0 lg:text-right">
                                <div className="text-white/50 lg:hidden">Rewards</div>
                                <div className="lg:text-sm text-white">{pool.rewardsUsd}</div>
                                <div className="hidden sm:block space-y-1 text-white/50">
                                    {pool.rewardsTokens.map((token, i) => (
                                        <div key={i} className="flex items-center justify-end gap-1">
                                            <Image
                                                src={token.icon}
                                                alt={token.symbol}
                                                width={12}
                                                height={12}
                                                className="w-3 h-3 rounded-full"
                                            />
                                            {token.amount} <span className="opacity-70">{token.symbol}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* APR */}
                            <div className="flex justify-between gap-4 border-b border-white/5 pb-4 text-xs sm:flex-col sm:items-end sm:border-b-0 sm:pb-0">
                                <div className="text-white/50 lg:hidden">Vote APR</div>
                                <div className="lg:text-sm text-green-400 font-semibold">{pool.apr}</div>
                            </div>

                            {/* Vote Input */}
                            <div className="flex justify-between gap-4 text-xs sm:flex-col sm:items-center">
                                <div className="text-white/50 lg:hidden">Your Vote</div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDecrement(pool.id)}
                                        disabled={!votes[pool.id]}
                                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                                    >
                                        <Minus className="w-4 h-4 text-white" />
                                    </button>

                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={votes[pool.id] || ""}
                                            onChange={(e) => handleVoteChange(pool.id, parseInt(e.target.value) || 0)}
                                            placeholder="0"
                                            className="w-16 h-10 bg-[#0d1f1a] border border-white/10 rounded-lg text-center text-sm font-semibold text-white placeholder:text-white/30 focus:outline-none focus:border-[#f7931a] transition-colors"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/50">%</span>
                                    </div>

                                    <button
                                        onClick={() => handleIncrement(pool.id)}
                                        disabled={remainingVotes <= 0}
                                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                                    >
                                        <Plus className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {filteredPools.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white/20 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m9 12 2 2 4-4" />
                            <path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z" />
                            <path d="M22 19H2" />
                        </svg>
                        <h3 className="text-lg font-semibold text-white mb-2">No pools found</h3>
                        <p className="text-sm text-white/50 max-w-sm">
                            Try adjusting your search or filters to find what you&apos;re looking for.
                        </p>
                    </div>
                )}
            </div>

            {/* Sticky Vote Button */}
            {totalVotesAllocated > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a1612] via-[#0a1612] to-transparent z-50">
                    <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 bg-[#0d1f1a] rounded-2xl p-4 border border-white/10 shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:block">
                                <div className="text-sm text-white/60">Votes Allocated</div>
                                <div className="text-lg font-bold text-white">{totalVotesAllocated}%</div>
                            </div>
                            <div className="w-px h-10 bg-white/10 hidden sm:block" />
                            <div className="text-sm text-white/60">
                                <span className="text-[#f7931a] font-semibold">{Object.keys(votes).filter(k => votes[k] > 0).length}</span> pools selected
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={clearVotes}
                                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Clear
                            </button>
                            <Button
                                className="bg-[#f7931a] hover:bg-[#ff9f2a] text-white font-bold px-6 py-2.5 h-auto"
                            >
                                Cast Vote
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
