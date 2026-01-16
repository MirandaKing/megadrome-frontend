"use client"

import { useState } from "react"
import Link from "next/link"
import {
    HelpCircle,
    Copy,
    Check
} from "lucide-react"

interface Relay {
    id: string
    name: string
    lockId: string
    address: string
    votingPower: string
    votingPowerPercent: string
    rewards: string
    apr: string
    updatedAt: string
    isActive?: boolean
}

const sampleRelays: Relay[] = [
    {
        id: "1",
        name: "veMEGA Maxi",
        lockId: "ID 10298",
        address: "0xc981...F14f",
        votingPower: "47.18M",
        votingPowerPercent: "4.96614%",
        rewards: "MEGA",
        apr: "19.5%",
        updatedAt: "Updated 2 days ago",
        isActive: true
    },
    {
        id: "2",
        name: "Moonwell veMEGA",
        lockId: "ID 11129",
        address: "0x3470...e76d",
        votingPower: "17.97M",
        votingPowerPercent: "1.89164%",
        rewards: "MEGA",
        apr: "16.15%",
        updatedAt: "Updated 2 days ago"
    },
    {
        id: "3",
        name: "Reserve veMEGA",
        lockId: "ID 26689",
        address: "0x94bd...feD3",
        votingPower: "3,777,828.87",
        votingPowerPercent: "0.39758%",
        rewards: "MEGA",
        apr: "6.28268%",
        updatedAt: "Updated 2 days ago"
    },
    {
        id: "4",
        name: "RSR veMEGA",
        lockId: "ID 63961",
        address: "0x4AcB...411b",
        votingPower: "18,297.91",
        votingPowerPercent: "0.00192%",
        rewards: "MEGA",
        apr: "6.36196%",
        updatedAt: "Updated 2 days ago"
    },
    {
        id: "5",
        name: "BAKLAVA veMEGA",
        lockId: "ID 21952",
        address: "0xA0be...bcA0",
        votingPower: "17,039.95",
        votingPowerPercent: "0.00179%",
        rewards: "MEGA",
        apr: "12.43%",
        updatedAt: "Updated 2 days ago"
    },
    {
        id: "6",
        name: "Chia veMEGA",
        lockId: "ID 23266",
        address: "0xA97A...D59A",
        votingPower: "13,557.76",
        votingPowerPercent: "0.00142%",
        rewards: "MEGA",
        apr: "13.71%",
        updatedAt: "Updated 2 days ago"
    },
    {
        id: "7",
        name: "Universal veMEGA",
        lockId: "ID 36657",
        address: "0x4135...d8E9",
        votingPower: "11,239.61",
        votingPowerPercent: "0.00118%",
        rewards: "MEGA",
        apr: "6.36043%",
        updatedAt: "Updated 2 days ago"
    },
    {
        id: "8",
        name: "RWAX veMEGA",
        lockId: "ID 32191",
        address: "0x9212...9ef9",
        votingPower: "7,036.04",
        votingPowerPercent: "0.00074%",
        rewards: "MEGA",
        apr: "18.81%",
        updatedAt: "Updated 2 days ago"
    },
    {
        id: "9",
        name: "AYB veMEGA",
        lockId: "ID 21953",
        address: "0x8F84...A7Fd",
        votingPower: "6,834.05",
        votingPowerPercent: "0.00071%",
        rewards: "MEGA",
        apr: "21.57%",
        updatedAt: "Updated 2 days ago"
    },
    {
        id: "10",
        name: "Truflation veMEGA",
        lockId: "ID 23267",
        address: "0xb765...9597",
        votingPower: "4,486.93",
        votingPowerPercent: "0.00047%",
        rewards: "MEGA",
        apr: "22.57%",
        updatedAt: "Updated 2 days ago"
    },
    {
        id: "11",
        name: "TOWER veMEGA",
        lockId: "ID 20085",
        address: "0x464a...cB6F",
        votingPower: "1,302.27",
        votingPowerPercent: "0.00013%",
        rewards: "MEGA",
        apr: "37.18%",
        updatedAt: "Updated 2 days ago"
    },
    {
        id: "12",
        name: "DeFiScan Stage 1 & 2 Support Flywheel veMEGA",
        lockId: "ID 62488",
        address: "0x5321...952F",
        votingPower: "722.99",
        votingPowerPercent: "0.00007%",
        rewards: "MEGA",
        apr: "3.14792%",
        updatedAt: "Updated 2 days ago"
    }
]

export default function Lock() {
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

    const handleCopyAddress = (address: string) => {
        navigator.clipboard.writeText(address)
        setCopiedAddress(address)
        setTimeout(() => setCopiedAddress(null), 2000)
    }

    return (
        <div className="w-full max-w-7xl mx-auto">
            {/* Top Banner */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 rounded-2xl bg-[#0d1f1a]/80 backdrop-blur-xl p-6 lg:p-8 border border-white/10">
                <p className="text-white/80 text-sm md:text-base">
                    Gain <span className="font-semibold text-white">greater voting power</span> and <span className="font-semibold text-white">higher rewards</span>, by locking more tokens for longer.
                </p>
                <Link
                    href="/lock/create"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-full bg-[#f7931a]/10 text-[#f7931a] hover:bg-[#f7931a]/20 transition-colors border border-transparent"
                >
                    Create Lock
                </Link>
            </div>

            {/* Locks Section */}
            <div className="space-y-6">
                <div className="mt-12">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold text-white">Locks</h2>
                        <button type="button" className="group">
                            <HelpCircle className="w-[18px] h-[18px] text-white/40 hover:text-white/50 transition-colors" />
                        </button>
                    </div>
                </div>

                {/* Empty Locks State */}
                <div className="flex flex-col gap-1.5">
                    <div className="rounded-xl bg-[#0d1f1a]/80 backdrop-blur-xl p-6 border border-white/10">
                        <div className="text-sm text-white/50">
                            To receive incentives and fees create a lock and vote with it.
                        </div>
                    </div>
                </div>
            </div>

            {/* Relays Section */}
            <div className="mt-12 space-y-6">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-white">Relays</h2>
                    <button type="button" className="group">
                        <HelpCircle className="w-[18px] h-[18px] text-white/40 hover:text-white/50 transition-colors" />
                    </button>
                </div>

                {/* Relay Cards */}
                <div className="flex flex-col gap-1.5">
                    {sampleRelays.map((relay) => (
                        <div key={relay.id}>
                            <div className="flex flex-col justify-between gap-4 rounded-xl bg-[#0d1f1a]/80 backdrop-blur-xl p-5 border border-white/10 hover:border-white/15 transition-colors">
                                {/* Top Row */}
                                <div className="flex grow flex-col justify-between gap-8 sm:flex-row sm:gap-4">
                                    {/* Left: Icon and Info */}
                                    <div className="flex items-center gap-4">
                                        {/* Icon Container */}
                                        <div className="relative flex w-11 h-11 items-center justify-center rounded-xl bg-white/5">
                                            {relay.isActive && (
                                                <div className="absolute -bottom-0.5 -right-0.5 flex">
                                                    <div className="inline-flex">
                                                        <div className="inline-flex w-2.5 h-2.5 rounded-full bg-green-500">
                                                            <div className="w-full h-full animate-ping rounded-full bg-inherit hover:animate-none" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="20"
                                                height="20"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="text-white/60"
                                            >
                                                <rect width="12" height="20" x="6" y="2" rx="2" />
                                                <rect width="20" height="12" x="2" y="6" rx="2" />
                                            </svg>
                                        </div>

                                        {/* Name and Details */}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5 text-sm">
                                                <div className="font-semibold text-white">{relay.name}</div>
                                                <div className="inline-flex">
                                                    <span className="inline-flex items-center justify-center rounded-full bg-white/5 text-white/50 px-1.5 py-px text-[10px] font-semibold uppercase">
                                                        {relay.lockId}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-white/50">
                                                <span>{relay.updatedAt}</span>
                                                <span className="hidden sm:inline-block opacity-30">·</span>
                                                <div className="hidden sm:flex items-center gap-2 text-[11px]">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        {relay.address}
                                                    </div>
                                                    <div className="inline-flex">
                                                        <button
                                                            onClick={() => handleCopyAddress(relay.address)}
                                                            className="-m-1 inline-flex items-center gap-1 rounded p-1 text-[10px] text-white/50 transition hover:bg-white/5 hover:text-white"
                                                            tabIndex={-1}
                                                        >
                                                            {copiedAddress === relay.address ? (
                                                                <Check className="w-2.5 h-2.5" />
                                                            ) : (
                                                                <Copy className="w-2.5 h-2.5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Deposit Button */}
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href="/lock/deposit"
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-full bg-[#f7931a]/10 text-[#f7931a] hover:bg-[#f7931a]/20 transition-colors border border-transparent"
                                        >
                                            Deposit Lock
                                        </Link>
                                    </div>
                                </div>

                                {/* Bottom Stats Row */}
                                <div className="flex flex-col gap-0 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8 md:gap-4 xl:mt-0">
                                    {/* Voting Power */}
                                    <div className="flex items-center justify-between gap-3 pb-3 text-xs sm:pb-0">
                                        <div className="text-white/50 lg:text-right">Voting Power</div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-white lg:text-right">{relay.votingPower}</div>
                                            <div className="text-white/70">
                                                <span className="mr-2">~</span> {relay.votingPowerPercent}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rewards & APR */}
                                    <div className="flex flex-col border-t border-white/10 sm:flex-row sm:gap-8 sm:border-t-0">
                                        {/* Rewards */}
                                        <div className="flex items-center justify-between gap-3 py-3 text-xs sm:py-0 sm:pl-5">
                                            <div className="text-white/50">Rewards</div>
                                            <div className="text-white">{relay.rewards}</div>
                                        </div>

                                        {/* APR */}
                                        <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs sm:border-t-0 sm:pt-0">
                                            <div className="text-white/50">APR</div>
                                            <div className="text-green-400 font-semibold lg:text-right">{relay.apr}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
