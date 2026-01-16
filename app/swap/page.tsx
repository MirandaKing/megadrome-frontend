import Header from "@/components/header"
import Swap from "@/components/swap"
import Footer from "@/components/footer"

export default function SwapPage() {
    return (
        <main
            className="min-h-screen text-white flex flex-col"
            style={{
                background: "linear-gradient(135deg, #0a1612 0%, #0d2820 25%, #0d3d2e 50%, #15713a 100%)",
            }}
        >
            <Header />

            {/* Hero Section */}
            <div className="pt-8 pb-4 px-4 text-center">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Swap</h1>
                <p className="text-white/60 text-sm md:text-base max-w-md mx-auto">
                    Trade tokens instantly with minimal slippage
                </p>
            </div>

            <div className="flex-1 flex items-start justify-center px-4 py-8">
                <Swap />
            </div>

            <Footer />
        </main>
    )
}
