"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/header";
import Footer from "@/components/footer";
import {
  ArrowLeft,
  ChevronDown,
  HelpCircle,
  Loader2,
  Link2,
  Link2Off,
  ChevronRight,
  Plus,
} from "lucide-react";
import {
  useAccount,
  useBalance,
  useReadContracts,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  usePublicClient,
} from "wagmi";
import { parseUnits, formatUnits, type Address, zeroAddress } from "viem";
import { usePools, type PoolInfo } from "@/hooks/use-pools";
import { ADDRESSES, ABIS, MONAD_CONTRACTS } from "@/lib/contracts";
import { TOKEN_LIST, type TokenInfo } from "@/lib/token-list";
import { useToast } from "@/hooks/use-toast";

const CHAIN_ID = 143;
const MAX_TICK = 887272;
const Q96 = BigInt(2 ** 96);

// ── Inline ABIs for operations not in the shared ABIS ────────────────────────

const CL_POOL_ABI = [
  {
    name: "slot0",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "observationIndex", type: "uint16" },
      { name: "observationCardinality", type: "uint16" },
      { name: "observationCardinalityNext", type: "uint16" },
      { name: "feeProtocol", type: "uint8" },
      { name: "unlocked", type: "bool" },
    ],
  },
] as const;

const CL_FACTORY_ABI = [
  {
    name: "createPool",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "tickSpacing", type: "int24" },
      { name: "sqrtPriceX96", type: "uint160" },
    ],
    outputs: [{ name: "pool", type: "address" }],
  },
] as const;

// ── Tick / price helpers ──────────────────────────────────────────────────────

function priceAtomicToTick(priceAtomic: number): number {
  if (priceAtomic <= 0) return 0;
  return Math.log(priceAtomic) / Math.log(1.0001);
}
function roundTickDown(tick: number, spacing: number) {
  return Math.floor(tick / spacing) * spacing;
}
function roundTickUp(tick: number, spacing: number) {
  return Math.ceil(tick / spacing) * spacing;
}
function clampTick(tick: number, spacing: number) {
  const hi = Math.floor(MAX_TICK / spacing) * spacing;
  const lo = Math.ceil(-MAX_TICK / spacing) * spacing;
  return Math.max(lo, Math.min(hi, tick));
}
function humanPriceToAtomic(price: number, dec0: number, dec1: number) {
  return price * Math.pow(10, dec1 - dec0);
}
function sqrtPriceX96ToHuman(sqrtPriceX96: bigint, dec0: number, dec1: number) {
  const sq = Number(sqrtPriceX96) / Number(Q96);
  return sq * sq * Math.pow(10, dec0 - dec1);
}
function humanPriceToSqrtX96(priceHuman: number, dec0: number, dec1: number): bigint {
  const atomic = humanPriceToAtomic(priceHuman, dec0, dec1);
  if (atomic <= 0) return 0n;
  return BigInt(Math.floor(Math.sqrt(atomic) * Number(Q96)));
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function getSimError(err: unknown): string {
  const e = err as { shortMessage?: string; message?: string; cause?: { reason?: string } };
  return e?.cause?.reason ?? e?.shortMessage ?? e?.message ?? "Transaction will revert";
}

function fmtNum(raw: bigint | undefined, dec: number): string {
  if (raw === undefined) return "-";
  return Number(formatUnits(raw, dec)).toLocaleString("en-US", { maximumFractionDigits: 6 });
}

// ── TokenLogo ─────────────────────────────────────────────────────────────────

function TokenLogo({ url, symbol, size = 32 }: { url: string; symbol: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (!url || err) {
    return (
      <div
        className="rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold text-xs shrink-0"
        style={{ width: size, height: size }}
      >
        {symbol.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <Image src={url} alt={symbol} width={size} height={size} className="rounded-full shrink-0" onError={() => setErr(true)} />
  );
}

// ── TokenPicker ───────────────────────────────────────────────────────────────

function TokenPicker({
  value,
  onSelect,
  label,
  exclude,
}: {
  value: TokenInfo | null;
  onSelect: (t: TokenInfo) => void;
  label: string;
  exclude?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = TOKEN_LIST.filter(
    (t) =>
      t.id !== exclude &&
      (t.symbol.toLowerCase().includes(q.toLowerCase()) ||
        t.name.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 bg-[#1a2f2a] rounded-xl px-4 py-3 hover:bg-[#1a3530] transition-colors"
      >
        {value ? (
          <div className="flex items-center gap-2">
            <TokenLogo url={value.logoUrl} symbol={value.symbol} size={22} />
            <span className="font-medium text-sm">{value.symbol}</span>
          </div>
        ) : (
          <span className="text-white/40 text-sm">{label}</span>
        )}
        <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />
      </button>

      {open && (
        <>
          {/* full-page backdrop — click away closes */}
          <div className="fixed inset-0 z-100" onClick={() => { setOpen(false); setQ(""); }} />
          {/* dropdown — above the backdrop */}
          <div className="absolute z-110 top-full left-0 right-0 mt-1 bg-[#0d1e1a] border border-white/10 rounded-xl shadow-2xl p-2 min-w-55">
            <input
              autoFocus
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search token..."
              className="w-full bg-[#1a2f2a] rounded-lg px-3 py-2 text-sm outline-none mb-2 placeholder:text-white/40"
            />
            <div className="max-h-56 overflow-y-auto space-y-0.5">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { onSelect(t); setOpen(false); setQ(""); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                >
                  <TokenLogo url={t.logoUrl} symbol={t.symbol} size={22} />
                  <div>
                    <div className="text-sm font-medium">{t.symbol}</div>
                    <div className="text-xs text-white/40">{t.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Pool list row ─────────────────────────────────────────────────────────────

function PoolRow({ pool, onSelect }: { pool: PoolInfo; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="w-full bg-[#0a1612] rounded-xl border border-white/5 p-4 hover:border-[#f7931a]/30 hover:bg-[#0f1e19] transition-all text-left"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex -space-x-2 shrink-0">
            <TokenLogo url={pool.token0.logoUrl} symbol={pool.token0.symbol} size={32} />
            <TokenLogo url={pool.token1.logoUrl} symbol={pool.token1.symbol} size={32} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">
              {pool.token0.symbol} / {pool.token1.symbol}
            </div>
            <div className="text-xs text-white/40 truncate">
              {pool.poolType} · {pool.fee}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-white/40">TVL</div>
            <div className="text-sm font-medium">{pool.tvl}</div>
          </div>
          {pool.gaugeIsAlive && (
            <span className="hidden sm:flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#f7931a]/20 text-[#f7931a] rounded">
              Gauge
            </span>
          )}
          <div className="flex items-center gap-1 text-[#f7931a] text-sm font-medium">
            <span>Deposit</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Action button shared component ───────────────────────────────────────────

type TxType = "approve0" | "approve1" | "create" | "deposit";

function ActionBtn({
  isConnected, chainId, noAmounts, isBusy, txType,
  needApprove0, needApprove1, sym0, sym1,
  onApprove0, onApprove1, onDeposit,
  depositLabel = "Deposit",
}: {
  isConnected: boolean; chainId: number; noAmounts: boolean; isBusy: boolean; txType: TxType | null;
  needApprove0: boolean; needApprove1: boolean; sym0: string; sym1: string;
  onApprove0: () => void; onApprove1: () => void; onDeposit: () => void;
  depositLabel?: string;
}) {
  const base = "w-full py-3.5 rounded-xl font-semibold text-sm transition-colors";
  if (!isConnected)
    return <button disabled className={`${base} bg-white/10 text-white/40`}>Connect Wallet</button>;
  if (chainId !== CHAIN_ID)
    return <button disabled className={`${base} bg-white/10 text-white/40`}>Wrong Network</button>;
  if (noAmounts)
    return <button disabled className={`${base} bg-white/10 text-white/40`}>Enter amounts</button>;
  if (isBusy)
    return (
      <button disabled className={`${base} bg-[#f7931a]/70 text-white flex items-center justify-center gap-2`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        {txType === "approve0" ? `Approving ${sym0}…` : txType === "approve1" ? `Approving ${sym1}…` : txType === "create" ? "Creating pool…" : "Depositing…"}
      </button>
    );
  if (needApprove0)
    return <button onClick={onApprove0} className={`${base} bg-[#f7931a] hover:bg-[#ff9f2a] text-white`}>Approve {sym0}</button>;
  if (needApprove1)
    return <button onClick={onApprove1} className={`${base} bg-[#f7931a] hover:bg-[#ff9f2a] text-white`}>Approve {sym1}</button>;
  return <button onClick={onDeposit} className={`${base} bg-[#f7931a] hover:bg-[#ff9f2a] text-white`}>{depositLabel}</button>;
}

// ── CL Deposit Form ───────────────────────────────────────────────────────────

type RangePreset = "full" | "10" | "20" | "30" | "custom";

function CLDepositForm({
  pool,
  token0,
  token1,
  isNewPool,
  onBack,
}: {
  pool?: PoolInfo;
  token0: TokenInfo;
  token1: TokenInfo;
  isNewPool?: boolean;
  onBack: () => void;
}) {
  const { address: walletAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { toast } = useToast();
  const addresses = ADDRESSES[CHAIN_ID];

  const t0Addr = (pool?.token0.address ?? token0.address) as Address;
  const t1Addr = (pool?.token1.address ?? token1.address) as Address;
  const dec0 = pool?.token0.decimals ?? token0.decimals;
  const dec1 = pool?.token1.decimals ?? token1.decimals;
  const sym0 = pool?.token0.symbol ?? token0.symbol;
  const sym1 = pool?.token1.symbol ?? token1.symbol;
  const logo0 = pool?.token0.logoUrl ?? token0.logoUrl;
  const logo1 = pool?.token1.logoUrl ?? token1.logoUrl;
  const ts = pool?.tickSpacing ?? 60;

  // Read slot0 for existing pools
  const { data: slot0 } = useReadContract({
    address: pool?.poolAddress as Address | undefined,
    abi: CL_POOL_ABI,
    functionName: "slot0",
    query: { enabled: !!pool && !isNewPool },
  });

  const currentPrice = useMemo(() => {
    if (!slot0 || isNewPool) return null;
    const sqrtPriceX96 = (slot0 as readonly [bigint, ...unknown[]])[0] as bigint;
    if (sqrtPriceX96 === 0n) return null;
    return sqrtPriceX96ToHuman(sqrtPriceX96, dec0, dec1);
  }, [slot0, dec0, dec1, isNewPool]);

  // Price range
  const [preset, setPreset] = useState<RangePreset>(isNewPool ? "custom" : "full");
  const [priceLow, setPriceLow] = useState("");
  const [priceHigh, setPriceHigh] = useState("");
  const [initialPrice, setInitialPrice] = useState("");

  useEffect(() => {
    if (!currentPrice || isNewPool || preset === "custom") return;
    if (preset === "full") { setPriceLow("0"); setPriceHigh("∞"); return; }
    const pct = Number(preset) / 100;
    setPriceLow((currentPrice * (1 - pct)).toFixed(8));
    setPriceHigh((currentPrice * (1 + pct)).toFixed(8));
  }, [preset, currentPrice, isNewPool]);

  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [txType, setTxType] = useState<TxType | null>(null);

  const spender = addresses?.positionManager as Address | undefined;

  const { data: reads, refetch: refetchReads } = useReadContracts({
    contracts: [
      { address: t0Addr, abi: ABIS.ERC20, functionName: "balanceOf", args: [walletAddress ?? zeroAddress] },
      { address: t1Addr, abi: ABIS.ERC20, functionName: "balanceOf", args: [walletAddress ?? zeroAddress] },
      { address: t0Addr, abi: ABIS.ERC20, functionName: "allowance", args: [walletAddress ?? zeroAddress, spender ?? zeroAddress] },
      { address: t1Addr, abi: ABIS.ERC20, functionName: "allowance", args: [walletAddress ?? zeroAddress, spender ?? zeroAddress] },
    ],
    query: { enabled: !!walletAddress && !!spender },
  });

  const balance0Raw = reads?.[0]?.result as bigint | undefined;
  const balance1Raw = reads?.[1]?.result as bigint | undefined;
  const allowance0 = reads?.[2]?.result as bigint | undefined;
  const allowance1 = reads?.[3]?.result as bigint | undefined;

  const amount0Parsed = useMemo(() => { try { return parseUnits(amount0 || "0", dec0); } catch { return 0n; } }, [amount0, dec0]);
  const amount1Parsed = useMemo(() => { try { return parseUnits(amount1 || "0", dec1); } catch { return 0n; } }, [amount1, dec1]);

  const needApprove0 = amount0Parsed > 0n && (allowance0 ?? 0n) < amount0Parsed;
  const needApprove1 = amount1Parsed > 0n && (allowance1 ?? 0n) < amount1Parsed;

  const { tickLower, tickUpper } = useMemo(() => {
    if (preset === "full" || (isNewPool && !priceLow && !priceHigh)) {
      return {
        tickLower: clampTick(roundTickDown(-MAX_TICK, ts), ts),
        tickUpper: clampTick(roundTickUp(MAX_TICK, ts), ts),
      };
    }
    const low = parseFloat(priceLow);
    const high = parseFloat(priceHigh);
    if (!isFinite(low) || !isFinite(high) || low <= 0 || high <= low) {
      return {
        tickLower: clampTick(roundTickDown(-MAX_TICK, ts), ts),
        tickUpper: clampTick(roundTickUp(MAX_TICK, ts), ts),
      };
    }
    return {
      tickLower: clampTick(roundTickDown(priceAtomicToTick(humanPriceToAtomic(low, dec0, dec1)), ts), ts),
      tickUpper: clampTick(roundTickUp(priceAtomicToTick(humanPriceToAtomic(high, dec0, dec1)), ts), ts),
    };
  }, [preset, priceLow, priceHigh, ts, dec0, dec1, isNewPool]);

  const initSqrtPriceX96 = useMemo(() => {
    if (!isNewPool) return 0n;
    const p = parseFloat(initialPrice);
    if (!isFinite(p) || p <= 0) return 0n;
    return humanPriceToSqrtX96(p, dec0, dec1);
  }, [isNewPool, initialPrice, dec0, dec1]);

  const { writeContract, data: txHash, isPending, reset: resetWrite, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isConfirmed || !txType) return;
    if (txType === "approve0") toast({ title: `${sym0} approved` });
    else if (txType === "approve1") toast({ title: `${sym1} approved` });
    else {
      toast({ title: isNewPool ? "Pool created & deposit successful!" : "Deposit successful!", description: "CL position created." });
      setAmount0(""); setAmount1("");
    }
    refetchReads();
    setTxType(null);
    resetWrite();
  }, [isConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!writeError) return;
    const msg = (writeError as { shortMessage?: string })?.shortMessage ?? writeError.message;
    toast({ title: msg?.includes("User rejected") ? "Transaction rejected" : "Transaction failed", description: msg?.includes("User rejected") ? undefined : msg });
    setTxType(null);
    resetWrite();
  }, [writeError]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleApprove(which: 0 | 1) {
    if (!spender || !publicClient || !walletAddress) return;
    const addr = which === 0 ? t0Addr : t1Addr;
    const amount = which === 0 ? amount0Parsed : amount1Parsed;
    const sym = which === 0 ? sym0 : sym1;
    try { await publicClient.simulateContract({ address: addr, abi: ABIS.ERC20, functionName: "approve", args: [spender, amount], account: walletAddress }); }
    catch (err) { toast({ title: "Approval would fail", description: getSimError(err) }); return; }
    setTxType(which === 0 ? "approve0" : "approve1");
    toast({ title: `Approving ${sym}…` });
    writeContract({ address: addr, abi: ABIS.ERC20, functionName: "approve", args: [spender, amount] });
  }

  async function handleDeposit() {
    if (!addresses || !walletAddress || !publicClient) return;
    if (isNewPool && initSqrtPriceX96 === 0n) {
      toast({ title: "Set initial price", description: "Enter an initial price to create this pool." }); return;
    }
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
    const min0 = (amount0Parsed * 97n) / 100n;
    const min1 = (amount1Parsed * 97n) / 100n;
    const mintParams = {
      token0: t0Addr, token1: t1Addr, tickSpacing: ts,
      tickLower, tickUpper,
      amount0Desired: amount0Parsed, amount1Desired: amount1Parsed,
      amount0Min: min0, amount1Min: min1,
      recipient: walletAddress, deadline,
      sqrtPriceX96: isNewPool ? initSqrtPriceX96 : 0n,
    };
    try { await publicClient.simulateContract({ address: addresses.positionManager, abi: ABIS.NonfungiblePositionManager, functionName: "mint", args: [mintParams], account: walletAddress }); }
    catch (err) { toast({ title: "Deposit would fail", description: getSimError(err) }); return; }
    setTxType("deposit");
    toast({ title: isNewPool ? "Creating pool & depositing…" : "Submitting deposit…" });
    writeContract({ address: addresses.positionManager, abi: ABIS.NonfungiblePositionManager, functionName: "mint", args: [mintParams] });
  }

  const isBusy = isPending || isConfirming;
  const noAmounts = amount0Parsed === 0n && amount1Parsed === 0n;
  const PRESETS: { label: string; value: RangePreset }[] = [
    { label: "Full", value: "full" },
    { label: "±10%", value: "10" },
    { label: "±20%", value: "20" },
    { label: "±30%", value: "30" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <TokenLogo url={logo0} symbol={sym0} size={28} />
            <TokenLogo url={logo1} symbol={sym1} size={28} />
          </div>
          <div>
            <div className="font-semibold text-sm">{sym0} / {sym1}</div>
            <div className="text-xs text-[#f7931a]">
              {isNewPool ? "New Concentrated Pool" : `${pool?.poolType} · ${pool?.fee}`}
            </div>
          </div>
        </div>
      </div>

      {isNewPool && (
        <div className="bg-[#f7931a]/10 border border-[#f7931a]/20 rounded-xl px-4 py-3 text-xs text-[#f7931a]">
          This pool does not exist yet. Setting an initial price will create it alongside your first deposit.
        </div>
      )}

      {/* Initial price (new pools only) */}
      {isNewPool && (
        <div className="bg-[#0a1612] rounded-xl border border-white/5 p-5 space-y-3">
          <div className="text-sm font-semibold">Initial price</div>
          <div className="bg-[#1a2f2a] rounded-xl px-4 py-3 flex items-center gap-3">
            <input
              type="text"
              inputMode="decimal"
              value={initialPrice}
              onChange={(e) => { if (/^\d*\.?\d*$/.test(e.target.value)) setInitialPrice(e.target.value); }}
              placeholder="0.0"
              className="flex-1 bg-transparent text-lg font-medium text-white placeholder-white/30 outline-none"
            />
            <span className="text-xs text-white/40 shrink-0">{sym1} per {sym0}</span>
          </div>
        </div>
      )}

      {/* Price range */}
      <div className="bg-[#0a1612] rounded-xl border border-white/5 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Price range</div>
          {currentPrice !== null && (
            <div className="text-xs text-white/40">
              Current: <span className="text-white/70">{currentPrice.toPrecision(6)}</span> {sym1}/{sym0}
            </div>
          )}
        </div>

        {!isNewPool && (
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPreset(p.value)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${preset === p.value ? "bg-[#f7931a] text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {(isNewPool || preset !== "full") && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Min price", val: priceLow, set: setPriceLow },
              { label: "Max price", val: priceHigh, set: setPriceHigh },
            ].map(({ label, val, set }) => (
              <div key={label} className="space-y-1">
                <div className="text-xs text-white/40">{label}</div>
                <div className="bg-[#1a2f2a] rounded-xl px-4 py-3">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={val}
                    onChange={(e) => {
                      if (/^\d*\.?\d*$/.test(e.target.value)) {
                        if (!isNewPool) setPreset("custom");
                        set(e.target.value);
                      }
                    }}
                    placeholder={label === "Max price" ? "∞" : "0.0"}
                    className="w-full bg-transparent text-sm font-medium text-white placeholder-white/30 outline-none"
                  />
                  <div className="text-[10px] text-white/30 mt-0.5">{sym1} per {sym0}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isNewPool && preset === "full" && (
          <div className="rounded-xl bg-[#f7931a]/10 border border-[#f7931a]/20 px-4 py-2.5 text-xs text-[#f7931a]">
            Full range — earns fees at all prices with maximum impermanent loss exposure.
          </div>
        )}

        <div className="text-xs text-white/25 flex justify-between">
          <span>Tick range</span>
          <span>{tickLower} → {tickUpper}</span>
        </div>
      </div>

      {/* Amounts */}
      <div className="bg-[#0a1612] rounded-xl border border-white/5 p-5 space-y-4">
        <div className="text-sm font-semibold">Deposit amounts</div>
        {[
          { sym: sym0, logo: logo0, dec: dec0, bal: balance0Raw, val: amount0, set: setAmount0 },
          { sym: sym1, logo: logo1, dec: dec1, bal: balance1Raw, val: amount1, set: setAmount1 },
        ].map(({ sym, logo, dec, bal, val, set }) => (
          <div key={sym} className="space-y-1.5">
            <div className="flex justify-between text-xs text-white/50">
              <span>Amount</span>
              <span>Balance: {fmtNum(bal, dec)} {sym}</span>
            </div>
            <div className="bg-[#1a2f2a] rounded-xl p-4 flex items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <TokenLogo url={logo} symbol={sym} size={24} />
                <span className="font-medium text-sm">{sym}</span>
              </div>
              <input
                type="text" inputMode="decimal" value={val} placeholder="0.0"
                onChange={(e) => { if (/^\d*\.?\d*$/.test(e.target.value)) set(e.target.value); }}
                className="flex-1 bg-transparent text-right text-xl font-medium text-white placeholder-white/30 outline-none"
              />
            </div>
          </div>
        ))}
        <ActionBtn
          isConnected={isConnected} chainId={chainId} noAmounts={noAmounts} isBusy={isBusy} txType={txType}
          needApprove0={needApprove0} needApprove1={needApprove1} sym0={sym0} sym1={sym1}
          onApprove0={() => handleApprove(0)} onApprove1={() => handleApprove(1)} onDeposit={handleDeposit}
          depositLabel={isNewPool ? "Create pool & deposit" : "Deposit"}
        />
      </div>
    </div>
  );
}

// ── Basic Deposit Form ────────────────────────────────────────────────────────

function BasicDepositForm({
  pool,
  token0,
  token1,
  isStable,
  isNewPool,
  onBack,
}: {
  pool?: PoolInfo;
  token0: TokenInfo;
  token1: TokenInfo;
  isStable: boolean;
  isNewPool?: boolean;
  onBack: () => void;
}) {
  const { address: walletAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { toast } = useToast();
  const addresses = ADDRESSES[CHAIN_ID];

  const t0Addr = (pool?.token0.address ?? token0.address) as Address;
  const t1Addr = (pool?.token1.address ?? token1.address) as Address;
  const dec0 = pool?.token0.decimals ?? token0.decimals;
  const dec1 = pool?.token1.decimals ?? token1.decimals;
  const sym0 = pool?.token0.symbol ?? token0.symbol;
  const sym1 = pool?.token1.symbol ?? token1.symbol;
  const logo0 = pool?.token0.logoUrl ?? token0.logoUrl;
  const logo1 = pool?.token1.logoUrl ?? token1.logoUrl;

  const isWMON0 = t0Addr.toLowerCase() === MONAD_CONTRACTS.WMON.toLowerCase();
  const isWMON1 = t1Addr.toLowerCase() === MONAD_CONTRACTS.WMON.toLowerCase();

  const ratio = !isNewPool && pool && pool.reserve0Num > 0
    ? pool.reserve1Num / pool.reserve0Num
    : null;

  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [ratioLocked, setRatioLocked] = useState(!isNewPool);
  const [useNative0, setUseNative0] = useState(false);
  const [useNative1, setUseNative1] = useState(false);
  const [txType, setTxType] = useState<TxType | null>(null);

  function handleAmt0(v: string) {
    setAmount0(v);
    if (ratioLocked && ratio !== null && v !== "") {
      const n = parseFloat(v);
      if (isFinite(n)) setAmount1((n * ratio).toFixed(Math.min(dec1, 8)));
    }
  }
  function handleAmt1(v: string) {
    setAmount1(v);
    if (ratioLocked && ratio !== null && v !== "" && ratio > 0) {
      const n = parseFloat(v);
      if (isFinite(n)) setAmount0((n / ratio).toFixed(Math.min(dec0, 8)));
    }
  }

  const spender = addresses?.router as Address | undefined;
  const { data: nativeBal } = useBalance({ address: walletAddress });

  const { data: reads, refetch: refetchReads } = useReadContracts({
    contracts: [
      { address: t0Addr, abi: ABIS.ERC20, functionName: "balanceOf", args: [walletAddress ?? zeroAddress] },
      { address: t1Addr, abi: ABIS.ERC20, functionName: "balanceOf", args: [walletAddress ?? zeroAddress] },
      { address: t0Addr, abi: ABIS.ERC20, functionName: "allowance", args: [walletAddress ?? zeroAddress, spender ?? zeroAddress] },
      { address: t1Addr, abi: ABIS.ERC20, functionName: "allowance", args: [walletAddress ?? zeroAddress, spender ?? zeroAddress] },
    ],
    query: { enabled: !!walletAddress && !!spender },
  });

  const balance0Raw = reads?.[0]?.result as bigint | undefined;
  const balance1Raw = reads?.[1]?.result as bigint | undefined;
  const allowance0 = reads?.[2]?.result as bigint | undefined;
  const allowance1 = reads?.[3]?.result as bigint | undefined;

  const amount0Parsed = useMemo(() => { try { return parseUnits(amount0 || "0", dec0); } catch { return 0n; } }, [amount0, dec0]);
  const amount1Parsed = useMemo(() => { try { return parseUnits(amount1 || "0", dec1); } catch { return 0n; } }, [amount1, dec1]);

  const needApprove0 = useMemo(() => {
    if (amount0Parsed === 0n || (useNative0 && isWMON0)) return false;
    return (allowance0 ?? 0n) < amount0Parsed;
  }, [amount0Parsed, allowance0, useNative0, isWMON0]);

  const needApprove1 = useMemo(() => {
    if (amount1Parsed === 0n || (useNative1 && isWMON1)) return false;
    return (allowance1 ?? 0n) < amount1Parsed;
  }, [amount1Parsed, allowance1, useNative1, isWMON1]);

  const { writeContract, data: txHash, isPending, reset: resetWrite, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isConfirmed || !txType) return;
    if (txType === "approve0") toast({ title: `${sym0} approved` });
    else if (txType === "approve1") toast({ title: `${sym1} approved` });
    else {
      toast({ title: isNewPool ? "Pool created & deposit successful!" : "Deposit successful!", description: "Liquidity added to the pool." });
      setAmount0(""); setAmount1("");
    }
    refetchReads();
    setTxType(null);
    resetWrite();
  }, [isConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!writeError) return;
    const msg = (writeError as { shortMessage?: string })?.shortMessage ?? writeError.message;
    toast({ title: msg?.includes("User rejected") ? "Transaction rejected" : "Transaction failed", description: msg?.includes("User rejected") ? undefined : msg });
    setTxType(null);
    resetWrite();
  }, [writeError]); // eslint-disable-line react-hooks/exhaustive-deps

  function fmtBal(raw: bigint | undefined, dec: number, useNative: boolean, isWMON: boolean) {
    if (useNative && isWMON && nativeBal) return Number(formatUnits(nativeBal.value, 18)).toLocaleString("en-US", { maximumFractionDigits: 6 });
    return fmtNum(raw, dec);
  }

  async function handleApprove(which: 0 | 1) {
    if (!spender || !publicClient || !walletAddress) return;
    const addr = which === 0 ? t0Addr : t1Addr;
    const amount = which === 0 ? amount0Parsed : amount1Parsed;
    const sym = which === 0 ? sym0 : sym1;
    try { await publicClient.simulateContract({ address: addr, abi: ABIS.ERC20, functionName: "approve", args: [spender, amount], account: walletAddress }); }
    catch (err) { toast({ title: "Approval would fail", description: getSimError(err) }); return; }
    setTxType(which === 0 ? "approve0" : "approve1");
    toast({ title: `Approving ${sym}…` });
    writeContract({ address: addr, abi: ABIS.ERC20, functionName: "approve", args: [spender, amount] });
  }

  async function handleDeposit() {
    if (!addresses || !walletAddress || !publicClient) return;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
    const min0 = (amount0Parsed * 97n) / 100n;
    const min1 = (amount1Parsed * 97n) / 100n;
    const useETH0 = useNative0 && isWMON0;
    const useETH1 = useNative1 && isWMON1;

    if (useETH0 || useETH1) {
      const token = useETH0 ? t1Addr : t0Addr;
      const amtTok = useETH0 ? amount1Parsed : amount0Parsed;
      const minTok = useETH0 ? min1 : min0;
      const amtETH = useETH0 ? amount0Parsed : amount1Parsed;
      const minETH = useETH0 ? min0 : min1;
      try { await publicClient.simulateContract({ address: addresses.router, abi: ABIS.Router, functionName: "addLiquidityETH", args: [token, isStable, amtTok, minTok, minETH, walletAddress, deadline], value: amtETH, account: walletAddress }); }
      catch (err) { toast({ title: "Deposit would fail", description: getSimError(err) }); return; }
      setTxType("deposit");
      toast({ title: isNewPool ? "Creating pool & depositing…" : "Submitting deposit…" });
      writeContract({ address: addresses.router, abi: ABIS.Router, functionName: "addLiquidityETH", args: [token, isStable, amtTok, minTok, minETH, walletAddress, deadline], value: amtETH });
    } else {
      try { await publicClient.simulateContract({ address: addresses.router, abi: ABIS.Router, functionName: "addLiquidity", args: [t0Addr, t1Addr, isStable, amount0Parsed, amount1Parsed, min0, min1, walletAddress, deadline], account: walletAddress }); }
      catch (err) { toast({ title: "Deposit would fail", description: getSimError(err) }); return; }
      setTxType("deposit");
      toast({ title: isNewPool ? "Creating pool & depositing…" : "Submitting deposit…" });
      writeContract({ address: addresses.router, abi: ABIS.Router, functionName: "addLiquidity", args: [t0Addr, t1Addr, isStable, amount0Parsed, amount1Parsed, min0, min1, walletAddress, deadline] });
    }
  }

  const isBusy = isPending || isConfirming;
  const noAmounts = amount0Parsed === 0n && amount1Parsed === 0n;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <TokenLogo url={logo0} symbol={sym0} size={28} />
            <TokenLogo url={logo1} symbol={sym1} size={28} />
          </div>
          <div>
            <div className="font-semibold text-sm">{sym0} / {sym1}</div>
            <div className="text-xs text-[#f7931a]">
              {isNewPool ? `New ${isStable ? "Basic Stable" : "Basic Volatile"} Pool` : `${pool?.poolType} · ${pool?.fee}`}
            </div>
          </div>
        </div>
      </div>

      {isNewPool && (
        <div className="bg-[#f7931a]/10 border border-[#f7931a]/20 rounded-xl px-4 py-3 text-xs text-[#f7931a]">
          This pool does not exist yet. It will be created automatically when you make your first deposit.
        </div>
      )}

      {/* Ratio info */}
      {ratio !== null && (
        <div className="bg-[#0a1612] rounded-xl border border-white/5 p-4 flex items-center justify-between">
          <div className="text-xs text-white/50">
            Pool ratio: <span className="text-white/80">{ratio.toFixed(6)} {sym1} per {sym0}</span>
          </div>
          <button
            onClick={() => setRatioLocked((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${ratioLocked ? "bg-[#f7931a]/20 text-[#f7931a]" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
          >
            {ratioLocked ? <Link2 className="w-3.5 h-3.5" /> : <Link2Off className="w-3.5 h-3.5" />}
            {ratioLocked ? "Ratio locked" : "Ratio unlocked"}
          </button>
        </div>
      )}

      {/* Amounts */}
      <div className="bg-[#0a1612] rounded-xl border border-white/5 p-5 space-y-4">
        <div className="text-sm font-semibold">Deposit amounts</div>

        {[
          { sym: sym0, logo: logo0, dec: dec0, bal: balance0Raw, val: amount0, isWMON: isWMON0, useNative: useNative0, setUseNative: setUseNative0, handleChange: handleAmt0, locked: ratioLocked && ratio !== null && false },
          { sym: sym1, logo: logo1, dec: dec1, bal: balance1Raw, val: amount1, isWMON: isWMON1, useNative: useNative1, setUseNative: setUseNative1, handleChange: handleAmt1, locked: ratioLocked && ratio !== null },
        ].map(({ sym, logo, dec, bal, val, isWMON, useNative, setUseNative, handleChange, locked }) => (
          <div key={sym} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-white/50">
              <div className="flex items-center gap-2">
                <span>Amount</span>
                {isWMON && (
                  <button
                    onClick={() => setUseNative((v) => !v)}
                    className={`px-2 py-0.5 rounded font-medium transition-colors ${useNative ? "bg-[#f7931a] text-white" : "bg-[#f7931a]/20 text-[#f7931a]"}`}
                  >
                    NATIVE
                  </button>
                )}
              </div>
              <span>Balance: {fmtBal(bal, dec, useNative, isWMON)} {useNative && isWMON ? "MON" : sym}</span>
            </div>
            <div className={`bg-[#1a2f2a] rounded-xl p-4 flex items-center gap-3 ${locked ? "opacity-70" : ""}`}>
              <div className="flex items-center gap-2 shrink-0">
                <TokenLogo url={logo} symbol={sym} size={24} />
                <span className="font-medium text-sm">{useNative && isWMON ? "MON" : sym}</span>
              </div>
              <input
                type="text" inputMode="decimal" value={val} placeholder="0.0"
                readOnly={locked}
                onChange={(e) => { if (!locked && /^\d*\.?\d*$/.test(e.target.value)) handleChange(e.target.value); }}
                className={`flex-1 bg-transparent text-right text-xl font-medium text-white placeholder-white/30 outline-none ${locked ? "cursor-default" : ""}`}
              />
            </div>
          </div>
        ))}

        <ActionBtn
          isConnected={isConnected} chainId={chainId} noAmounts={noAmounts} isBusy={isBusy} txType={txType}
          needApprove0={needApprove0} needApprove1={needApprove1} sym0={sym0} sym1={sym1}
          onApprove0={() => handleApprove(0)} onApprove1={() => handleApprove(1)} onDeposit={handleDeposit}
          depositLabel={isNewPool ? "Create pool & deposit" : "Deposit"}
        />
      </div>
    </div>
  );
}

// ── New pool type selector ────────────────────────────────────────────────────

type NewPoolType = "basic-volatile" | "basic-stable" | "cl-1" | "cl-60" | "cl-200";

function CreatePoolSelector({
  tokenA,
  tokenB,
  onSelect,
  onBack,
}: {
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  onSelect: (t: NewPoolType) => void;
  onBack: () => void;
}) {
  const options: { type: NewPoolType; label: string; sub: string }[] = [
    { type: "basic-volatile", label: "Basic Volatile", sub: "Best for uncorrelated pairs (MON/USDC). 0.30% fee." },
    { type: "basic-stable", label: "Basic Stable", sub: "Best for pegged pairs (USDC/USDT). 0.01% fee." },
    { type: "cl-60", label: "Concentrated · Tick 60", sub: "Standard CL pool. Narrow range earns more fees." },
    { type: "cl-200", label: "Concentrated · Tick 200", sub: "Wide CL pool. Lower sensitivity, easier management." },
    { type: "cl-1", label: "Concentrated · Tick 1", sub: "Stable CL pool for tightly pegged assets." },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="font-semibold">Choose pool type</div>
          <div className="text-xs text-white/40">{tokenA.symbol} / {tokenB.symbol}</div>
        </div>
      </div>

      <div className="bg-[#f7931a]/10 border border-[#f7931a]/20 rounded-xl px-4 py-3 text-xs text-[#f7931a]">
        No pool exists for this pair yet. Choose a type to create one and make the first deposit.
      </div>

      <div className="space-y-2">
        {options.map(({ type, label, sub }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="w-full bg-[#0a1612] rounded-xl border border-white/5 p-4 hover:border-[#f7931a]/30 hover:bg-[#0f1e19] transition-all text-left flex items-center justify-between gap-3"
          >
            <div>
              <div className="font-semibold text-sm">{label}</div>
              <div className="text-xs text-white/40 mt-0.5">{sub}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#f7931a] shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type PoolTypeFilter = "all" | "concentrated" | "basic";
type ViewState =
  | { kind: "list" }
  | { kind: "create-select" }
  | { kind: "deposit"; pool: PoolInfo }
  | { kind: "new-pool"; poolType: NewPoolType };

export default function AdvancedLaunchPage() {
  const { pools, loading, error } = usePools();

  const [tokenA, setTokenA] = useState<TokenInfo | null>(null);
  const [tokenB, setTokenB] = useState<TokenInfo | null>(null);
  const [filter, setFilter] = useState<PoolTypeFilter>("all");
  const [view, setView] = useState<ViewState>({ kind: "list" });

  const WMON = MONAD_CONTRACTS.WMON.toLowerCase();

  const filteredPools = useMemo(() => {
    return pools.filter((p) => {
      if (filter === "concentrated" && !p.isCL) return false;
      if (filter === "basic" && p.isCL) return false;

      const addrA = tokenA ? (tokenA.address?.toLowerCase() ?? WMON) : null;
      const addrB = tokenB ? (tokenB.address?.toLowerCase() ?? WMON) : null;
      const p0 = p.token0.address.toLowerCase();
      const p1 = p.token1.address.toLowerCase();

      if (addrA && addrB) return [p0, p1].includes(addrA) && [p0, p1].includes(addrB);
      if (addrA) return p0 === addrA || p1 === addrA;
      if (addrB) return p0 === addrB || p1 === addrB;
      return true;
    });
  }, [pools, tokenA, tokenB, filter, WMON]);

  // "Create new pool" is offered when both tokens are selected and no pools match
  const canCreate = !!tokenA && !!tokenB && !loading && filteredPools.length === 0;

  const FILTER_TABS: { label: string; value: PoolTypeFilter }[] = [
    { label: "All", value: "all" },
    { label: "Concentrated", value: "concentrated" },
    { label: "Basic", value: "basic" },
  ];

  // Decode selected new pool type
  function renderNewPool(poolType: NewPoolType) {
    const tA = tokenA!;
    const tB = tokenB!;
    if (poolType === "basic-volatile" || poolType === "basic-stable") {
      return (
        <BasicDepositForm
          token0={tA} token1={tB}
          isStable={poolType === "basic-stable"} isNewPool
          onBack={() => setView({ kind: "create-select" })}
        />
      );
    }
    const tickMap: Record<string, number> = { "cl-1": 1, "cl-60": 60, "cl-200": 200 };
    const ts = tickMap[poolType] ?? 60;
    // Create a synthetic PoolInfo shell for the CL form
    const fakeCLPool: PoolInfo = {
      id: "new", poolAddress: zeroAddress, name: "", isStable: false, isCL: true,
      poolType: `New CL (tick ${ts})`, fee: ts === 1 ? "0.01%" : ts === 60 ? "0.30%" : "1.00%",
      token0: { symbol: tA.symbol, logoUrl: tA.logoUrl, address: tA.address ?? zeroAddress, decimals: tA.decimals, priceUSD: 0, verified: true },
      token1: { symbol: tB.symbol, logoUrl: tB.logoUrl, address: tB.address ?? zeroAddress, decimals: tB.decimals, priceUSD: 0, verified: true },
      tvlUSD: 0, tvl: "-", volumeUSD: 0, volume: "-",
      volume0Human: "-", volume1Human: "-", feesUSD: 0, fees: "-",
      fees0Human: "-", fees1Human: "-", emissionsUSD: 0, emissions: "-",
      reserve0Human: "-", reserve1Human: "-", reserve0Num: 0, reserve1Num: 0,
      numberOfSwaps: 0, gaugeIsAlive: false, tickSpacing: ts, verified: true,
    };
    return (
      <CLDepositForm
        pool={fakeCLPool} token0={tA} token1={tB} isNewPool
        onBack={() => setView({ kind: "create-select" })}
      />
    );
  }

  return (
    <main
      className="min-h-screen text-white flex flex-col"
      style={{ background: "linear-gradient(135deg, #0a1612 0%, #0d2820 25%, #0d3d2e 50%, #15713a 100%)" }}
    >
      <Header />

      <div className="flex-1 px-4 py-8 sm:px-6 md:px-12">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* ── List / filter view ── */}
          {view.kind === "list" && (
            <>
              <div className="flex items-center gap-3">
                <Link
                  href="/liquidity/launch"
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">Advanced deposit</h1>
                  <HelpCircle className="w-4 h-4 text-white/30" />
                </div>
              </div>

              {/* Filter card — high z-index so dropdowns escape pool rows */}
              <div className="relative z-20 bg-[#0a1612]/90 rounded-xl border border-white/5 p-4 space-y-4">
                <div className="text-sm font-semibold text-white/70">Filter by tokens</div>
                <div className="grid grid-cols-2 gap-3">
                  <TokenPicker value={tokenA} onSelect={setTokenA} label="Token A (optional)" exclude={tokenB?.id} />
                  <TokenPicker value={tokenB} onSelect={setTokenB} label="Token B (optional)" exclude={tokenA?.id} />
                </div>
                <div className="flex gap-2">
                  {FILTER_TABS.map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => setFilter(tab.value)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${filter === tab.value ? "bg-[#f7931a] text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pool list — lower z */}
              <div className="relative z-0 space-y-2">
                {loading ? (
                  <div className="text-center py-16 flex flex-col items-center gap-3 text-white/40">
                    <Loader2 className="w-6 h-6 animate-spin text-[#f7931a]" />
                    <span>Loading pools…</span>
                  </div>
                ) : error ? (
                  <div className="text-center py-16 text-red-400">{error}</div>
                ) : filteredPools.length === 0 ? (
                  <div className="text-center py-10 space-y-4">
                    <p className="text-white/40 text-sm">
                      {tokenA && tokenB ? `No ${filter === "all" ? "" : filter + " "}pools found for ${tokenA.symbol} / ${tokenB.symbol}.` : "No pools match your filter."}
                    </p>
                    {canCreate && (
                      <button
                        onClick={() => setView({ kind: "create-select" })}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#f7931a] hover:bg-[#ff9f2a] text-white text-sm font-semibold transition-colors shadow-lg shadow-[#f7931a]/25"
                      >
                        <Plus className="w-4 h-4" />
                        Create new pool
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {filteredPools.map((pool) => (
                      <PoolRow
                        key={pool.id}
                        pool={pool}
                        onSelect={() => setView({ kind: "deposit", pool })}
                      />
                    ))}
                    {/* Always offer create when both tokens are picked */}
                    {tokenA && tokenB && (
                      <button
                        onClick={() => setView({ kind: "create-select" })}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/10 text-white/40 hover:border-[#f7931a]/40 hover:text-[#f7931a] text-sm font-medium transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Create a new {tokenA.symbol} / {tokenB.symbol} pool
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* ── Choose new pool type ── */}
          {view.kind === "create-select" && tokenA && tokenB && (
            <CreatePoolSelector
              tokenA={tokenA}
              tokenB={tokenB}
              onSelect={(t) => setView({ kind: "new-pool", poolType: t })}
              onBack={() => setView({ kind: "list" })}
            />
          )}

          {/* ── Deposit into existing pool ── */}
          {view.kind === "deposit" && (
            view.pool.isCL ? (
              <CLDepositForm
                pool={view.pool}
                token0={tokenA ?? TOKEN_LIST[0]}
                token1={tokenB ?? TOKEN_LIST[1]}
                onBack={() => setView({ kind: "list" })}
              />
            ) : (
              <BasicDepositForm
                pool={view.pool}
                token0={tokenA ?? TOKEN_LIST[0]}
                token1={tokenB ?? TOKEN_LIST[1]}
                isStable={view.pool.isStable}
                onBack={() => setView({ kind: "list" })}
              />
            )
          )}

          {/* ── Create new pool ── */}
          {view.kind === "new-pool" && tokenA && tokenB && renderNewPool(view.poolType)}
        </div>
      </div>

      <Footer />
    </main>
  );
}
