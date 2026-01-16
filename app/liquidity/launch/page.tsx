"use client"

import Header from "@/components/header"
import Footer from "@/components/footer"
import Link from "next/link"
import Image from "next/image"
import { HelpCircle } from "lucide-react"

export default function LaunchPoolPage() {
    return (
        <main
            className="min-h-screen text-white flex flex-col"
            style={{
                background: "linear-gradient(135deg, #0a1612 0%, #0d2820 25%, #0d3d2e 50%, #15713a 100%)",
            }}
        >
            <Header />

            <div className="flex-1 flex items-center justify-center px-4 py-8 md:py-16">
                <div className="w-full max-w-xl mx-auto">
                    {/* Page Title */}
                    <div className="flex items-center gap-2 mb-6">
                        <h1 className="text-2xl font-semibold">Launch pool</h1>
                        <button className="text-white/50 hover:text-[#f7931a] transition-colors">
                            <HelpCircle className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Main Card */}
                    <div className="bg-[#0a1612] rounded-3xl border border-white/10 overflow-hidden">
                        {/* Description Section */}
                        <div className="p-6 border-b border-white/5">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#f7931a]/20 flex items-center justify-center flex-shrink-0">
                                    <Image src="/assets/Logo.svg" alt="Logo" width={20} height={20} className="w-5 h-5" />
                                </div>
                                <p className="text-sm text-white/60 leading-relaxed">
                                    Anyone can quickly and easily create a liquidity pool. For a basic quick-start pool choose the "Guided" option. Use "Advanced" for a manual process that unlocks the full feature set.
                                </p>
                            </div>
                        </div>

                        {/* Options Grid */}
                        <div className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Guided Option */}
                                <div className="bg-[#0d1f1a] rounded-2xl border border-white/10 p-5 flex flex-col">
                                    <div className="flex items-center gap-2 mb-3">
                                        <h3 className="text-lg font-semibold text-white">Guided</h3>
                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#f7931a] text-white rounded">
                                            Easy
                                        </span>
                                    </div>
                                    <p className="text-sm text-white/50 mb-6 flex-1">
                                        For users who want a simplified process and a curated list of options.
                                    </p>
                                    <Link
                                        href="/liquidity/launch/guided"
                                        className="w-full py-3 rounded-2xl bg-[#f7931a] hover:bg-[#ff9f2a] text-white text-sm font-bold text-center transition-all duration-200 shadow-lg shadow-[#f7931a]/25"
                                    >
                                        Start
                                    </Link>
                                </div>

                                {/* Advanced Option */}
                                <div className="bg-[#0d1f1a] rounded-2xl border border-white/10 p-5 flex flex-col">
                                    <div className="flex items-center gap-2 mb-3">
                                        <h3 className="text-lg font-semibold text-white">Advanced</h3>
                                    </div>
                                    <p className="text-sm text-white/50 mb-6 flex-1">
                                        For users who want more choices and greater control over their pool strategy.
                                    </p>
                                    <Link
                                        href="/liquidity/launch/advanced"
                                        className="w-full py-3 rounded-2xl bg-[#f7931a] hover:bg-[#ff9f2a] text-white text-sm font-bold text-center transition-all duration-200 shadow-lg shadow-[#f7931a]/25"
                                    >
                                        Start
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-white/40">
                            Need help? Check out our{" "}
                            <a href="#" className="text-[#f7931a] hover:underline">
                                documentation
                            </a>{" "}
                            for pool creation guides.
                        </p>
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    )
}
