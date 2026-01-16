"use client"

import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Construction, ArrowLeft } from "lucide-react"

export default function IncentivizePage() {
    return (
        <main
            className="min-h-screen text-white flex flex-col"
            style={{
                background: "linear-gradient(135deg, #0a1612 0%, #0d2820 25%, #0d3d2e 50%, #15713a 100%)",
            }}
        >
            <Header />

            <div className="flex-1 flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 rounded-full bg-[#f7931a]/10 flex items-center justify-center mx-auto mb-6">
                        <Construction className="w-10 h-10 text-[#f7931a]" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3">Incentivize</h1>
                    <p className="text-white/60 mb-8">
                        This page is currently under development. Check back soon for updates!
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#f7931a] hover:bg-[#ff9f2a] text-white font-semibold transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Home
                        </Link>
                        <Link
                            href="/swap"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-colors"
                        >
                            Go to Swap
                        </Link>
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    )
}
