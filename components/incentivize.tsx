"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronDown, AlertTriangle, Plus, HelpCircle } from "lucide-react"
import TokenSelectModal, { Token } from "./token-select-modal"

// Sample pool data
const samplePools = [
    {
        id: "1",
        token0: { symbol: "MEGA", icon: "/assets/Logo.svg" },
        token1: { symbol: "wstETH", icon: "https://assets.coingecko.com/coins/images/18834/large/wstETH.png" },
        type: "Basic Volatile",
        fee: "1.0%",
        apr: "17.53%",
        tvl: "$219,376.76",
        deposits: "No deposits"
    },
    {
        id: "2",
        token0: { symbol: "MEGA", icon: "/assets/Logo.svg" },
        token1: { symbol: "wstETH", icon: "https://assets.coingecko.com/coins/images/18834/large/wstETH.png" },
        type: "Concentrated Volatile 200",
        fee: "1.0%",
        apr: "876.22%",
        tvl: "$130,885.96",
        deposits: "No deposits"
    },
]

export default function Incentivize() {
    const [token0, setToken0] = useState<Token | undefined>(undefined)
    const [token1, setToken1] = useState<Token | undefined>(undefined)
    const [showToken0Modal, setShowToken0Modal] = useState(false)
    const [showToken1Modal, setShowToken1Modal] = useState(false)
    const [poolType, setPoolType] = useState<"concentrated" | "basic" | null>(null)

    const hasTokensSelected = token0 && token1

    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4">
                {/* Main Card */}
                <div className="bg-[#0a1612] rounded-3xl border border-white/10 overflow-hidden">
                    {/* Header */}
                    <div className="p-6 pb-4">
                        <h1 className="text-xl font-semibold text-white">Incentivize pool</h1>
                    </div>

                    {/* Token Selectors */}
                    <div className="px-6 pb-6">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Token 0 */}
                            <div>
                                <label className="block text-sm text-white/60 mb-3">
                                    Token you want to incentivize
                                </label>
                                <button
                                    onClick={() => setShowToken0Modal(true)}
                                    className="w-full flex items-center justify-between gap-2 bg-[#f7931a] hover:bg-[#ff9f2a] transition-all rounded-full px-4 py-3 text-white font-semibold"
                                >
                                    <div className="flex items-center gap-2">
                                        {token0 ? (
                                            <>
                                                <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10">
                                                    <Image
                                                        src={token0.logoUrl}
                                                        alt={token0.symbol}
                                                        width={24}
                                                        height={24}
                                                        className="w-6 h-6"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement
                                                            target.src = "/assets/Logo.svg"
                                                        }}
                                                    />
                                                </div>
                                                <span>{token0.symbol}</span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-6 h-6 rounded-full bg-white/20" />
                                                <span>Select token</span>
                                            </>
                                        )}
                                    </div>
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Token 1 */}
                            <div>
                                <label className="block text-sm text-white/60 mb-3">
                                    Token you want to pair with
                                </label>
                                <button
                                    onClick={() => setShowToken1Modal(true)}
                                    className="w-full flex items-center justify-between gap-2 bg-[#f7931a] hover:bg-[#ff9f2a] transition-all rounded-full px-4 py-3 text-white font-semibold"
                                >
                                    <div className="flex items-center gap-2">
                                        {token1 ? (
                                            <>
                                                <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10">
                                                    <Image
                                                        src={token1.logoUrl}
                                                        alt={token1.symbol}
                                                        width={24}
                                                        height={24}
                                                        className="w-6 h-6"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement
                                                            target.src = "/assets/Logo.svg"
                                                        }}
                                                    />
                                                </div>
                                                <span>{token1.symbol}</span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-6 h-6 rounded-full bg-white/20" />
                                                <span>Select token</span>
                                            </>
                                        )}
                                    </div>
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Pool Type Selection - Only show when tokens selected */}
                    {hasTokensSelected && (
                        <div className="px-6 pb-6">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Concentrated Pools */}
                                <button
                                    onClick={() => setPoolType("concentrated")}
                                    className={`p-4 rounded-xl border text-left transition-all ${poolType === "concentrated"
                                        ? "bg-[#f7931a]/10 border-[#f7931a]"
                                        : "bg-[#0d1f1a] border-white/10 hover:border-white/20"
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${poolType === "concentrated" ? "border-[#f7931a]" : "border-white/30"
                                            }`}>
                                            {poolType === "concentrated" && (
                                                <div className="w-2 h-2 rounded-full bg-[#f7931a]" />
                                            )}
                                        </div>
                                        <span className="font-semibold text-white text-sm">Concentrated Pools</span>
                                    </div>
                                    <p className="text-xs text-white/50 leading-relaxed">
                                        These pools require you to specify a price range in which your liquidity will be active. The range is defined using evenly spaced price intervals called ticks.
                                    </p>
                                </button>

                                {/* Basic Pools */}
                                <button
                                    onClick={() => setPoolType("basic")}
                                    className={`p-4 rounded-xl border text-left transition-all ${poolType === "basic"
                                        ? "bg-[#f7931a]/10 border-[#f7931a]"
                                        : "bg-[#0d1f1a] border-white/10 hover:border-white/20"
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${poolType === "basic" ? "border-[#f7931a]" : "border-white/30"
                                            }`}>
                                            {poolType === "basic" && (
                                                <div className="w-2 h-2 rounded-full bg-[#f7931a]" />
                                            )}
                                        </div>
                                        <span className="font-semibold text-white text-sm">Basic Pools</span>
                                    </div>
                                    <p className="text-xs text-white/50 leading-relaxed">
                                        Also known as constant product AMMs, these pools spread liquidity across the full price range (0 to ∞) and require little to no active management.
                                    </p>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Warning */}
                    <div className="px-6 pb-6">
                        <div className="bg-[#f7931a]/10 rounded-xl p-4 flex items-start gap-3 border border-[#f7931a]/20">
                            <AlertTriangle className="w-5 h-5 text-[#f7931a] flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-white/70">
                                <span className="font-semibold text-[#f7931a]">Warning:</span> The incentivize feature is mainly used by protocols. Make sure you know how it works before using it as any transaction is final and cannot be reverted.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pool Results - Only show when tokens and pool type selected */}
                {hasTokensSelected && poolType && (
                    <div className="space-y-3">
                        {samplePools
                            .filter(pool =>
                                poolType === "concentrated"
                                    ? pool.type.includes("Concentrated")
                                    : !pool.type.includes("Concentrated")
                            )
                            .map((pool) => (
                                <div
                                    key={pool.id}
                                    className="bg-[#0a1612] rounded-2xl border border-white/10 p-5"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        {/* Pool Info */}
                                        <div className="flex items-center gap-3">
                                            <div className="flex -space-x-2">
                                                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 border-2 border-[#0a1612] z-10">
                                                    <Image
                                                        src={pool.token0.icon}
                                                        alt={pool.token0.symbol}
                                                        width={32}
                                                        height={32}
                                                        className="w-8 h-8"
                                                    />
                                                </div>
                                                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 border-2 border-[#0a1612]">
                                                    <Image
                                                        src={pool.token1.icon}
                                                        alt={pool.token1.symbol}
                                                        width={32}
                                                        height={32}
                                                        className="w-8 h-8"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement
                                                            target.src = "/assets/Logo.svg"
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-white">
                                                        {pool.token0.symbol} / {pool.token1.symbol}
                                                    </span>
                                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#f7931a]/20 text-[#f7931a] rounded">
                                                        {pool.fee}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-[#f7931a]">{pool.type}</div>
                                            </div>
                                        </div>

                                        {/* APR & TVL */}
                                        <div className="flex items-center gap-8 text-right">
                                            <div>
                                                <div className="text-sm font-semibold text-white">{pool.apr}</div>
                                                <div className="text-xs text-white/50">APR</div>
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-white">~{pool.tvl}</div>
                                                <div className="text-xs text-white/50">TVL</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Row */}
                                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                        <span className="text-xs text-white/40">{pool.deposits}</span>
                                        <button className="flex items-center gap-1.5 text-[#f7931a] hover:text-[#ff9f2a] text-sm font-medium transition-colors">
                                            <Plus className="w-4 h-4" />
                                            Add incentive
                                        </button>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* Token Selection Modals */}
            <TokenSelectModal
                isOpen={showToken0Modal}
                onClose={() => setShowToken0Modal(false)}
                onSelect={(token) => {
                    setToken0(token)
                    setShowToken0Modal(false)
                }}
                selectedToken={token0}
                excludeToken={token1}
            />
            <TokenSelectModal
                isOpen={showToken1Modal}
                onClose={() => setShowToken1Modal(false)}
                onSelect={(token) => {
                    setToken1(token)
                    setShowToken1Modal(false)
                }}
                selectedToken={token1}
                excludeToken={token0}
            />
        </>
    )
}
