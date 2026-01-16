"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
    Layers,
    Search,
    ChevronDown,
    ArrowDown,
    Plus,
    MoreHorizontal,
    CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface Pool {
    id: string
    token0: { symbol: string; icon: string }
    token1: { symbol: string; icon: string }
    type: string
    fee: string
    volume: string
    volumeTokens: { amount: string; symbol: string }[]
    fees: string
    feesTokens: { amount: string; symbol: string }[]
    tvl: string
    tvlTokens: { amount: string; symbol: string }[]
    feeApr: string
    emissionApr: string
    verified: boolean
}

const samplePools: Pool[] = [
    {
        id: "1",
        token0: { symbol: "ETH", icon: "/assets/tokens/eth.svg" },
        token1: { symbol: "MEGA", icon: "/assets/Logo.svg" },
        type: "Concentrated Stable 1",
        fee: "0.01%",
        volume: "~$9.58M",
        volumeTokens: [
            { amount: "1,239.98", symbol: "ETH" },
            { amount: "1,521.81", symbol: "MEGA" }
        ],
        fees: "~$958.99",
        feesTokens: [
            { amount: "0.12399", symbol: "ETH" },
            { amount: "0.15218", symbol: "MEGA" }
        ],
        tvl: "~$35.84M",
        tvlTokens: [
            { amount: "7,230.54", symbol: "ETH" },
            { amount: "2,782.13", symbol: "MEGA" }
        ],
        feeApr: "1.43%",
        emissionApr: "25.51%",
        verified: true
    },
    {
        id: "2",
        token0: { symbol: "USDC", icon: "/assets/tokens/usdc.svg" },
        token1: { symbol: "MEGA", icon: "/assets/Logo.svg" },
        type: "Basic Volatile",
        fee: "0.3%",
        volume: "~$3.13M",
        volumeTokens: [
            { amount: "1,238,527.62", symbol: "USDC" },
            { amount: "3,356,954.85", symbol: "MEGA" }
        ],
        fees: "~$9,400.32",
        feesTokens: [
            { amount: "3,715.58", symbol: "USDC" },
            { amount: "10,070.86", symbol: "MEGA" }
        ],
        tvl: "~$34.99M",
        tvlTokens: [
            { amount: "17.43M", symbol: "USDC" },
            { amount: "31.05M", symbol: "MEGA" }
        ],
        feeApr: "12.35%",
        emissionApr: "25.89%",
        verified: true
    },
    {
        id: "3",
        token0: { symbol: "ETH", icon: "/assets/tokens/eth.svg" },
        token1: { symbol: "USDC", icon: "/assets/tokens/usdc.svg" },
        type: "Concentrated Volatile 100",
        fee: "0.0367%",
        volume: "~$116.14M",
        volumeTokens: [
            { amount: "18,424.95", symbol: "ETH" },
            { amount: "55.14M", symbol: "USDC" }
        ],
        fees: "~$42,623.77",
        feesTokens: [
            { amount: "6.76195", symbol: "ETH" },
            { amount: "20,236.85", symbol: "USDC" }
        ],
        tvl: "~$31.64M",
        tvlTokens: [
            { amount: "4,379.28", symbol: "ETH" },
            { amount: "17.12M", symbol: "USDC" }
        ],
        feeApr: "63.5%",
        emissionApr: "166.76%",
        verified: true
    },
    {
        id: "4",
        token0: { symbol: "ETH", icon: "/assets/tokens/eth.svg" },
        token1: { symbol: "BTC", icon: "/assets/tokens/btc.svg" },
        type: "Concentrated Volatile 100",
        fee: "0.0319%",
        volume: "~$53.27M",
        volumeTokens: [
            { amount: "8,484.95", symbol: "ETH" },
            { amount: "263.56", symbol: "BTC" }
        ],
        fees: "~$16,995.58",
        feesTokens: [
            { amount: "2.7067", symbol: "ETH" },
            { amount: "0.08407", symbol: "BTC" }
        ],
        tvl: "~$25.19M",
        tvlTokens: [
            { amount: "4,525.26", symbol: "ETH" },
            { amount: "107.03", symbol: "BTC" }
        ],
        feeApr: "32.22%",
        emissionApr: "216.4%",
        verified: true
    },
    {
        id: "5",
        token0: { symbol: "USDC", icon: "/assets/tokens/usdc.svg" },
        token1: { symbol: "BTC", icon: "/assets/tokens/btc.svg" },
        type: "Concentrated Volatile 100",
        fee: "0.0354%",
        volume: "~$35.44M",
        volumeTokens: [
            { amount: "16.6M", symbol: "USDC" },
            { amount: "195.2", symbol: "BTC" }
        ],
        fees: "~$12,547.82",
        feesTokens: [
            { amount: "5,877.64", symbol: "USDC" },
            { amount: "0.0691", symbol: "BTC" }
        ],
        tvl: "~$17.25M",
        tvlTokens: [
            { amount: "10.94M", symbol: "USDC" },
            { amount: "65.11", symbol: "BTC" }
        ],
        feeApr: "35.49%",
        emissionApr: "85.45%",
        verified: true
    }
]

export default function Liquidity() {
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState<"pools" | "tokens">("pools")
    const [sortBy, setSortBy] = useState("TVL")

    const filteredPools = samplePools.filter(pool =>
        pool.token0.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pool.token1.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="w-full max-w-7xl mx-auto px-4">
            {/* Hero Stats Section */}
            <div className="flex flex-col-reverse gap-3 md:flex-row mb-6">
                {/* Stats Card */}
                <div className="flex-1 bg-[#0d1f1a]/80 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="hidden lg:flex w-14 h-14 rounded-full border border-white/10 items-center justify-center">
                            <Layers className="w-6 h-6 text-white/60" />
                        </div>
                        <p className="text-white/70 text-sm max-w-sm">
                            Provide liquidity to enable low-slippage swaps and earn MEGA emissions.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 sm:divide-x divide-white/10">
                        <div className="sm:pr-5">
                            <div className="text-lg font-semibold text-white">~$429.95M</div>
                            <div className="text-sm text-white/50">Volume</div>
                        </div>
                        <div className="sm:px-5">
                            <div className="text-lg font-semibold text-white">~$519,369.79</div>
                            <div className="text-sm text-white/50">Fees</div>
                        </div>
                        <div className="sm:pl-5">
                            <div className="text-lg font-semibold text-white">~$449.56M</div>
                            <div className="text-sm text-white/50">TVL</div>
                        </div>
                    </div>
                </div>

                {/* Banner/CTA */}
                <div className="relative w-full md:max-w-md overflow-hidden rounded-2xl border-4 border-[#f7931a]/20 bg-gradient-to-br from-[#f7931a]/20 to-[#15713a]/20">
                    <div className="p-6 flex flex-col justify-center h-full">
                        <h3 className="text-xl font-bold text-white mb-2">Autopilot</h3>
                        <p className="text-sm text-white/60 mb-4">
                            Set it and forget it. Let our algorithms optimize your liquidity positions.
                        </p>
                        <Button className="w-fit bg-[#f7931a] hover:bg-[#ff9f2a] text-white font-bold text-sm">
                            Learn More
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Pools Section */}
            <div className="bg-[#0a1612] rounded-2xl border border-white/10 overflow-hidden">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between gap-4 p-5 sm:items-center border-b border-white/5">
                    <div className="flex items-center gap-6 text-xl font-semibold">
                        <button
                            onClick={() => setActiveTab("pools")}
                            className={`flex items-center gap-2 transition-colors ${activeTab === "pools" ? "text-white" : "text-white/50 hover:text-white/80"
                                }`}
                        >
                            Pools
                            <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === "pools"
                                ? "bg-[#f7931a]/20 text-[#f7931a]"
                                : "bg-white/10 text-white/50"
                                }`}>
                                {samplePools.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab("tokens")}
                            className={`flex items-center gap-2 transition-colors ${activeTab === "tokens" ? "text-white" : "text-white/50 hover:text-white/80"
                                }`}
                        >
                            Tokens
                            <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-white/50">
                                42
                            </span>
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/liquidity/deposit"
                            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-4 py-2.5 rounded-full text-xs font-semibold transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            New deposit
                        </Link>
                        <Link
                            href="/liquidity/launch"
                            className="flex items-center gap-2 bg-[#f7931a] hover:bg-[#ff9f2a] text-white px-4 py-2.5 rounded-full text-xs font-semibold transition-colors"
                        >
                            <Layers className="w-4 h-4" />
                            Launch pool
                        </Link>

                        <div className="relative flex items-center border border-white/20 rounded-full focus-within:border-[#f7931a]">
                            <Search className="w-4 h-4 ml-3.5 text-white/50" />
                            <input
                                type="text"
                                placeholder="Symbol or address..."
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
                                Listed & Emerging
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

                        {/* Volatility Filter */}
                        <button className="flex flex-col gap-1.5 px-6 py-4 text-left hover:bg-white/5 transition-colors min-w-[140px]">
                            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                                Volatility
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-[#f7931a]">
                                Any
                                <ChevronDown className="w-2.5 h-2.5" />
                            </div>
                        </button>

                        {/* Sort */}
                        <button className="flex flex-col gap-1.5 px-6 py-4 text-left hover:bg-white/5 transition-colors min-w-[140px]">
                            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                                Sort
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-[#f7931a]">
                                {sortBy}
                                <ArrowDown className="w-2.5 h-2.5" />
                            </div>
                        </button>
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
                <div className="hidden lg:grid grid-cols-7 gap-8 px-8 py-3.5 text-xs text-white/50 border-b border-white/5">
                    <div className="col-span-2">Pools</div>
                    <button className="flex items-center justify-end gap-1 hover:text-white transition-colors">
                        Volume
                    </button>
                    <button className="flex items-center justify-end gap-1 hover:text-white transition-colors">
                        Fees
                    </button>
                    <button className="flex items-center justify-end gap-1 text-white hover:text-white transition-colors">
                        TVL
                        <ArrowDown className="w-3 h-3" />
                    </button>
                    <button className="flex items-center justify-end gap-1 hover:text-white transition-colors">
                        Fee APR
                    </button>
                    <button className="flex items-center justify-end gap-1 hover:text-white transition-colors">
                        Emission APR
                    </button>
                </div>

                {/* Pool Rows */}
                <div className="divide-y divide-white/5">
                    {filteredPools.map((pool) => (
                        <Link
                            key={pool.id}
                            href={`/liquidity/deposit?pool=${pool.id}`}
                            className="group grid grid-cols-1 gap-4 p-6 hover:bg-white/5 transition-colors sm:grid-cols-5 sm:gap-8 sm:px-8 sm:py-7 lg:grid-cols-7"
                        >
                            {/* Pool Info */}
                            <div className="space-y-4 pb-2 sm:col-span-5 sm:border-b sm:border-white/5 sm:pb-8 lg:col-span-2 lg:border-b-0 lg:pb-0">
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

                            {/* Volume */}
                            <div className="flex justify-between gap-4 border-b border-white/5 pb-4 text-xs sm:flex-col sm:border-b-0 sm:pb-0 lg:text-right">
                                <div className="text-white/50 lg:hidden">Volume</div>
                                <div className="lg:text-sm text-white">{pool.volume}</div>
                                <div className="hidden sm:block space-y-1 text-white/50">
                                    {pool.volumeTokens.map((token, i) => (
                                        <div key={i}>
                                            {token.amount} <span className="opacity-70">{token.symbol}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Fees */}
                            <div className="flex justify-between gap-4 border-b border-white/5 pb-4 text-xs sm:flex-col sm:border-b-0 sm:pb-0 lg:text-right">
                                <div className="text-white/50 lg:hidden">Fees</div>
                                <div className="lg:text-sm text-white">{pool.fees}</div>
                                <div className="hidden sm:block space-y-1 text-white/50">
                                    {pool.feesTokens.map((token, i) => (
                                        <div key={i}>
                                            {token.amount} <span className="opacity-70">{token.symbol}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* TVL */}
                            <div className="flex justify-between gap-4 border-b border-white/5 pb-4 text-xs sm:flex-col sm:border-b-0 sm:pb-0 lg:text-right">
                                <div className="text-white/50 lg:hidden">TVL</div>
                                <div className="lg:text-sm text-white">{pool.tvl}</div>
                                <div className="hidden sm:block space-y-1 text-white/50">
                                    {pool.tvlTokens.map((token, i) => (
                                        <div key={i}>
                                            {token.amount} <span className="opacity-70">{token.symbol}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Fee APR */}
                            <div className="flex justify-between gap-4 border-b border-white/5 pb-4 text-xs sm:flex-col sm:items-end sm:border-b-0 sm:pb-0">
                                <div className="text-white/50 lg:hidden">Fee APR</div>
                                <div className="lg:text-sm text-white">{pool.feeApr}</div>
                            </div>

                            {/* Emission APR */}
                            <div className="flex justify-between gap-4 text-xs sm:flex-col sm:items-end">
                                <div className="text-white/50 lg:hidden">Emission APR</div>
                                <div className="flex flex-col items-end gap-4">
                                    <div className="lg:text-sm text-white">{pool.emissionApr}</div>
                                    <div className="flex items-center gap-1 rounded-lg bg-[#f7931a]/10 px-2 py-1.5 text-xs text-[#f7931a] hover:bg-[#f7931a]/20 transition-colors">
                                        <Plus className="w-4 h-4" />
                                        New deposit
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Empty State */}
                {filteredPools.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Layers className="w-12 h-12 text-white/20 mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">No pools found</h3>
                        <p className="text-sm text-white/50 max-w-sm">
                            Try adjusting your search or filters to find what you're looking for.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
