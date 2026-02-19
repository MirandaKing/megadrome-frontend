import { NextRequest, NextResponse } from "next/server";

const ENVIO_URL =
  process.env.ENVIO_GRAPHQL_URL ??
  process.env.NEXT_PUBLIC_ENVIO ??
  "";

const GET_USER_LOCKS_QUERY = `
  query GetUserLocks($owner: String!) {
    VeNFTState(where: { owner: { _ilike: $owner }, isAlive: { _eq: true } }) {
      tokenId
      locktime
      totalValueLocked
    }
  }
`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Missing address param" }, { status: 400 });
  }

  if (!ENVIO_URL) {
    return NextResponse.json({ error: "ENVIO_GRAPHQL_URL not configured" }, { status: 503 });
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
        query: GET_USER_LOCKS_QUERY,
        variables: { owner: address },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `Envio returned ${response.status}`, detail: text }, { status: 502 });
    }

    const data = await response.json();

    if (data.errors) {
      return NextResponse.json({ error: "GraphQL error", details: data.errors }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Failed to reach Envio indexer", detail: String(err) }, { status: 502 });
  }
}
