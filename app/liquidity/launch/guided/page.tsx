"use client"

import { useState, useEffect } from "react"
import Header from "@/components/header"
import Footer from "@/components/footer"
import Link from "next/link"
import Image from "next/image"
import { ChevronRight, HelpCircle, X, Check, Loader2 } from "lucide-react"

interface Token {
    id: string
    address: string | null
    chain: string
    decimals: number
    name: string
    symbol: string
    logoUrl?: string
    safetyLevel?: string
}

// Default pairing tokens for Monad
const PAIRING_TOKENS: Token[] = [
    {
        id: "usdc-monad",
        address: "0x754704bc059f8c67012fed69bc8a327a5aafb603",
        chain: "MONAD",
        decimals: 6,
        name: "USD Coin",
        symbol: "USDC",
        logoUrl: "https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694",
        safetyLevel: "VERIFIED"
    },
    {
        id: "wmon-monad",
        address: "0x3bd359c1119da7da1d913d1c4d2b7c461115433a",
        chain: "MONAD",
        decimals: 18,
        name: "Wrapped Monad",
        symbol: "WMON",
        logoUrl: "https://assets.coingecko.com/coins/images/38927/large/monad.jpg?1719547722",
        safetyLevel: "VERIFIED"
    },
    {
        id: "mega-monad",
        address: "0x00000000efe302beaa2b3e6e1b18d08d69a9012a",
        chain: "MONAD",
        decimals: 18,
        name: "Megadrome",
        symbol: "MEGA",
        logoUrl: "/assets/Logo.svg",
        safetyLevel: "VERIFIED"
    }
]

const POOL_TYPES = [
    {
        id: "concentrated-single",
        name: "Concentrated: Single-Sided",
        description: "Provide liquidity using only one token"
    },
    {
        id: "concentrated-dual",
        name: "Concentrated: Dual-Sided",
        description: "Provide both tokens in the pair"
    },
    {
        id: "basic-volatile",
        name: "Basic Volatile",
        description: "Ideal for most token launches"
    }
]

export default function GuidedLaunchPage() {
    const [searchAddress, setSearchAddress] = useState("")
    const [searchedToken, setSearchedToken] = useState<Token | null>(null)
    const [isSearching, setIsSearching] = useState(false)
    const [searchError, setSearchError] = useState("")
    const [selectedPairing, setSelectedPairing] = useState<Token | null>(PAIRING_TOKENS[2]) // Default to MEGA
    const [selectedPoolType, setSelectedPoolType] = useState("concentrated-dual")

    // Search token by address using GraphQL
    const searchTokenByAddress = async (address: string) => {
        if (!address || address.length < 10) {
            setSearchedToken(null)
            setSearchError("")
            return
        }

        // Basic address validation
        if (!address.startsWith("0x") || address.length !== 42) {
            setSearchError("Invalid address format")
            setSearchedToken(null)
            return
        }

        setIsSearching(true)
        setSearchError("")

        try {
            const response = await fetch("/api/tokens", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address })
            })

            const data = await response.json()

            if (data?.data?.tokenProjects?.[0]?.tokens?.[0]) {
                const tokenData = data.data.tokenProjects[0]
                const token = tokenData.tokens[0]
                setSearchedToken({
                    id: token.id,
                    address: token.address,
                    chain: token.chain,
                    decimals: token.decimals,
                    name: token.name,
                    symbol: token.symbol,
                    logoUrl: tokenData.logoUrl || "/assets/Logo.svg",
                    safetyLevel: tokenData.safetyLevel
                })
                setSearchError("")
            } else {
                setSearchError("Token not found")
                setSearchedToken(null)
            }
        } catch (error) {
            console.error("Error searching token:", error)
            setSearchError("Failed to search token")
            setSearchedToken(null)
        } finally {
            setIsSearching(false)
        }
    }

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchAddress) {
                searchTokenByAddress(searchAddress)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [searchAddress])

    const clearSearch = () => {
        setSearchAddress("")
        setSearchedToken(null)
        setSearchError("")
    }

    const shortenAddress = (addr: string | null) => {
        if (!addr) return ""
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`
    }

    const canCreatePool = searchedToken && selectedPairing && selectedPoolType

    return (
        <main
            className="min-h-screen text-white flex flex-col"
            style={{
                background: "linear-gradient(135deg, #0a1612 0%, #0d2820 25%, #0d3d2e 50%, #15713a 100%)",
            }}
        >
            <Header />

            <div className="flex-1 px-4 py-8 md:py-12">
                <div className="w-full max-w-xl mx-auto space-y-4">
                    {/* Breadcrumb */}
                    <div className="bg-[#0a1612] rounded-2xl border border-white/10 p-5">
                        <div className="flex items-center gap-3 text-lg font-semibold">
                            <Link href="/liquidity/launch" className="hover:text-[#f7931a] transition-colors">
                                Launch pool
                            </Link>
                            <ChevronRight className="w-4 h-4 text-white/30" />
                            <span className="text-white/50">Guided</span>
                            <button className="text-white/50 hover:text-[#f7931a] transition-colors">
                                <HelpCircle className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Main Form */}
                    <div className="bg-gradient-to-b from-[#0a1612] to-transparent rounded-2xl border border-white/10 p-5 sm:p-8 space-y-8">

                        {/* Token Search Section */}
                        <div className="space-y-3">
                            <div className="text-sm font-semibold">Token search</div>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchAddress}
                                    onChange={(e) => setSearchAddress(e.target.value)}
                                    placeholder="Enter token contract address (0x...)"
                                    className="w-full bg-[#0d1f1a] border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/40 focus:outline-none focus:border-[#f7931a]/50 transition-colors pr-10"
                                />
                                {searchAddress && (
                                    <button
                                        onClick={clearSearch}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                    >
                                        <X className="w-3 h-3 text-white/60" />
                                    </button>
                                )}
                            </div>

                            {/* Search Status */}
                            {isSearching && (
                                <div className="flex items-center gap-2 text-sm text-white/50">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Searching...
                                </div>
                            )}

                            {searchError && (
                                <div className="text-sm text-red-400">{searchError}</div>
                            )}

                            {/* Found Token */}
                            {searchedToken && (
                                <button className="w-full flex items-center gap-4 rounded-xl border border-[#f7931a] bg-[#0a1612] p-4">
                                    <div className="flex items-center pl-1">
                                        <div className="flex items-center justify-center rounded-full border-2 border-[#f7931a] bg-[#f7931a] p-0.5">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 border-l border-white/10 pl-4">
                                        <Image
                                            src={searchedToken.logoUrl || "/assets/Logo.svg"}
                                            alt={searchedToken.symbol}
                                            width={40}
                                            height={40}
                                            className="rounded-full"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement
                                                target.src = "/assets/Logo.svg"
                                            }}
                                        />
                                        <div className="flex flex-col gap-1 text-left">
                                            <span className="text-sm font-semibold">{searchedToken.symbol}</span>
                                            <span className="text-xs text-white/50">{shortenAddress(searchedToken.address)}</span>
                                        </div>
                                    </div>
                                </button>
                            )}
                        </div>

                        {searchedToken && (
                            <>
                                {/* Liquidity Pairing Section */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold">Liquidity pairing</h3>
                                    <div className="space-y-2">
                                        {PAIRING_TOKENS.map((token) => (
                                            <button
                                                key={token.id}
                                                onClick={() => setSelectedPairing(token)}
                                                className={`w-full flex items-center rounded-xl border p-4 transition-all ${selectedPairing?.id === token.id
                                                    ? "border-[#f7931a] bg-[#0a1612]"
                                                    : "border-transparent bg-[#0a1612] hover:border-white/20"
                                                    }`}
                                            >
                                                <div className="mr-4 flex items-center border-r border-white/10 pl-1 pr-4">
                                                    <div
                                                        className={`flex items-center justify-center rounded-full border-2 p-0.5 ${selectedPairing?.id === token.id
                                                            ? "border-[#f7931a] bg-[#f7931a]"
                                                            : "border-white/30"
                                                            }`}
                                                    >
                                                        <Check
                                                            className={`w-3 h-3 ${selectedPairing?.id === token.id ? "text-white" : "invisible"
                                                                }`}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <Image
                                                        src={token.logoUrl || "/assets/Logo.svg"}
                                                        alt={token.symbol}
                                                        width={40}
                                                        height={40}
                                                        className="rounded-full"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement
                                                            target.src = "/assets/Logo.svg"
                                                        }}
                                                    />
                                                    <div className="flex flex-col gap-1 text-left">
                                                        <span className="text-sm font-semibold">{token.symbol}</span>
                                                        <span className="text-xs text-white/50">Balance  0.0</span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Pool Type Section */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold">Pool type</h3>
                                    <div className="space-y-2">
                                        {POOL_TYPES.map((type) => (
                                            <button
                                                key={type.id}
                                                onClick={() => setSelectedPoolType(type.id)}
                                                className={`w-full flex items-center rounded-xl border p-4 transition-all ${selectedPoolType === type.id
                                                    ? "border-[#f7931a] bg-[#0a1612]"
                                                    : "border-transparent bg-[#0a1612] hover:border-white/20"
                                                    }`}
                                            >
                                                <div className="mr-4 flex items-center pl-1">
                                                    <div
                                                        className={`flex items-center justify-center rounded-full border-2 p-0.5 ${selectedPoolType === type.id
                                                            ? "border-[#f7931a] bg-[#f7931a]"
                                                            : "border-white/30"
                                                            }`}
                                                    >
                                                        <Check
                                                            className={`w-3 h-3 ${selectedPoolType === type.id ? "text-white" : "invisible"
                                                                }`}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex grow items-center justify-between">
                                                    <span className="text-sm font-semibold">{type.name}</span>
                                                    <span className="text-xs text-white/50">{type.description}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-4">
                                    <Link
                                        href="/liquidity/launch"
                                        className="flex-1 py-3.5 rounded-full bg-[#f7931a]/10 text-[#f7931a] text-sm font-semibold text-center hover:bg-[#f7931a]/20 transition-colors"
                                    >
                                        Cancel
                                    </Link>
                                    <button
                                        disabled={!canCreatePool}
                                        className={`flex-1 py-3.5 rounded-full text-sm font-semibold text-center transition-all ${canCreatePool
                                            ? "bg-[#f7931a] text-white hover:bg-[#ff9f2a] shadow-lg shadow-[#f7931a]/25"
                                            : "bg-white/10 text-white/40 cursor-not-allowed"
                                            }`}
                                    >
                                        Create pool
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    )
}
