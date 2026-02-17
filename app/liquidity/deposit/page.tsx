"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { HelpCircle, ChevronDown, ZoomIn, ZoomOut, RotateCcw, Minus, Plus, ArrowLeft } from "lucide-react"

// Mock pool data
const mockPool = {
    token0: {
        symbol: "MEGA",
        name: "Megadrome",
        icon: "/assets/Logo.svg"
    },
    token1: {
        symbol: "WETH",
        name: "Wrapped Ether",
        icon: "/assets/tokens/eth.svg"
    },
    fee: "0.01%",
    type: "Concentrated Stable 1",
    currentPrice: 1.12,
    apr: "8.29"
}

export default function NewDepositPage() {
    const [activeToken, setActiveToken] = useState<"token0" | "token1">("token0")
    const [rangePreset, setRangePreset] = useState("0.01")
    const [lowPrice, setLowPrice] = useState("1.1198495437854652")
    const [highPrice, setHighPrice] = useState("1.1201855322245207")
    const [amount0, setAmount0] = useState("")
    const [amount1, setAmount1] = useState("")
    const [useNative, setUseNative] = useState(false)

    return (
        <main
            className="min-h-screen text-white flex flex-col"
            style={{
                background: "linear-gradient(135deg, #0a1612 0%, #0d2820 25%, #0d3d2e 50%, #15713a 100%)",
            }}
        >
            <Header />

            <div className="flex-1 px-4 py-8 sm:px-6 md:px-12">
                <div className="max-w-[600px] mx-auto space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <Link
                            href="/liquidity"
                            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-white">New deposit</h1>
                            <button className="text-white/40 hover:text-white/60 transition-colors">
                                <HelpCircle className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Pool Selection Card */}
                    <div className="bg-[#0a1612]/80 backdrop-blur-sm rounded-xl border border-white/5 p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-2 flex-shrink-0">
                                    <Image
                                        src={mockPool.token0.icon}
                                        alt={mockPool.token0.symbol}
                                        width={36}
                                        height={36}
                                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-[#0a1612]"
                                    />
                                    <Image
                                        src={mockPool.token1.icon}
                                        alt={mockPool.token1.symbol}
                                        width={36}
                                        height={36}
                                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-[#0a1612]"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                        <span className="font-semibold text-white text-sm sm:text-base">{mockPool.token0.symbol} / {mockPool.token1.symbol}</span>
                                        <span className="text-xs text-white/50 bg-white/5 px-1.5 py-0.5 rounded">✓</span>
                                        <span className="text-xs text-white/50">{mockPool.fee}</span>
                                        <span className="text-white/30 hidden sm:inline">···</span>
                                    </div>
                                    <div className="text-xs text-[#f7931a] truncate">🟦 {mockPool.type}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button className="px-3 py-1.5 rounded-lg border border-[#f7931a]/30 text-[#f7931a] text-xs sm:text-sm font-medium hover:bg-[#f7931a]/10 transition-colors">
                                    Pool info
                                </button>
                                <button className="px-3 py-1.5 rounded-lg border border-[#f7931a]/30 text-[#f7931a] text-xs sm:text-sm font-medium hover:bg-[#f7931a]/10 transition-colors">
                                    Change
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Current Price Card */}
                    <div className="bg-[#0a1612]/80 backdrop-blur-sm rounded-xl border border-white/5 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-[#f7931a] flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="text-sm text-white">Current price</span>
                            </div>
                            <button className="text-[#f7931a] text-sm font-medium hover:text-[#ff9f2a] transition-colors">
                                Edit
                            </button>
                        </div>
                    </div>

                    {/* Set Price Range Card */}
                    <div className="bg-[#0a1612]/80 backdrop-blur-sm rounded-xl border border-white/5 p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <span className="text-sm font-semibold text-white">Set price range</span>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                                <span className="text-white/50 text-[11px] sm:text-xs">1.0 {mockPool.token0.symbol} = {mockPool.currentPrice} {mockPool.token1.symbol}</span>
                                <span className="text-white/40 hidden sm:inline">~$3,082.84</span>
                                <div className="flex bg-[#1a2f2a] rounded-lg p-0.5">
                                    <button
                                        onClick={() => setActiveToken("token0")}
                                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${activeToken === "token0" ? "bg-[#f7931a] text-white" : "text-white/50"}`}
                                    >
                                        {mockPool.token0.symbol}
                                    </button>
                                    <button
                                        onClick={() => setActiveToken("token1")}
                                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${activeToken === "token1" ? "bg-[#f7931a] text-white" : "text-white/50"}`}
                                    >
                                        {mockPool.token1.symbol}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Range Presets */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                            <div className="flex overflow-x-auto gap-1 bg-[#1a2f2a] rounded-lg p-1 -mx-1 px-1 scrollbar-hide">
                                {["0.01", "0.03", "0.07", "full", "auto"].map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => setRangePreset(preset)}
                                        className={`px-2 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${rangePreset === preset ? "bg-[#f7931a] text-white" : "text-white/50 hover:text-white"}`}
                                    >
                                        {preset === "full" ? "Full" : preset === "auto" ? "Autopilot" : `±${preset}%`}
                                        {preset === "auto" && <span className="text-[#f7931a] ml-0.5">*</span>}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-[#f7931a] flex-shrink-0">{mockPool.apr}% APR</span>
                        </div>

                        {/* Price Chart */}
                        <div className="relative mb-4">
                            <div className="absolute top-2 right-2 flex gap-1 z-10">
                                <button className="w-7 h-7 rounded-md bg-[#1a2f2a] flex items-center justify-center text-white/50 hover:text-white transition-colors">
                                    <ZoomIn className="w-4 h-4" />
                                </button>
                                <button className="w-7 h-7 rounded-md bg-[#1a2f2a] flex items-center justify-center text-white/50 hover:text-white transition-colors">
                                    <ZoomOut className="w-4 h-4" />
                                </button>
                                <button className="w-7 h-7 rounded-md bg-[#1a2f2a] flex items-center justify-center text-white/50 hover:text-white transition-colors">
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Mock Chart */}
                            <div className="h-32 flex items-end justify-center gap-0.5 px-8">
                                {[15, 20, 25, 30, 35, 60, 90, 95, 85, 50, 40, 35, 30, 25, 20, 15, 12, 10, 8, 6].map((height, i) => (
                                    <div
                                        key={i}
                                        className={`w-2 rounded-t transition-all ${i >= 5 && i <= 8 ? "bg-[#f7931a]" : "bg-[#1a2f2a]"}`}
                                        style={{ height: `${height}%` }}
                                    />
                                ))}
                            </div>

                            {/* X Axis */}
                            <div className="flex justify-between text-xs text-white/30 mt-2 px-4">
                                <span>1.1197</span>
                                <span>1.1198</span>
                                <span>1.12018</span>
                                <span>1.12068</span>
                                <span>1.1218</span>
                            </div>
                        </div>

                        {/* Low/High Price Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Low Price */}
                            <div className="bg-[#1a2f2a] rounded-xl p-3 sm:p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-white/50">Low</span>
                                    <div className="flex gap-1">
                                        <button className="w-6 h-6 rounded-md bg-[#0a1612] flex items-center justify-center text-white/50 hover:text-white transition-colors">
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <button className="w-6 h-6 rounded-md bg-[#0a1612] flex items-center justify-center text-white/50 hover:text-white transition-colors">
                                            <Plus className="w-3 h-3" />
                                        </button>
                                        <button className="w-6 h-6 rounded-md bg-[#f7931a] flex items-center justify-center text-white text-xs font-bold">
                                            0
                                        </button>
                                    </div>
                                </div>
                                <div className="text-base sm:text-lg font-mono font-semibold text-white truncate">{lowPrice}</div>
                                <div className="text-xs text-white/40">~$3,082.34</div>
                            </div>

                            {/* High Price */}
                            <div className="bg-[#1a2f2a] rounded-xl p-3 sm:p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-[#f7931a]">High</span>
                                    <div className="flex gap-1">
                                        <button className="w-6 h-6 rounded-md bg-[#0a1612] flex items-center justify-center text-white/50 hover:text-white transition-colors">
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <button className="w-6 h-6 rounded-md bg-[#0a1612] flex items-center justify-center text-white/50 hover:text-white transition-colors">
                                            <Plus className="w-3 h-3" />
                                        </button>
                                        <button className="w-6 h-6 rounded-md bg-[#0a1612] flex items-center justify-center text-white/50 hover:text-white transition-colors text-xs">
                                            ∞
                                        </button>
                                    </div>
                                </div>
                                <div className="text-base sm:text-lg font-mono font-semibold text-white truncate">{highPrice}</div>
                                <div className="text-xs text-white/40">~$3,083.44</div>
                            </div>
                        </div>
                    </div>

                    {/* Set Deposit Amount Card */}
                    <div className="bg-[#0a1612]/80 backdrop-blur-sm rounded-xl border border-white/5 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-semibold text-white">Set deposit amount</span>
                            <div className="flex bg-[#1a2f2a] rounded-lg p-0.5">
                                <button className="px-2 py-1 rounded-md text-xs font-medium bg-[#f7931a] text-white">
                                    {mockPool.token0.symbol}
                                </button>
                                <button className="px-2 py-1 rounded-md text-xs font-medium text-white/50">
                                    {mockPool.token1.symbol}
                                </button>
                            </div>
                        </div>

                        {/* Token 0 Input */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-white/70">Amount</span>
                                <span className="text-xs text-white/40">Balance: 0.0 {mockPool.token0.symbol}</span>
                            </div>
                            <div className="bg-[#1a2f2a] rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0a1612] hover:bg-[#0a1612]/80 transition-colors">
                                        <Image
                                            src={mockPool.token0.icon}
                                            alt={mockPool.token0.symbol}
                                            width={24}
                                            height={24}
                                            className="w-6 h-6 rounded-full"
                                        />
                                        <span className="font-medium text-white">{mockPool.token0.symbol}</span>
                                    </button>
                                    <div className="text-right">
                                        <input
                                            type="text"
                                            value={amount0}
                                            onChange={(e) => setAmount0(e.target.value)}
                                            placeholder="0"
                                            className="w-24 bg-transparent text-right text-xl font-medium text-white placeholder-white/30 outline-none"
                                        />
                                        <div className="text-xs text-white/40">~$0.0</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Token 1 Input */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-white/70">Amount</span>
                                    <button
                                        onClick={() => setUseNative(!useNative)}
                                        className={`text-xs px-2 py-0.5 rounded ${useNative ? "bg-[#f7931a] text-white" : "bg-[#f7931a]/20 text-[#f7931a]"}`}
                                    >
                                        USE NATIVE
                                    </button>
                                </div>
                                <span className="text-xs text-white/40">Balance: 0.0 {mockPool.token1.symbol}</span>
                            </div>
                            <div className="bg-[#1a2f2a] rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0a1612] hover:bg-[#0a1612]/80 transition-colors">
                                        <Image
                                            src={mockPool.token1.icon}
                                            alt={mockPool.token1.symbol}
                                            width={24}
                                            height={24}
                                            className="w-6 h-6 rounded-full"
                                        />
                                        <span className="font-medium text-white">{mockPool.token1.symbol}</span>
                                    </button>
                                    <div className="text-right">
                                        <input
                                            type="text"
                                            value={amount1}
                                            onChange={(e) => setAmount1(e.target.value)}
                                            placeholder="0"
                                            className="w-24 bg-transparent text-right text-xl font-medium text-white placeholder-white/30 outline-none"
                                        />
                                        <div className="text-xs text-white/40">~$0.0</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <Link
                                href="/liquidity"
                                className="py-3 px-4 rounded-xl border border-white/10 text-white text-center font-semibold hover:bg-white/5 transition-colors"
                            >
                                Change pool
                            </Link>
                            <button className="py-3 px-4 rounded-xl bg-[#f7931a] hover:bg-[#ff9f2a] text-white font-semibold transition-colors">
                                Deposit
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    )
}
