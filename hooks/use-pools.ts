"use client";

import { useEffect, useMemo, useState } from "react";
import { getTokenByAddress } from "@/lib/token-list";
import { type Address } from "viem";

const MEGA_ADDRESS = process.env.NEXT_PUBLIC_MEGA?.toLowerCase();

// ─── Raw shapes from Envio ────────────────────────────────────────────────────

export interface RawToken {
  address: string;
  symbol: string;
  name: string;
  decimals: string; // BigInt string
  pricePerUSDNew: string; // BigInt with 18-decimal precision
  isWhitelisted: boolean;
}

export interface RawPool {
  id: string;
  poolAddress: string;
  name: string;
  token0_address: string;
  token1_address: string;
  isStable: boolean;
  isCL: boolean;
  baseFee: string;
  currentFee: string;
  reserve0: string;
  reserve1: string;
  totalLiquidityUSD: string;
  totalVolumeUSD: string;
  totalVolume0: string;
  totalVolume1: string;
  totalFeesGeneratedUSD: string;
  totalFeesGenerated0: string;
  totalFeesGenerated1: string;
  totalEmissionsUSD: string;
  numberOfSwaps: string;
  token0Price: string;
  token1Price: string;
  gaugeIsAlive: boolean;
  tickSpacing: string;
  lastUpdatedTimestamp: string;
}

// ─── Public shapes ───────────────────────────────────────────────────────────

export interface TokenMeta {
  symbol: string;
  logoUrl: string;
  address: string;
  decimals: number;
  /** USD price per token from Envio pricePerUSDNew (0 if not indexed) */
  priceUSD: number;
  /** true if the token is in our verified TOKEN_LIST or whitelisted in Envio */
  verified: boolean;
}

export interface PoolInfo {
  id: string;
  poolAddress: string;
  name: string;
  token0: TokenMeta;
  token1: TokenMeta;
  isStable: boolean;
  isCL: boolean;
  poolType: string;
  fee: string; // "0.30%"
  tvlUSD: number;
  tvl: string;
  volumeUSD: number;
  volume: string;
  volume0Human: string; // token0 volume in native units (fallback)
  volume1Human: string; // token1 volume in native units (fallback)
  feesUSD: number;
  fees: string;
  fees0Human: string;
  fees1Human: string;
  emissionsUSD: number;
  emissions: string;
  reserve0Human: string;
  reserve1Human: string;
  reserve0Num: number; // raw numeric amount of token0 in pool
  reserve1Num: number; // raw numeric amount of token1 in pool
  numberOfSwaps: number;
  gaugeIsAlive: boolean;
  tickSpacing: number;
  /** true when both tokens are verified */
  verified: boolean;
}

export interface GlobalStats {
  tvl: string;
  volume: string;
  fees: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a token metadata object, checking sources in order:
 * 1. MEGA protocol token (env var)
 * 2. Envio Token entity (on-chain indexed data with symbols/decimals)
 * 3. Local TOKEN_LIST (for logos and verified status)
 * 4. Fallback to truncated address
 */
function getTokenMeta(
  address: string,
  envioTokenMap: Map<string, RawToken>
): TokenMeta {
  const addr = address.toLowerCase();

  // 1. MEGA (protocol token, not in TOKEN_LIST)
  if (MEGA_ADDRESS && addr === MEGA_ADDRESS) {
    return {
      symbol: "MEGA",
      logoUrl: "/assets/Logo.svg",
      address,
      decimals: 18,
      priceUSD: 0,
      verified: true,
    };
  }

  // 2. Envio Token entity - use for symbol/decimals/price
  const envioToken = envioTokenMap.get(addr);
  const localToken = getTokenByAddress(address as Address);

  const isValidSymbol = (s: string) =>
    s && s !== "undefined" && s !== "" && s.length > 0;

  if (envioToken && isValidSymbol(envioToken.symbol)) {
    return {
      symbol: envioToken.symbol,
      logoUrl: localToken?.logoUrl ?? "",
      address,
      decimals: Number(envioToken.decimals) || 18,
      priceUSD: bigIntToUSD(envioToken.pricePerUSDNew),
      verified:
        envioToken.isWhitelisted || localToken?.safetyLevel === "VERIFIED",
    };
  }

  // 3. Local TOKEN_LIST lookup
  if (localToken) {
    return {
      symbol: localToken.symbol,
      logoUrl: localToken.logoUrl,
      address,
      decimals: localToken.decimals,
      priceUSD: 0,
      verified: localToken.safetyLevel === "VERIFIED",
    };
  }

  // 4. Unknown token - use truncated address as symbol
  return {
    symbol: address.slice(0, 6) + "…" + address.slice(-4),
    logoUrl: "",
    address,
    decimals: 18,
    priceUSD: 0,
    verified: false,
  };
}

/**
 * Convert a BigInt-string with 18 decimal places to a JS number.
 * Envio stores all USD values as uint256 with 18-decimal precision.
 */
function bigIntToUSD(raw: string | null | undefined): number {
  if (!raw || raw === "0") return 0;
  try {
    const milliDollars = BigInt(raw) / BigInt("1000000000000000");
    return Number(milliDollars) / 1_000;
  } catch {
    return 0;
  }
}

function bigIntToTokenAmount(
  raw: string | null | undefined,
  decimals: number
): number {
  if (!raw || raw === "0") return 0;
  try {
    if (decimals <= 18) {
      const divisor = BigInt(10 ** decimals);
      return Number(BigInt(raw) / divisor);
    }
    return Number(BigInt(raw)) / 10 ** decimals;
  } catch {
    return 0;
  }
}

function compactUSD(value: number): string {
  if (value === 0) return "-";
  if (value >= 1e9) return `~$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `~$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3)
    return `~$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `~$${value.toFixed(2)}`;
}

function compactTokenAmount(value: number): string {
  if (value === 0) return "-";
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3)
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return value.toFixed(4).replace(/\.?0+$/, "");
}

/**
 * Format the pool fee.
 * V2 pools: bps where 10 000 = 100%  →  30 → "0.30%"
 * CL pools: pips where 1 000 000 = 100% → 3000 → "0.30%"
 * Use baseFee first (it's always set); fall back to currentFee.
 */
function formatFee(baseFee: string, currentFee: string, isCL: boolean): string {
  // prefer currentFee if it differs from baseFee (dynamic fee pools); otherwise baseFee
  const raw = currentFee !== "0" ? currentFee : baseFee;
  const fee = Number(raw);
  if (fee === 0) return "0%";
  if (isCL) {
    const pct = fee / 10_000;
    return `${pct < 0.01 ? pct.toFixed(4) : pct.toFixed(2)}%`;
  }
  return `${(fee / 100).toFixed(2)}%`;
}

function getPoolTypeLabel(
  name: string,
  isStable: boolean,
  isCL: boolean
): string {
  if (isCL) {
    const m = name.match(/^CL(\d+)-/);
    const ts = m ? ` ${m[1]}` : "";
    return isStable ? `Concentrated Stable${ts}` : `Concentrated Volatile${ts}`;
  }
  return isStable ? "Basic Stable" : "Basic Volatile";
}

function mapPool(raw: RawPool, envioTokenMap: Map<string, RawToken>): PoolInfo {
  const token0 = getTokenMeta(raw.token0_address, envioTokenMap);
  const token1 = getTokenMeta(raw.token1_address, envioTokenMap);

  const tvlUSD = bigIntToUSD(raw.totalLiquidityUSD);
  const volumeUSD = bigIntToUSD(raw.totalVolumeUSD);
  const feesUSD = bigIntToUSD(raw.totalFeesGeneratedUSD);
  const emissionsUSD = bigIntToUSD(raw.totalEmissionsUSD);

  const r0 = bigIntToTokenAmount(raw.reserve0, token0.decimals);
  const r1 = bigIntToTokenAmount(raw.reserve1, token1.decimals);

  const vol0 = bigIntToTokenAmount(raw.totalVolume0, token0.decimals);
  const vol1 = bigIntToTokenAmount(raw.totalVolume1, token1.decimals);
  const fees0 = bigIntToTokenAmount(raw.totalFeesGenerated0, token0.decimals);
  const fees1 = bigIntToTokenAmount(raw.totalFeesGenerated1, token1.decimals);

  const numberOfSwaps = Number(raw.numberOfSwaps ?? "0");

  return {
    id: raw.id,
    poolAddress: raw.poolAddress,
    name: raw.name,
    token0,
    token1,
    isStable: raw.isStable,
    isCL: raw.isCL,
    poolType: getPoolTypeLabel(raw.name, raw.isStable, raw.isCL),
    fee: formatFee(raw.baseFee, raw.currentFee, raw.isCL),
    tvlUSD,
    tvl: compactUSD(tvlUSD),
    volumeUSD,
    volume: compactUSD(volumeUSD),
    volume0Human: compactTokenAmount(vol0),
    volume1Human: compactTokenAmount(vol1),
    feesUSD,
    fees: compactUSD(feesUSD),
    fees0Human: compactTokenAmount(fees0),
    fees1Human: compactTokenAmount(fees1),
    emissionsUSD,
    emissions: compactUSD(emissionsUSD),
    reserve0Human: compactTokenAmount(r0),
    reserve1Human: compactTokenAmount(r1),
    reserve0Num: r0,
    reserve1Num: r1,
    numberOfSwaps,
    gaugeIsAlive: raw.gaugeIsAlive,
    tickSpacing: Number(raw.tickSpacing ?? "0"),
    verified: token0.verified && token1.verified,
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePools() {
  const [rawPools, setRawPools] = useState<RawPool[]>([]);
  const [rawTokens, setRawTokens] = useState<RawToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch("/api/pools?limit=50")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) throw new Error(json.error);
        setRawPools(json?.data?.LiquidityPoolAggregator ?? []);
        setRawTokens(json?.data?.Token ?? []);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? "Failed to load pools");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Build address → RawToken map for fast lookup
  const envioTokenMap = useMemo<Map<string, RawToken>>(() => {
    const map = new Map<string, RawToken>();
    for (const t of rawTokens) {
      if (t.address) map.set(t.address.toLowerCase(), t);
    }
    return map;
  }, [rawTokens]);

  const pools = useMemo(
    () => rawPools.map((p) => mapPool(p, envioTokenMap)),
    [rawPools, envioTokenMap]
  );

  // Aggregate stats across all loaded pools
  const stats = useMemo<GlobalStats>(() => {
    const tvl = pools.reduce((s, p) => s + p.tvlUSD, 0);
    const volume = pools.reduce((s, p) => s + p.volumeUSD, 0);
    const fees = pools.reduce((s, p) => s + p.feesUSD, 0);
    return {
      tvl: compactUSD(tvl),
      volume: compactUSD(volume),
      fees: compactUSD(fees),
    };
  }, [pools]);

  // Unique tokens + per-token TVL (for the Tokens tab)
  const discoveredTokens = useMemo<TokenMeta[]>(() => {
    const map = new Map<string, TokenMeta>();
    // tvlMap accumulates USD value locked per token: reserve_amount × token_price
    const tvlMap = new Map<string, number>();

    for (const p of pools) {
      const a0 = p.token0.address.toLowerCase();
      const a1 = p.token1.address.toLowerCase();
      map.set(a0, p.token0);
      map.set(a1, p.token1);

      // Contribution = reserve amount × price per token
      const tvl0 = p.reserve0Num * p.token0.priceUSD;
      const tvl1 = p.reserve1Num * p.token1.priceUSD;
      tvlMap.set(a0, (tvlMap.get(a0) ?? 0) + tvl0);
      tvlMap.set(a1, (tvlMap.get(a1) ?? 0) + tvl1);
    }

    return Array.from(map.values())
      .map((t) => ({ ...t, tvlUSD: tvlMap.get(t.address.toLowerCase()) ?? 0 }))
      .sort((a, b) => {
        if (a.verified && !b.verified) return -1;
        if (!a.verified && b.verified) return 1;
        return a.symbol.localeCompare(b.symbol);
      });
  }, [pools]);

  return { pools, loading, error, stats, discoveredTokens };
}
