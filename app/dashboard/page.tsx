"use client"

import { useState } from "react"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Plus, HelpCircle, X } from "lucide-react"

type TooltipType = "liquidity" | "locks" | "voting" | null

const tooltipContent = {
    liquidity: {
        title: "Liquidity Pools",
        content: (
            <>
                <p className="mb-4">
                    The core functionality of Megadrome Finance is to allow users to exchange tokens in a secure way, with low fees and low slippage.
                </p>
                <p className="mb-4">
                    Slippage is the difference between the current market price of a token and the price at which the actual exchange/swap is executed. This difference could result in a smaller amount (higher price paid) or a higher amount (smaller price paid) of desired tokens returned from a swap.
                </p>
                <p className="mb-4">
                    To provide access to the best rates on the market, we identified two types of tokens:
                </p>
                <ul className="list-disc list-inside mb-4 space-y-1 text-white/70">
                    <li>correlated - for example <span className="text-[#f7931a]">stable coins</span> ($USDC, $DAI, etc.)</li>
                    <li>uncorrelated - for example $MEGA and $BTC</li>
                </ul>
                <p className="mb-4">
                    Megadrome Finance offers two different liquidity pool types based on token pair needs, <span className="text-[#f7931a] italic">Stable Pools</span> and <span className="text-[#f7931a] italic">Volatile Pools</span>. Megadrome supports custom factories, so that new pool types can always be integrated.
                </p>
                <p className="mb-4">
                    The protocol router evaluates both pool types to determine the most efficient price quotation and trade execution route available. To protect against flashloan attacks, the router will use 30-minute TWAPs (time-weighted average prices). The router doesn&apos;t require <span className="italic">upkeep</span> (external maintenance).
                </p>
                <p className="mb-6">
                    The <span className="text-[#f7931a]">deeper</span> the liquidity of a given pool (higher value locked), the smaller the slippage it will offer.
                </p>
                <h3 className="text-lg font-semibold text-white mb-3">Stable Pools</h3>
                <p className="mb-4">
                    Stable pools are designed for assets that are expected to consistently trade at near 1:1 ratios, such as stablecoins or synthetic assets.
                </p>
                <h3 className="text-lg font-semibold text-white mb-3">Volatile Pools</h3>
                <p>
                    Volatile pools are designed for assets with no correlation, using the proven x*y=k formula.
                </p>
            </>
        )
    },
    locks: {
        title: "veMEGA Locks",
        content: (
            <>
                <p className="mb-4">
                    veMEGA (vote-escrowed MEGA) represents MEGA tokens that have been locked for a specified period of time.
                </p>
                <p className="mb-4">
                    By locking your MEGA tokens, you receive veMEGA which grants you:
                </p>
                <ul className="list-disc list-inside mb-4 space-y-2 text-white/70">
                    <li><span className="text-white">Voting Power</span> - Direct MEGA emissions to your preferred pools</li>
                    <li><span className="text-white">Trading Fees</span> - Earn a share of trading fees from pools you vote for</li>
                    <li><span className="text-white">Bribes</span> - Receive incentives from protocols seeking votes</li>
                    <li><span className="text-white">Rebases</span> - Protect your voting power from dilution</li>
                </ul>
                <p className="mb-4">
                    The longer you lock, the more voting power you receive. Lock periods range from 1 week to 4 years.
                </p>
                <h3 className="text-lg font-semibold text-white mb-3">Lock Duration</h3>
                <p className="mb-4">
                    Your veMEGA balance decays linearly over time, reaching zero at the end of your lock period. You can extend your lock at any time to maintain or increase your voting power.
                </p>
                <h3 className="text-lg font-semibold text-white mb-3">Managing Locks</h3>
                <p>
                    You can create multiple locks with different expiration dates. Each lock is represented as a veNFT that can be managed independently.
                </p>
            </>
        )
    },
    voting: {
        title: "Voting Rewards",
        content: (
            <>
                <p className="mb-4">
                    Voting rewards are incentives you earn by using your veMEGA to vote for liquidity pools each epoch.
                </p>
                <p className="mb-4">
                    There are two types of voting rewards:
                </p>
                <h3 className="text-lg font-semibold text-white mb-3">Trading Fees</h3>
                <p className="mb-4">
                    When you vote for a pool, you earn a proportional share of all trading fees generated by that pool during the epoch. The more votes a pool receives, the more emissions it gets, attracting more liquidity and trading volume.
                </p>
                <h3 className="text-lg font-semibold text-white mb-3">Bribes</h3>
                <p className="mb-4">
                    Protocols and projects can deposit bribes to incentivize veMEGA holders to vote for their pools. Bribes are distributed proportionally to all voters of a specific pool.
                </p>
                <h3 className="text-lg font-semibold text-white mb-3">Claiming Rewards</h3>
                <p>
                    Rewards become available at the start of each new epoch (every Thursday at 00:00 UTC). You can claim all your accumulated rewards at any time from this dashboard.
                </p>
            </>
        )
    }
}

export default function DashboardPage() {
    const [activeTooltip, setActiveTooltip] = useState<TooltipType>(null)

    return (
        <main
            className="min-h-screen text-white flex flex-col"
            style={{
                background: "linear-gradient(135deg, #0a1612 0%, #0d2820 25%, #0d3d2e 50%, #15713a 100%)",
            }}
        >
            <Header />

            <div className="flex-1 px-4 py-8 sm:px-6 md:px-12 lg:px-20">
                <div className="max-w-[900px] mx-auto space-y-8">
                    {/* Liquidity Rewards Section */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-semibold text-white">Liquidity Rewards</h2>
                                <button
                                    onClick={() => setActiveTooltip("liquidity")}
                                    className="text-white/40 hover:text-white/60 transition-colors"
                                >
                                    <HelpCircle className="w-4 h-4" />
                                </button>
                            </div>
                            <Link
                                href="/liquidity/deposit"
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f7931a] hover:bg-[#ff9f2a] text-white text-sm font-semibold transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                New deposit
                            </Link>
                        </div>
                        <div className="bg-[#0a1612]/60 backdrop-blur-sm rounded-xl border border-white/5 p-5">
                            <p className="text-white/50 text-sm">
                                To receive emissions deposit and stake your liquidity first.
                            </p>
                        </div>
                    </section>

                    {/* Locks Section */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-lg font-semibold text-white">Locks</h2>
                            <button
                                onClick={() => setActiveTooltip("locks")}
                                className="text-white/40 hover:text-white/60 transition-colors"
                            >
                                <HelpCircle className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="bg-[#0a1612]/60 backdrop-blur-sm rounded-xl border border-white/5 p-5">
                            <p className="text-white/50 text-sm">
                                To receive incentives and fees create a lock and vote with it.
                            </p>
                        </div>
                    </section>

                    {/* Voting Rewards Section */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-lg font-semibold text-white">Voting Rewards</h2>
                            <button
                                onClick={() => setActiveTooltip("voting")}
                                className="text-white/40 hover:text-white/60 transition-colors"
                            >
                                <HelpCircle className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="bg-[#0a1612]/60 backdrop-blur-sm rounded-xl border border-white/5 p-5">
                            <p className="text-white/50 text-sm">
                                No rewards found.
                            </p>
                        </div>
                    </section>
                </div>
            </div>

            {/* Tooltip Side Panel */}
            {activeTooltip && (
                <div className="fixed inset-0 z-[100]">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setActiveTooltip(null)}
                    />

                    {/* Side Panel */}
                    <div className="absolute right-0 top-0 h-full w-full max-w-md bg-[#0a1612] border-l border-white/10 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
                        {/* Panel Header */}
                        <div className="sticky top-0 flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#0a1612]">
                            <h2 className="text-xl font-bold text-white">
                                {tooltipContent[activeTooltip].title}
                            </h2>
                            <button
                                onClick={() => setActiveTooltip(null)}
                                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5 text-white/70" />
                            </button>
                        </div>

                        {/* Panel Content */}
                        <div className="px-6 py-6 text-sm text-white/70 leading-relaxed">
                            {tooltipContent[activeTooltip].content}
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </main>
    )
}
