import { NextRequest, NextResponse } from "next/server";

const ENVIO_URL =
  process.env.ENVIO_GRAPHQL_URL ?? process.env.NEXT_PUBLIC_ENVIO ?? "";

const GET_POOLS_QUERY = `
  query GetPoolsAndTokens($limit: Int!, $offset: Int!) {
    LiquidityPoolAggregator(
      limit: $limit
      offset: $offset
      order_by: { totalLiquidityUSD: desc }
    ) {
      id
      poolAddress
      name
      token0_address
      token1_address
      isStable
      isCL
      baseFee
      currentFee
      reserve0
      reserve1
      totalLiquidityUSD
      totalVolumeUSD
      totalVolume0
      totalVolume1
      totalFeesGeneratedUSD
      totalFeesGenerated0
      totalFeesGenerated1
      totalEmissionsUSD
      numberOfSwaps
      token0Price
      token1Price
      gaugeIsAlive
      tickSpacing
      lastUpdatedTimestamp
    }
    Token(limit: 200) {
      address
      symbol
      name
      decimals
      pricePerUSDNew
      isWhitelisted
    }
  }
`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);
  const offset = Number(searchParams.get("offset") ?? "0");

  if (!ENVIO_URL) {
    return NextResponse.json(
      { error: "ENVIO_GRAPHQL_URL not configured" },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(ENVIO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.ENVIO_API_KEY
          ? { Authorization: `Bearer ${process.env.ENVIO_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        query: GET_POOLS_QUERY,
        variables: { limit, offset },
      }),
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Envio returned ${response.status}`, detail: text },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (data.errors) {
      return NextResponse.json(
        { error: "GraphQL error", details: data.errors },
        { status: 502 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to reach Envio indexer", detail: String(err) },
      { status: 502 }
    );
  }
}
