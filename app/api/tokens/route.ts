import { NextRequest, NextResponse } from 'next/server'

const GRAPHQL_ENDPOINT = "https://interface.gateway.uniswap.org/v1/graphql"

// Query for fetching specific token projects
const TOKEN_PROJECTS_QUERY = `
query TokenProjects($contracts: [ContractInput!]!) {
  tokenProjects(contracts: $contracts) {
    id
    logoUrl
    safetyLevel
    tokens {
      id
      address
      chain
      decimals
      name
      standard
      symbol
      __typename
    }
    __typename
  }
}
`

// Query for searching tokens
const SEARCH_TOKENS_QUERY = `
query SearchTokens($searchQuery: String!, $chains: [Chain!]) {
  searchTokens(searchQuery: $searchQuery, chains: $chains) {
    id
    address
    chain
    decimals
    name
    symbol
    project {
      id
      logoUrl
      safetyLevel
      __typename
    }
    __typename
  }
}
`

// Default token contracts for Monad
const DEFAULT_CONTRACTS = [
    { chain: "MONAD" },
    { chain: "MONAD", address: "0x3bd359c1119da7da1d913d1c4d2b7c461115433a" },
    { chain: "MONAD", address: "0x754704bc059f8c67012fed69bc8a327a5aafb603" },
    { chain: "MONAD", address: "0x00000000efe302beaa2b3e6e1b18d08d69a9012a" }
]

async function fetchFromUniswap(query: string, variables: any) {
    const response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Origin": "https://app.uniswap.org",
            "Referer": "https://app.uniswap.org/",
        },
        body: JSON.stringify({
            query,
            variables
        })
    })
    return response.json()
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')

    try {
        if (search && search.length >= 2) {
            // Search for tokens
            console.log("Searching for tokens:", search)
            const data = await fetchFromUniswap(SEARCH_TOKENS_QUERY, {
                searchQuery: search,
                chains: ["MONAD"]
            })
            console.log("Search results:", JSON.stringify(data, null, 2))
            return NextResponse.json(data)
        } else {
            // Return default tokens
            console.log("Fetching default tokens...")
            const data = await fetchFromUniswap(TOKEN_PROJECTS_QUERY, {
                contracts: DEFAULT_CONTRACTS
            })
            console.log("Default tokens:", JSON.stringify(data, null, 2))
            return NextResponse.json(data)
        }
    } catch (error) {
        console.error("Failed to fetch tokens:", error)
        return NextResponse.json({ error: "Failed to fetch tokens" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { search, address } = body

        if (address) {
            // Fetch specific token by address
            console.log("Fetching token by address:", address)
            const data = await fetchFromUniswap(TOKEN_PROJECTS_QUERY, {
                contracts: [{ chain: "MONAD", address }]
            })
            return NextResponse.json(data)
        } else if (search && search.length >= 2) {
            // Search for tokens
            console.log("Searching for tokens:", search)
            const data = await fetchFromUniswap(SEARCH_TOKENS_QUERY, {
                searchQuery: search,
                chains: ["MONAD"]
            })
            return NextResponse.json(data)
        } else {
            // Return default tokens
            const data = await fetchFromUniswap(TOKEN_PROJECTS_QUERY, {
                contracts: DEFAULT_CONTRACTS
            })
            return NextResponse.json(data)
        }
    } catch (error) {
        console.error("Failed to fetch tokens:", error)
        return NextResponse.json({ error: "Failed to fetch tokens" }, { status: 500 })
    }
}
