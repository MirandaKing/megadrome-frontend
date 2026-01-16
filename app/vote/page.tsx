import Header from "@/components/header"
import Vote from "@/components/vote"
import Footer from "@/components/footer"

export default function VotePage() {
    return (
        <main
            className="min-h-screen text-white flex flex-col"
            style={{
                background: "linear-gradient(135deg, #0a1612 0%, #0d2820 25%, #0d3d2e 50%, #15713a 100%)",
            }}
        >
            <Header />

            {/* Main Content */}
            <div className="flex-1 px-4 py-8 md:py-16">
                <div className="w-full max-w-7xl mx-auto">
                    {/* Hero Section */}
                    <div className="text-center mb-8 md:mb-12">
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
                            Vote
                        </h1>
                        <p className="text-white/60 text-sm md:text-base max-w-md mx-auto">
                            Direct MEGA emissions to liquidity pools by voting with your veMEGA
                        </p>
                    </div>

                    {/* Vote Component */}
                    <Vote />
                </div>
            </div>

            <Footer />
        </main>
    )
}
