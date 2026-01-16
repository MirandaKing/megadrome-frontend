import Header from "@/components/header"
import DepositLock from "@/components/deposit-lock"
import Footer from "@/components/footer"

export default function DepositLockPage() {
    return (
        <main
            className="min-h-screen text-white flex flex-col"
            style={{
                background: "linear-gradient(135deg, #0a1612 0%, #0d2820 25%, #0d3d2e 50%, #15713a 100%)",
            }}
        >
            <Header />

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center px-4 py-8">
                <DepositLock />
            </div>

            <Footer />
        </main>
    )
}
