"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Lock } from "lucide-react"

export default function CreateLock() {
    const [amount, setAmount] = useState("")
    const [lockWeeks, setLockWeeks] = useState(208) // Default to 4 years (max)

    // Constants
    const maxLockWeeks = 208 // ~4 years
    const minLockWeeks = 1 // 7 days

    // Mock data
    const userBalance = "0.0"
    const tokenSymbol = "MEGA"

    // Calculate veMEGA
    const megaAmount = parseFloat(amount.replace(/,/g, '')) || 0
    const lockRatio = lockWeeks / maxLockWeeks
    const veMegaAmount = megaAmount * lockRatio

    // Calculate USD value (mock rate)
    const usdValue = megaAmount * 0.56

    // Format lock duration for display
    const formatLockDuration = (weeks: number) => {
        if (weeks >= 52) {
            const years = Math.floor(weeks / 52)
            return `${years} year${years !== 1 ? 's' : ''}`
        }
        return `${weeks * 7} days`
    }

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9.]/g, '')
        setAmount(value)
    }

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLockWeeks(parseInt(e.target.value))
    }

    return (
        <div className="w-full max-w-lg mx-auto space-y-4">
            {/* Card 1: Header Info */}
            <div className="bg-[#0a1612] rounded-3xl border border-white/10 p-6">
                <h1 className="text-xl font-semibold text-white mb-6">Create new lock</h1>

                {/* Info Section */}
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#0d1f1a] border border-white/10 flex items-center justify-center flex-shrink-0">
                        <Lock className="w-5 h-5 text-white/60" />
                    </div>
                    <p className="text-sm text-white/50 leading-relaxed">
                        When you lock tokens, you'll receive a veNFT (voting escrow NFT). You can increase your lock amount or extend the lock duration at any time.
                    </p>
                </div>
            </div>

            {/* Card 2: Form */}
            <div className="bg-[#0a1612] rounded-3xl border border-white/10 overflow-hidden">
                {/* Amount Section */}
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-base font-semibold text-white">Amount</span>
                        <span className="text-sm text-white/50">
                            Balance <span className="text-[#f7931a]">{userBalance} {tokenSymbol}</span>
                        </span>
                    </div>

                    {/* Amount Input Box */}
                    <div className="bg-[#0d1f1a] rounded-2xl border border-white/10 p-4">
                        <div className="flex items-center justify-between gap-4">
                            {/* Token Selector - Left */}
                            <div className="flex items-center gap-2 bg-[#1a3d32] rounded-full px-3 py-2 border border-white/10">
                                <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                                    <Image
                                        src="/assets/Logo.svg"
                                        alt={tokenSymbol}
                                        width={28}
                                        height={28}
                                        className="w-7 h-7"
                                    />
                                </div>
                                <span className="font-semibold text-white">{tokenSymbol}</span>
                            </div>

                            {/* Amount Input - Right */}
                            <div className="flex-1 text-right">
                                <input
                                    type="text"
                                    value={amount}
                                    onChange={handleAmountChange}
                                    placeholder="0"
                                    className="w-full bg-transparent text-3xl font-bold text-[#f7931a] text-right placeholder:text-white/20 focus:outline-none"
                                />
                                <span className="text-sm text-white/40 block mt-1">~${usdValue.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Slider Section */}
                <div className="px-6 pb-6">
                    <input
                        type="range"
                        min={minLockWeeks}
                        max={maxLockWeeks}
                        value={lockWeeks}
                        onChange={handleSliderChange}
                        className="w-full h-1 rounded-full cursor-pointer"
                        style={{
                            background: `linear-gradient(to right, #f7931a 0%, #f7931a ${(lockWeeks / maxLockWeeks) * 100}%, rgba(255,255,255,0.1) ${(lockWeeks / maxLockWeeks) * 100}%, rgba(255,255,255,0.1) 100%)`
                        }}
                    />
                    {/* Slider Labels */}
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
                        {/* Lock Time Box */}
                        <div className="bg-[#0d1f1a] rounded-2xl border border-white/10 p-4 text-center">
                            <div className="text-xl font-bold text-white mb-1">
                                {formatLockDuration(lockWeeks)}
                            </div>
                            <div className="text-xs text-white/40">
                                New lock time
                            </div>
                        </div>

                        {/* Voting Power Box */}
                        <div className="bg-[#0d1f1a] rounded-2xl border border-white/10 p-4 text-center">
                            <div className="text-xl font-bold text-white mb-1">
                                {veMegaAmount.toFixed(2)} ve{tokenSymbol}
                            </div>
                            <div className="text-xs text-white/40">
                                New estimated voting power
                            </div>
                        </div>
                    </div>
                </div>

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
                            disabled={!amount || parseFloat(amount) <= 0}
                            className={`flex items-center justify-center py-4 rounded-2xl font-bold text-lg transition-all duration-200 ${amount && parseFloat(amount) > 0
                                    ? 'bg-[#f7931a] hover:bg-[#ff9f2a] text-white shadow-lg shadow-[#f7931a]/25 active:scale-[0.98]'
                                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                                }`}
                        >
                            Create lock
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
