"use client"

import { useState } from "react"
import Link from "next/link"
import { Ratio, Copy, Check, ChevronDown } from "lucide-react"

// Mock relay data
const relayData = {
    name: "veMEGA Maxi",
    id: "10298",
    updatedDaysAgo: 2,
    address: "0xc981...F14f",
    fullAddress: "0xc981234567890abcdef1234567890abcdefF14f"
}

// Mock locks data
const userLocks = [
    { id: "1", amount: "1,000", veMega: "250", unlockDate: "2027-01-15" },
    { id: "2", amount: "5,000", veMega: "1,250", unlockDate: "2028-06-20" },
]

export default function DepositLock() {
    const [selectedLock, setSelectedLock] = useState("")
    const [understood, setUnderstood] = useState(false)
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(relayData.fullAddress)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const canDeposit = selectedLock !== "" && understood

    return (
        <div className="w-full max-w-lg mx-auto space-y-4">
            {/* Card 1: Relay Info */}
            <div className="bg-[#0a1612] rounded-2xl border border-white/10 p-6">
                <h2 className="flex items-center gap-2 border-b border-white/10 pb-5 text-lg font-semibold text-white">
                    Relay deposit
                </h2>

                <div className="flex items-center justify-between pt-5">
                    {/* Relay Info */}
                    <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className="relative flex w-11 h-11 items-center justify-center rounded-xl bg-[#0d1f1a] border border-white/10">
                            {/* Green status dot */}
                            <div className="absolute -bottom-0.5 -right-0.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500">
                                    <div className="w-full h-full animate-ping rounded-full bg-green-500" />
                                </div>
                            </div>
                            <Ratio className="w-5 h-5 text-white/60" />
                        </div>

                        {/* Details */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-sm">
                                <span className="font-semibold text-white">{relayData.name}</span>
                                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-white/10 text-white/50 rounded-full uppercase">
                                    ID {relayData.id}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-white/50">
                                <span>Updated {relayData.updatedDaysAgo} days ago</span>
                                <span className="opacity-30">·</span>
                                <div className="flex items-center gap-1.5">
                                    <span>{relayData.address}</span>
                                    <button
                                        onClick={handleCopy}
                                        className="p-1 rounded hover:bg-white/5 transition-colors"
                                    >
                                        {copied ? (
                                            <Check className="w-2.5 h-2.5 text-green-400" />
                                        ) : (
                                            <Copy className="w-2.5 h-2.5 text-white/50" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Change Button */}
                    <Link
                        href="/lock"
                        className="px-4 py-2.5 text-xs font-semibold bg-[#f7931a]/10 text-[#f7931a] rounded-full hover:bg-[#f7931a]/20 transition-colors"
                    >
                        Change
                    </Link>
                </div>
            </div>

            {/* Card 2: Lock Selection */}
            <div className="bg-gradient-to-b from-[#0a1612] to-transparent rounded-2xl border border-white/10 p-6 space-y-6">
                {/* Label and Link */}
                <div className="flex items-center justify-between px-2 text-sm">
                    <label className="font-semibold text-white">
                        Select the <span className="text-[#f7931a]">Lock</span> you want to deposit
                    </label>
                    <Link
                        href="/lock/create"
                        className="text-[#f7931a] hover:underline text-sm"
                    >
                        Create new lock
                    </Link>
                </div>

                {/* Lock Selector */}
                <div className="relative">
                    <select
                        value={selectedLock}
                        onChange={(e) => setSelectedLock(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-white/20 bg-transparent px-4 py-3 text-sm text-white transition hover:border-white/40 focus:border-[#f7931a] focus:outline-none cursor-pointer"
                    >
                        <option value="" className="bg-[#0a1612] text-white/50">Your locks...</option>
                        {userLocks.map((lock) => (
                            <option key={lock.id} value={lock.id} className="bg-[#0a1612] text-white">
                                Lock #{lock.id} - {lock.amount} MEGA ({lock.veMega} veMEGA)
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                </div>

                {/* Disclaimer Checkbox */}
                <div className="flex flex-col gap-5 rounded-xl p-4 text-xs outline outline-1 outline-white/10 bg-[#0d1f1a]">
                    <div className="flex items-start gap-3">
                        <button
                            onClick={() => setUnderstood(!understood)}
                            className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${understood
                                    ? "bg-[#f7931a] border-[#f7931a]"
                                    : "border-white/30 hover:border-white/50"
                                }`}
                        >
                            {understood && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <span className="text-white/70 text-sm leading-relaxed">
                            I understand that by depositing my Lock into a Relay strategy, the Lock unlock date will be extended to 4 years.
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/lock"
                        className="flex-1 text-center px-6 py-3.5 text-sm font-semibold bg-[#f7931a]/10 text-[#f7931a] rounded-full hover:bg-[#f7931a]/20 transition-colors"
                    >
                        Back
                    </Link>
                    <button
                        disabled={!canDeposit}
                        className={`flex-1 px-6 py-3.5 text-sm font-semibold rounded-full transition-colors ${canDeposit
                                ? "bg-[#f7931a] hover:bg-[#ff9f2a] text-white"
                                : "bg-[#f7931a]/50 text-white/50 cursor-not-allowed"
                            }`}
                    >
                        Deposit lock
                    </button>
                </div>
            </div>
        </div>
    )
}
