"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Layers,
  Search,
  ChevronDown,
  ArrowDown,
  ArrowUp,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePools, fullUSD, type PoolInfo, type TokenMeta } from "@/hooks/use-pools";
import { shortenAddress } from "@/lib/format";
import { useReadContracts, useAccount } from "wagmi";
import type { Address } from "viem";

// ─── ERC20 balanceOf ABI ──────────────────────────────────────────────────────
const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/** Batch-fetch ERC20 balances for all discovered tokens for the connected user */
function useTokenBalances(tokens: TokenMeta[]) {
  const { address } = useAccount();

  const contracts = useMemo(
    () =>
      tokens.map((t) => ({
        address: t.address as Address,
        abi: ERC20_ABI,
        functionName: "balanceOf" as const,
        args: [address ?? "0x0000000000000000000000000000000000000000"] as [
          Address
        ],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tokens.map((t) => t.address).join(","), address]
  );

  const { data } = useReadContracts({
    contracts,
    query: { enabled: !!address && tokens.length > 0 },
  });

  return useMemo(() => {
    const map = new Map<string, bigint>();
    if (!data) return map;
    tokens.forEach((t, i) => {
      const result = data[i];
      if (result?.status === "success" && typeof result.result === "bigint") {
        map.set(t.address.toLowerCase(), result.result);
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, tokens.map((t) => t.address).join(",")]);
}

/** Convert raw bigint balance to a JS number */
function formatBalanceNum(raw: bigint, decimals: number): number {
  const safeDecimals = Math.min(decimals, 18);
  const divisor = BigInt(10 ** safeDecimals);
  return Number(raw / divisor) + Number(raw % divisor) / 10 ** safeDecimals;
}

/** Format a raw bigint balance to a compact human string */
function formatBalance(raw: bigint | undefined, decimals: number): string {
  if (!raw || raw === BigInt(0)) return "0";
  const value = formatBalanceNum(raw, decimals);
  if (value >= 1e6) return `${(value / 1e6).toFixed(6)}M`;
  if (value >= 1e3)
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (value >= 1) return value.toFixed(4).replace(/\.?0+$/, "");
  if (value > 0) return value.toFixed(6).replace(/\.?0+$/, "");
  return "0";
}

/** Format price with smart precision */
function formatPrice(priceUSD: number): string {
  if (priceUSD === 0) return "$0";
  if (priceUSD >= 1000)
    return `$${priceUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (priceUSD >= 1) return `$${priceUSD.toFixed(4)}`;
  if (priceUSD >= 0.0001) return `$${priceUSD.toFixed(6)}`;
  return `$${priceUSD.toExponential(2)}`;
}

/** Format TVL compactly */
function formatTVL(tvlUSD: number): string {
  if (tvlUSD === 0) return "$0";
  if (tvlUSD >= 1e9) return `$${(tvlUSD / 1e9).toFixed(6)}B`;
  if (tvlUSD >= 1e6) return `$${(tvlUSD / 1e6).toFixed(6)}M`;
  if (tvlUSD >= 1e3)
    return `$${tvlUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${tvlUSD.toFixed(6)}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SortField = "tvl" | "volume" | "fees" | "emissions";
type SortDir = "desc" | "asc";
type TokenFilter = "all" | "listed" | "emerging";
type TypeFilter = "any" | "concentrated" | "basic";
type VolatilityFilter = "any" | "stable" | "volatile";

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Styled tooltip that appears on hover above the trigger */
function ProperTooltip({
  tip,
  children,
}: {
  tip: string;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && tip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-[#0a1612] border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white whitespace-nowrap shadow-xl shadow-black/50">
            {tip}
          </div>
          <div className="w-2 h-2 bg-[#0a1612] border-r border-b border-white/20 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}

/** Reusable dropdown for filter buttons */
function FilterDropdown({
  label,
  value,
  options,
  onChange,
  active,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex flex-col gap-1.5 px-6 py-4 text-left hover:bg-white/5 transition-colors min-w-35"
      >
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/50">
          {label}
          {active && <span className="w-1.5 h-1.5 rounded-full bg-[#f7931a]" />}
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#f7931a]">
          {selectedLabel}
          <ChevronDown
            className={`w-2.5 h-2.5 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 min-w-40 bg-[#0d1f1a] border border-white/15 rounded-xl overflow-hidden shadow-2xl shadow-black/60">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                value === opt.value
                  ? "text-[#f7931a] bg-[#f7931a]/10"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Overlapping token pair icons */
function TokenPairIcons({
  token0,
  token1,
}: {
  token0: TokenMeta;
  token1: TokenMeta;
}) {
  return (
    <div className="flex -space-x-2 shrink-0">
      {[token0, token1].map((t, i) => (
        <div
          key={i}
          className="w-10 h-10 rounded-full border-2 border-[#0a1612] bg-[#0d1f1a] flex items-center justify-center overflow-hidden"
        >
          {t.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={t.logoUrl}
              alt={t.symbol}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="text-[10px] font-bold text-white/60">
              {t.symbol.slice(0, 2)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/** Single pool row in the table */
function PoolRow({ pool }: { pool: PoolInfo }) {
  console.log(pool);
  return (
    <Link
      href={`/liquidity/deposit?pool=${pool.poolAddress}`}
      className="group grid grid-cols-1 gap-4 px-5 py-5 bg-[#0d1f1a]/80 backdrop-blur-xl hover:border-white/20 border border-white/10 rounded-xl transition-colors sm:grid-cols-5 sm:gap-6 sm:px-6 lg:grid-cols-7"
    >
      {/* Pool Info */}
      <div className="space-y-3 pb-2 sm:col-span-5 sm:border-b sm:border-white/5 sm:pb-8 lg:col-span-2 lg:border-b-0 lg:pb-0">
        <div className="flex items-center gap-3">
          <TokenPairIcons token0={pool.token0} token1={pool.token1} />
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-white">
                {pool.token0.symbol} / {pool.token1.symbol}
              </span>
              {pool.verified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
              )}
              <span className="px-1.5 py-px text-[10px] font-semibold rounded-full bg-white/10 text-white/50 uppercase">
                {pool.fee}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {pool.isCL && (
                <span className="inline-flex w-3 h-3 items-center justify-center text-[7px] font-bold leading-none text-white bg-[#f7931a] rounded-sm">
                  A
                </span>
              )}
              <span className="text-xs font-medium text-[#f7931a]">
                {pool.poolType}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Volume */}
      <div className="flex justify-between gap-4 border-b border-white/5 pb-4 text-xs sm:flex-col sm:border-b-0 sm:pb-0 lg:text-right">
        <div className="text-white/50 lg:hidden">Volume</div>
        <div
          className="lg:text-sm text-white cursor-default"
          title={
            fullUSD(pool.volumeUSD) || undefined
          }
        >
          {pool.volume}
        </div>
        <div className="hidden sm:block space-y-0.5 text-white/50 text-[11px]">
          {pool.numberOfSwaps > 0 && (
            <div className="text-[#f7931a]/70">{pool.numberOfSwaps} swaps</div>
          )}
          {pool.volume0Human !== "-" && (
            <div>
              {pool.volume0Human}{" "}
              <span className="opacity-70">{pool.token0.symbol}</span>
            </div>
          )}
          {pool.volume1Human !== "-" && (
            <div>
              {pool.volume1Human}{" "}
              <span className="opacity-70">{pool.token1.symbol}</span>
            </div>
          )}
        </div>
      </div>

      {/* Fees */}
      <div className="flex justify-between gap-4 border-b border-white/5 pb-4 text-xs sm:flex-col sm:border-b-0 sm:pb-0 lg:text-right">
        <div className="text-white/50 lg:hidden">Fees</div>
        <div
          className="lg:text-sm text-white cursor-default"
          title={fullUSD(pool.feesUSD) || undefined}
        >
          {pool.fees}
        </div>
        <div className="hidden sm:block space-y-0.5 text-white/50 text-[11px]">
          {pool.fees0Human !== "-" && (
            <div>
              {pool.fees0Human}{" "}
              <span className="opacity-70">{pool.token0.symbol}</span>
            </div>
          )}
          {pool.fees1Human !== "-" && (
            <div>
              {pool.fees1Human}{" "}
              <span className="opacity-70">{pool.token1.symbol}</span>
            </div>
          )}
        </div>
      </div>

      {/* TVL */}
      <div className="flex justify-between gap-4 border-b border-white/5 pb-4 text-xs sm:flex-col sm:border-b-0 sm:pb-0 lg:text-right">
        <div className="text-white/50 lg:hidden">TVL</div>
        <div
          className="lg:text-sm text-white cursor-default"
          title={fullUSD(pool.tvlUSD) || undefined}
        >
          {pool.tvl}
        </div>
        <div className="hidden sm:block space-y-0.5 text-white/50 text-[11px]">
          {pool.reserve0Human !== "-" && (
            <div>
              {pool.reserve0Human}{" "}
              <span className="opacity-70">{pool.token0.symbol}</span>
            </div>
          )}
          {pool.reserve1Human !== "-" && (
            <div>
              {pool.reserve1Human}{" "}
              <span className="opacity-70">{pool.token1.symbol}</span>
            </div>
          )}
        </div>
      </div>

      {/* Gauge / Emissions */}
      <div className="flex justify-between gap-4 border-b border-white/5 pb-4 text-xs sm:flex-col sm:items-end sm:border-b-0 sm:pb-0">
        <div className="text-white/50 lg:hidden">Emissions</div>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              pool.gaugeIsAlive ? "bg-green-400" : "bg-white/20"
            }`}
          />
          <span className="text-xs text-white/60">
            {pool.gaugeIsAlive ? "Gauge active" : "No gauge"}
          </span>
        </div>
        <div className="lg:text-sm text-white">{pool.emissions}</div>
      </div>

      {/* CTA */}
      <div className="flex justify-between gap-4 text-xs sm:flex-col sm:items-end">
        <div className="text-white/50 lg:hidden">Deposit</div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-[#f7931a]/10 px-2.5 py-1.5 text-xs text-[#f7931a] group-hover:bg-[#f7931a]/20 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            New deposit
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Skeleton row while loading */
function SkeletonRow() {
  return (
    <div className="grid grid-cols-1 gap-4 px-5 py-5 bg-[#0d1f1a]/60 border border-white/5 rounded-xl sm:grid-cols-5 sm:gap-6 sm:px-6 lg:grid-cols-7 animate-pulse">
      <div className="sm:col-span-5 lg:col-span-2 flex items-center gap-3">
        <div className="flex -space-x-2">
          <div className="w-10 h-10 rounded-full bg-white/10" />
          <div className="w-10 h-10 rounded-full bg-white/10" />
        </div>
        <div className="space-y-2">
          <div className="h-3.5 w-28 rounded bg-white/10" />
          <div className="h-3 w-20 rounded bg-white/10" />
        </div>
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-3.5 w-16 rounded bg-white/10 ml-auto" />
          <div className="h-3 w-12 rounded bg-white/10 ml-auto" />
        </div>
      ))}
    </div>
  );
}

/** Token row for the Tokens tab */
function TokenRow({
  token,
  balance,
  isConnected,
}: {
  token: TokenMeta & { tvlUSD?: number };
  balance: bigint | undefined;
  isConnected: boolean;
}) {
  const tvlUSD = (token as TokenMeta & { tvlUSD?: number }).tvlUSD ?? 0;
  const balanceStr =
    balance !== undefined ? formatBalance(balance, token.decimals) : null;
  const balanceUSD =
    balance !== undefined && token.priceUSD > 0
      ? formatTVL(formatBalanceNum(balance, token.decimals) * token.priceUSD)
      : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-5 py-4 bg-[#0d1f1a]/80 border border-white/10 rounded-xl hover:border-white/20 transition-colors items-center">
      {/* Token identity */}
      <div className="flex items-center gap-3 col-span-2 sm:col-span-1">
        <div className="w-9 h-9 rounded-full bg-[#0a1612] border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
          {token.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={token.logoUrl}
              alt={token.symbol}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="text-[10px] font-bold text-white/40">
              {token.symbol.slice(0, 2)}
            </span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">
              {token.symbol}
            </span>
            <span
              className={`text-[9px] font-semibold uppercase px-1.5 py-px rounded-full ${
                token.verified
                  ? "bg-green-500/15 text-green-400"
                  : "bg-orange-500/15 text-orange-400"
              }`}
            >
              {token.verified ? "Verified" : "Emerging"}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-white/40">
            <span>{shortenAddress(token.address)}</span>
            <a
              href={`https://monadscan.com/token/${token.address}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="hover:text-white/70 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Price */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-0.5 sm:hidden">
          Price
        </div>
        <div
          className="text-sm font-semibold text-white cursor-default"
          title={
            fullUSD(token.priceUSD) || undefined
          }
        >
          {formatPrice(token.priceUSD)}
        </div>
      </div>

      {/* TVL */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-0.5 sm:hidden">
          TVL
        </div>
        <div
          className="text-sm font-semibold text-white cursor-default"
          title={fullUSD(tvlUSD) || undefined}
        >
          {formatTVL(tvlUSD)}
        </div>
      </div>

      {/* Balance */}
      <div className="text-right sm:text-left">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-0.5 sm:hidden">
          Balance
        </div>
        {!isConnected ? (
          <div className="text-xs text-white/30">-</div>
        ) : balanceStr === null ? (
          <div className="h-4 w-16 rounded bg-white/10 animate-pulse" />
        ) : (
          <>
            <div className="text-sm font-semibold text-white">
              {balanceStr}{" "}
              <span className="text-white/50 text-xs">{token.symbol}</span>
            </div>
            {balanceUSD && (
              <div className="text-xs text-white/40 mt-0.5">{balanceUSD}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Liquidity() {
  const { pools, loading, error, stats, discoveredTokens } = usePools();
  const { isConnected } = useAccount();
  const balanceMap = useTokenBalances(discoveredTokens);

  console.log(stats, "statsstats");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"pools" | "tokens">("pools");
  const [tokenFilter, setTokenFilter] = useState<TokenFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("any");
  const [volatilityFilter, setVolatilityFilter] =
    useState<VolatilityFilter>("any");
  const [sortField, setSortField] = useState<SortField>("tvl");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // Apply all filters + sort
  const filteredPools = useMemo(() => {
    let result = [...pools];

    // Search: match token symbols, pool name, or pool address
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.token0.symbol.toLowerCase().includes(q) ||
          p.token1.symbol.toLowerCase().includes(q) ||
          p.poolAddress.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q)
      );
    }

    // Token filter (listed = verified, emerging = at least one unverified)
    if (tokenFilter === "listed") {
      result = result.filter((p) => p.token0.verified && p.token1.verified);
    } else if (tokenFilter === "emerging") {
      result = result.filter((p) => !p.token0.verified || !p.token1.verified);
    }

    // Pool type
    if (typeFilter === "concentrated") {
      result = result.filter((p) => p.isCL);
    } else if (typeFilter === "basic") {
      result = result.filter((p) => !p.isCL);
    }

    // Volatility
    if (volatilityFilter === "stable") {
      result = result.filter((p) => p.isStable);
    } else if (volatilityFilter === "volatile") {
      result = result.filter((p) => !p.isStable);
    }

    // Sort
    const dir = sortDir === "desc" ? -1 : 1;
    result.sort((a, b) => {
      switch (sortField) {
        case "volume":
          return dir * (b.volumeUSD - a.volumeUSD);
        case "fees":
          return dir * (b.feesUSD - a.feesUSD);
        case "emissions":
          return dir * (b.emissionsUSD - a.emissionsUSD);
        default:
          return dir * (b.tvlUSD - a.tvlUSD);
      }
    });

    return result;
  }, [
    pools,
    searchQuery,
    tokenFilter,
    typeFilter,
    volatilityFilter,
    sortField,
    sortDir,
  ]);

  // Has any non-default filter active?
  const anyFilterActive =
    tokenFilter !== "all" || typeFilter !== "any" || volatilityFilter !== "any";

  const resetFilters = () => {
    setTokenFilter("all");
    setTypeFilter("any");
    setVolatilityFilter("any");
    setSearchQuery("");
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowDown className="w-3 h-3 opacity-30" />;
    return sortDir === "desc" ? (
      <ArrowDown className="w-3 h-3 text-[#f7931a]" />
    ) : (
      <ArrowUp className="w-3 h-3 text-[#f7931a]" />
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      {/* ── Hero Stats ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col-reverse gap-3 md:flex-row mb-6">
        {/* Stats Card */}
        <div className="flex-1 bg-[#0d1f1a]/80 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-4 mb-6">
            <div className="hidden lg:flex w-14 h-14 rounded-full border border-white/10 items-center justify-center shrink-0">
              <Layers className="w-6 h-6 text-white/60" />
            </div>
            <p className="text-white/70 text-sm max-w-sm">
              Provide liquidity to enable low-slippage swaps and earn MEGA
              emissions.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 sm:divide-x divide-white/10">
            <div className="sm:pr-5">
              {loading ? (
                <div className="h-6 w-24 rounded bg-white/10 animate-pulse mb-1" />
              ) : (
                <ProperTooltip
                  tip={
                    fullUSD(stats.volumeRaw)
                  }
                >
                  <div className="text-lg font-semibold text-white cursor-default">
                    {stats.volume}
                  </div>
                </ProperTooltip>
              )}
              <div className="text-sm text-white/50">Total Volume</div>
            </div>
            <div className="sm:px-5">
              {loading ? (
                <div className="h-6 w-24 rounded bg-white/10 animate-pulse mb-1" />
              ) : (
                <ProperTooltip
                  tip={fullUSD(stats.feesRaw)}
                >
                  <div className="text-lg font-semibold text-white cursor-default">
                    {stats.fees}
                  </div>
                </ProperTooltip>
              )}
              <div className="text-sm text-white/50">Total Fees</div>
            </div>
            <div className="sm:pl-5">
              {loading ? (
                <div className="h-6 w-24 rounded bg-white/10 animate-pulse mb-1" />
              ) : (
                <ProperTooltip
                  tip={fullUSD(stats.tvlRaw)}
                >
                  <div className="text-lg font-semibold text-white cursor-default">
                    {stats.tvl}
                  </div>
                </ProperTooltip>
              )}
              <div className="text-sm text-white/50">TVL</div>
            </div>
          </div>
        </div>

        {/* Autopilot Banner */}
        <div className="relative w-full md:max-w-md overflow-hidden rounded-2xl border-4 border-[#f7931a]/20 bg-linear-to-br from-[#f7931a]/20 to-[#15713a]/20">
          <div className="p-6 flex flex-col justify-center h-full">
            <h3 className="text-xl font-bold text-white mb-2">Autopilot</h3>
            <p className="text-sm text-white/60 mb-4">
              Set it and forget it. Let our algorithms optimize your liquidity
              positions.
            </p>
            <Button className="w-fit bg-[#f7931a] hover:bg-[#ff9f2a] text-white font-bold text-sm">
              Learn More
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main Panel ──────────────────────────────────────────────────────── */}
      <div className="bg-[#0a1612] rounded-2xl border border-white/10 overflow-hidden">
        {/* Header row: tabs + actions */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 p-5 sm:items-center border-b border-white/5">
          <div className="flex items-center gap-6 text-xl font-semibold">
            <button
              onClick={() => setActiveTab("pools")}
              className={`flex items-center gap-2 transition-colors ${
                activeTab === "pools"
                  ? "text-white"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              Pools
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === "pools"
                    ? "bg-[#f7931a]/20 text-[#f7931a]"
                    : "bg-white/10 text-white/50"
                }`}
              >
                {loading ? "…" : pools.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("tokens")}
              className={`flex items-center gap-2 transition-colors ${
                activeTab === "tokens"
                  ? "text-white"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              Tokens
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === "tokens"
                    ? "bg-[#f7931a]/20 text-[#f7931a]"
                    : "bg-white/10 text-white/50"
                }`}
              >
                {loading ? "…" : discoveredTokens.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/liquidity/launch"
              className="flex items-center gap-2 bg-[#f7931a] hover:bg-[#ff9f2a] text-white px-4 py-2.5 rounded-full text-xs font-semibold transition-colors"
            >
              <Layers className="w-4 h-4" />
              Launch pool
            </Link>

            <div className="relative flex items-center border border-white/20 rounded-full focus-within:border-[#f7931a] transition-colors">
              <Search className="w-4 h-4 ml-3.5 text-white/50 shrink-0" />
              <input
                type="text"
                placeholder="Symbol or address…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-48 px-3.5 py-2.5 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
              />
            </div>
          </div>
        </div>

        {/* ── Pools Tab ───────────────────────────────────────────────────── */}
        {activeTab === "pools" && (
          <>
            {/* Filter bar */}
            <div className="flex items-center justify-between border-b border-white/5 overflow-x-auto">
              <div className="flex items-center divide-x divide-white/10">
                <FilterDropdown
                  label="Token"
                  value={tokenFilter}
                  active={tokenFilter !== "all"}
                  options={[
                    { value: "all", label: "Listed & Emerging" },
                    { value: "listed", label: "Listed only" },
                    { value: "emerging", label: "Emerging only" },
                  ]}
                  onChange={(v) => setTokenFilter(v as TokenFilter)}
                />
                <FilterDropdown
                  label="Type"
                  value={typeFilter}
                  active={typeFilter !== "any"}
                  options={[
                    { value: "any", label: "Any" },
                    { value: "concentrated", label: "Concentrated" },
                    { value: "basic", label: "Basic" },
                  ]}
                  onChange={(v) => setTypeFilter(v as TypeFilter)}
                />
                <FilterDropdown
                  label="Volatility"
                  value={volatilityFilter}
                  active={volatilityFilter !== "any"}
                  options={[
                    { value: "any", label: "Any" },
                    { value: "stable", label: "Stable" },
                    { value: "volatile", label: "Volatile" },
                  ]}
                  onChange={(v) => setVolatilityFilter(v as VolatilityFilter)}
                />
              </div>

              {anyFilterActive && (
                <button
                  onClick={resetFilters}
                  className="flex flex-col items-end gap-1.5 px-6 py-4 min-w-25 hover:bg-white/5 transition-colors"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                    Filters
                  </div>
                  <div className="text-xs font-semibold text-[#f7931a]">
                    Reset
                  </div>
                </button>
              )}
              {!anyFilterActive && (
                <div className="flex flex-col items-end gap-1.5 px-6 py-4 min-w-25">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                    Filters
                  </div>
                  <div className="text-xs font-semibold text-white/40">
                    Default
                  </div>
                </div>
              )}
            </div>

            {/* Table header (desktop) */}
            <div className="hidden lg:grid grid-cols-7 gap-8 px-8 py-3.5 text-xs text-white/50 border-b border-white/5">
              <div className="col-span-2">Pools</div>
              <button
                onClick={() => handleSort("volume")}
                className={`flex items-center justify-end gap-1 hover:text-white transition-colors ${
                  sortField === "volume" ? "text-white" : ""
                }`}
              >
                Volume <SortIcon field="volume" />
              </button>
              <button
                onClick={() => handleSort("fees")}
                className={`flex items-center justify-end gap-1 hover:text-white transition-colors ${
                  sortField === "fees" ? "text-white" : ""
                }`}
              >
                Fees <SortIcon field="fees" />
              </button>
              <button
                onClick={() => handleSort("tvl")}
                className={`flex items-center justify-end gap-1 hover:text-white transition-colors ${
                  sortField === "tvl" ? "text-white" : ""
                }`}
              >
                TVL <SortIcon field="tvl" />
              </button>
              <button
                onClick={() => handleSort("emissions")}
                className={`flex items-center justify-end gap-1 hover:text-white transition-colors ${
                  sortField === "emissions" ? "text-white" : ""
                }`}
              >
                Emissions <SortIcon field="emissions" />
              </button>
              <div className="flex justify-end text-white/50">Action</div>
            </div>

            {/* Pool rows */}
            <div className="flex flex-col gap-1.5 p-4">
              {/* Loading skeletons */}
              {loading && (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <SkeletonRow key={i} />
                  ))}
                </>
              )}

              {/* Error state */}
              {!loading && error && (
                <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-5 text-sm text-red-400">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="font-semibold">Failed to load pools</div>
                    <div className="text-red-400/70 text-xs mt-0.5">
                      {error}
                    </div>
                  </div>
                </div>
              )}

              {/* Pool rows */}
              {!loading &&
                !error &&
                filteredPools.map((pool) => (
                  <PoolRow key={pool.id} pool={pool} />
                ))}

              {/* Empty state (no pools at all) */}
              {!loading && !error && pools.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Layers className="w-12 h-12 text-white/20 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No pools found
                  </h3>
                  <p className="text-sm text-white/50 max-w-sm">
                    The indexer may still be syncing. Try again in a few
                    moments.
                  </p>
                </div>
              )}

              {/* Empty state (filters produced no results) */}
              {!loading &&
                !error &&
                pools.length > 0 &&
                filteredPools.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Search className="w-10 h-10 text-white/20 mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      No matching pools
                    </h3>
                    <p className="text-sm text-white/50 max-w-sm mb-4">
                      Try adjusting your search or filters.
                    </p>
                    <button
                      onClick={resetFilters}
                      className="text-xs text-[#f7931a] hover:underline"
                    >
                      Reset filters
                    </button>
                  </div>
                )}
            </div>
          </>
        )}

        {/* ── Tokens Tab ──────────────────────────────────────────────────── */}
        {activeTab === "tokens" && (
          <div className="p-4">
            {/* Column headers (desktop) */}
            <div className="hidden sm:grid grid-cols-4 gap-4 px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-white/40 border-b border-white/5 mb-1.5">
              <div>Token</div>
              <div>Price</div>
              <div>TVL</div>
              <div>Balance</div>
            </div>

            {loading && (
              <div className="flex items-center gap-3 p-5 text-sm text-white/50">
                <Loader2 className="w-4 h-4 animate-spin text-[#f7931a]" />
                Loading tokens…
              </div>
            )}

            {!loading && discoveredTokens.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Layers className="w-12 h-12 text-white/20 mb-4" />
                <p className="text-sm text-white/50">No tokens found yet.</p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              {!loading &&
                discoveredTokens
                  .filter((t) => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      t.symbol.toLowerCase().includes(q) ||
                      t.address.toLowerCase().includes(q)
                    );
                  })
                  .map((token) => (
                    <TokenRow
                      key={token.address}
                      token={token}
                      balance={balanceMap.get(token.address.toLowerCase())}
                      isConnected={isConnected}
                    />
                  ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
