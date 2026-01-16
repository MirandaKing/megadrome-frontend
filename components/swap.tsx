"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronDown, ArrowDown, Info, AlertTriangle } from "lucide-react"
import TokenSelectModal, { Token } from "./token-select-modal"

// Default tokens for initial state
const defaultFromToken: Token = {
    id: "mon-native",
    address: null,
    chain: "MONAD",
    decimals: 18,
    name: "Monad",
    symbol: "MON",
    logoUrl: "https://assets.coingecko.com/coins/images/38927/large/monad.jpg?1719547722",
    safetyLevel: "VERIFIED",
    standard: "NATIVE"
}

const defaultToToken: Token = {
    id: "usdc-monad",
    address: "0x754704bc059f8c67012fed69bc8a327a5aafb603",
    chain: "MONAD",
    decimals: 6,
    name: "USD Coin",
    symbol: "USDC",
    logoUrl: "https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694",
    safetyLevel: "VERIFIED",
    standard: "ERC20"
}

// Mock prices (in a real app, fetch from price API)
const tokenPrices: Record<string, number> = {
    MON: 0.56,
    WMON: 0.56,
    USDC: 1.00,
    AUSD: 1.00
}

export default function Swap() {
    const [fromAmount, setFromAmount] = useState("")
    const [toAmount, setToAmount] = useState("")
    const [fromToken, setFromToken] = useState<Token>(defaultFromToken)
    const [toToken, setToToken] = useState<Token>(defaultToToken)
    const [slippage, setSlippage] = useState("1")
    const [showFromModal, setShowFromModal] = useState(false)
    const [showToModal, setShowToModal] = useState(false)
    const [showSlippage, setShowSlippage] = useState(false)
    const [fromBalance] = useState("0.0")
    const [toBalance] = useState("0.0")

    const fromPrice = tokenPrices[fromToken.symbol] || 1
    const toPrice = tokenPrices[toToken.symbol] || 1
    const exchangeRate = fromPrice / toPrice

    const handleSwapTokens = () => {
        const tempToken = fromToken
        const tempAmount = fromAmount
        setFromToken(toToken)
        setToToken(tempToken)
        setFromAmount(toAmount)
        setToAmount(tempAmount)
    }

    const handleFromAmountChange = (value: string) => {
        setFromAmount(value)
        if (value && !isNaN(parseFloat(value))) {
            setToAmount((parseFloat(value) * exchangeRate).toFixed(8))
        } else {
            setToAmount("")
        }
    }

    const handleSelectFromToken = (token: Token) => {
        setFromToken(token)
        setShowFromModal(false)
        if (fromAmount) {
            const newFromPrice = tokenPrices[token.symbol] || 1
            const newRate = newFromPrice / toPrice
            setToAmount((parseFloat(fromAmount) * newRate).toFixed(8))
        }
    }

    const handleSelectToToken = (token: Token) => {
        setToToken(token)
        setShowToModal(false)
        if (fromAmount) {
            const newToPrice = tokenPrices[token.symbol] || 1
            const newRate = fromPrice / newToPrice
            setToAmount((parseFloat(fromAmount) * newRate).toFixed(8))
        }
    }

    const fromUsdValue = fromAmount ? (parseFloat(fromAmount) * fromPrice).toFixed(2) : "0.00"
    const toUsdValue = toAmount ? (parseFloat(toAmount) * toPrice).toFixed(2) : "0.00"
    const minReceived = toAmount ? (parseFloat(toAmount) * (1 - parseFloat(slippage) / 100)).toFixed(2) : "0.00"
    const priceImpact = fromAmount ? "0.12676" : "0.00"
    const feePercent = "0.3216"

    return (
        <>
            <div className="w-full max-w-lg mx-auto">
                {/* Main Swap Card */}
                <div className="bg-[#0a1612] rounded-3xl border border-white/10 overflow-hidden">
                    {/* Sell Section */}
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-base font-semibold text-white">Sell</span>
                            <span className="text-sm text-white/50">
                                Balance <span className="text-[#f7931a]">{fromBalance} {fromToken.symbol}</span>
                            </span>
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
                                                const target = e.target as HTMLImageElement
                                                target.src = "/assets/Logo.svg"
                                            }}
                                        />
                                    </div>
                                    <span className="font-semibold text-white">{fromToken.symbol}</span>
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
                                    <span className="text-sm text-white/40 block mt-1">~${fromUsdValue}</span>
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
                            <span className="text-sm text-white/50">
                                Balance <span className="text-[#f7931a]">{toBalance} {toToken.symbol}</span>
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
                                                const target = e.target as HTMLImageElement
                                                target.src = "/assets/Logo.svg"
                                            }}
                                        />
                                    </div>
                                    <span className="font-semibold text-white">{toToken.symbol}</span>
                                    <ChevronDown className="w-4 h-4 text-white/60" />
                                </button>

                                {/* Amount Output - Right */}
                                <div className="flex-1 text-right">
                                    <div className="text-3xl font-bold text-white truncate">
                                        {toAmount || "0"}
                                    </div>
                                    <span className="text-sm text-white/40 block mt-1">~${toUsdValue}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Swap Details */}
                    {fromAmount && parseFloat(fromAmount) > 0 && (
                        <div className="px-6 pb-6 space-y-0 border-t border-white/5 pt-4">
                            {/* Fees */}
                            <div className="flex items-center justify-between py-3 border-b border-white/5">
                                <span className="text-sm text-white/60">Fees</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-[#f7931a]/20 flex items-center justify-center">
                                        <Image src="/assets/Logo.svg" alt="MEGA" width={14} height={14} className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-sm font-medium text-white">{feePercent}%</span>
                                    <span className="text-white/30">»</span>
                                    <div className="w-5 h-5 rounded-full bg-[#f7931a]/20 flex items-center justify-center">
                                        <Image src="/assets/Logo.svg" alt="MEGA" width={14} height={14} className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                            </div>

                            {/* Exchange Rate */}
                            <div className="flex items-center justify-between py-3 border-b border-white/5">
                                <span className="text-sm text-white/60">Exchange rate</span>
                                <span className="text-sm font-medium text-white">
                                    1 {fromToken.symbol} = {exchangeRate.toFixed(4)} {toToken.symbol}
                                </span>
                            </div>

                            {/* Price Impact */}
                            <div className="flex items-center justify-between py-3 border-b border-white/5">
                                <span className="text-sm text-white/60">Price impact</span>
                                <span className="text-sm font-medium text-white">{priceImpact}%</span>
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
                                                {["0.5", "1", "2", "3"].map((val) => (
                                                    <button
                                                        key={val}
                                                        onClick={() => {
                                                            setSlippage(val)
                                                            setShowSlippage(false)
                                                        }}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${slippage === val
                                                                ? 'bg-[#f7931a] text-white'
                                                                : 'bg-white/5 text-white/60 hover:bg-white/10'
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
                    {fromAmount && parseFloat(fromAmount) > parseFloat(fromBalance.replace(/,/g, '')) && parseFloat(fromBalance) > 0 && (
                        <div className="mx-6 mb-6 bg-[#f7931a]/10 rounded-xl p-4 flex items-center gap-3 border border-[#f7931a]/20">
                            <AlertTriangle className="w-5 h-5 text-[#f7931a] flex-shrink-0" />
                            <span className="text-sm text-[#f7931a] font-medium">
                                Warning: Not enough {fromToken.symbol} amount
                            </span>
                        </div>
                    )}

                    {/* Swap Button */}
                    <div className="px-6 pb-6">
                        <button
                            disabled={!fromAmount || parseFloat(fromAmount) <= 0}
                            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-200 ${fromAmount && parseFloat(fromAmount) > 0
                                    ? 'bg-[#f7931a] hover:bg-[#ff9f2a] text-white shadow-lg shadow-[#f7931a]/25 active:scale-[0.98]'
                                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                                }`}
                        >
                            {!fromAmount || parseFloat(fromAmount) <= 0 ? 'Enter an amount' : 'Swap'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Token Selection Modals */}
            <TokenSelectModal
                isOpen={showFromModal}
                onClose={() => setShowFromModal(false)}
                onSelect={handleSelectFromToken}
                selectedToken={fromToken}
                excludeToken={toToken}
            />
            <TokenSelectModal
                isOpen={showToModal}
                onClose={() => setShowToModal(false)}
                onSelect={handleSelectToToken}
                selectedToken={toToken}
                excludeToken={fromToken}
            />
        </>
    )
}
