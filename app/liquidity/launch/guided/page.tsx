"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  HelpCircle,
  X,
  Check,
  Loader2,
  Pencil,
} from "lucide-react";
import {
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useBalance,
  useChainId,
  usePublicClient,
} from "wagmi";
import { parseUnits, formatUnits, type Address, zeroAddress } from "viem";
import { ADDRESSES, ABIS, MONAD_CONTRACTS } from "@/lib/contracts";
import { TOKEN_LIST, type TokenInfo } from "@/lib/token-list";
import { usePools } from "@/hooks/use-pools";
import { useToast } from "@/hooks/use-toast";

const CHAIN_ID = 143;

const CL_TICK_SPACING = 200;
const MAX_TICK = 887272;

const POOL_TYPES = [
  {
    id: "cl-single",
    name: "Concentrated: Single-Sided",
    description: "Provide liquidity using only one token",
    isStable: false,
    isCL: true,
  },
  {
    id: "cl-dual",
    name: "Concentrated: Dual-Sided",
    description: "Provide both tokens in the pair",
    isStable: false,
    isCL: true,
  },
  {
    id: "basic-volatile",
    name: "Basic Volatile",
    description: "Ideal for most token launches",
    isStable: false,
    isCL: false,
  },
];

// ─── CL math helpers ─────────────────────────────────────────────────────────

const Q96 = 2n ** 96n;

/** Convert human price (pairingPerSearched) → sqrtPriceX96 for the pool. */
function humanToSqrtPriceX96(
  humanPrice: number,
  isToken0: boolean,
  dec0: number,
  dec1: number
): bigint {
  // rawPrice = token1/token0 in contract units
  const rawPrice = isToken0
    ? humanPrice * Math.pow(10, dec1 - dec0)
    : (1 / humanPrice) * Math.pow(10, dec0 - dec1);
  if (!isFinite(rawPrice) || rawPrice <= 0) return 0n;
  const sqrtRaw = Math.sqrt(rawPrice);
  const SCALE = 10n ** 15n;
  const sqrtScaled = BigInt(Math.round(sqrtRaw * Number(SCALE)));
  return (sqrtScaled * Q96) / SCALE;
}

/** Convert human price → pool tick. */
function humanToTick(
  humanPrice: number,
  isToken0: boolean,
  dec0: number,
  dec1: number
): number {
  const rawPrice = isToken0
    ? humanPrice * Math.pow(10, dec1 - dec0)
    : (1 / humanPrice) * Math.pow(10, dec0 - dec1);
  if (!isFinite(rawPrice) || rawPrice <= 0) return -MAX_TICK;
  return Math.floor(Math.log(rawPrice) / Math.log(1.0001));
}

function alignTickDown(tick: number, spacing: number): number {
  return Math.floor(tick / spacing) * spacing;
}
function alignTickUp(tick: number, spacing: number): number {
  return Math.ceil(tick / spacing) * spacing;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TokenLogo({
  url,
  symbol,
  size = 40,
}: {
  url: string;
  symbol: string;
  size?: number;
}) {
  const [err, setErr] = useState(false);
  if (!url || err) {
    return (
      <div
        className="rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold text-sm shrink-0"
        style={{ width: size, height: size }}
      >
        {symbol.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <Image
      src={url}
      alt={symbol}
      width={size}
      height={size}
      className="rounded-full shrink-0"
      onError={() => setErr(true)}
    />
  );
}

function compactNum(n: number, prefix = "") {
  if (!isFinite(n) || n === 0) return "-";
  if (n >= 1e12) return `${prefix}${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${prefix}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${prefix}${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3)
    return `${prefix}${n.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    })}`;
  return `${prefix}${n.toLocaleString("en-US", { maximumFractionDigits: 6 })}`;
}

// Minimal ABI just for totalSupply
const TOTAL_SUPPLY_ABI = [
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

// ─── Pool header card (shown in steps 2–4) ──────────────────────────────────

function PoolHeader({
  searched,
  pairing,
  poolTypeName,
  fee,
  onChange,
}: {
  searched: TokenInfo;
  pairing: TokenInfo;
  poolTypeName: string;
  fee: string;
  onChange: () => void;
}) {
  return (
    <div className="bg-[#0a1612] rounded-2xl border border-white/10 p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex -space-x-2 shrink-0">
          <TokenLogo
            url={searched.logoUrl}
            symbol={searched.symbol}
            size={32}
          />
          <TokenLogo url={pairing.logoUrl} symbol={pairing.symbol} size={32} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">
              {searched.symbol} / {pairing.symbol}
            </span>
            <span className="text-xs text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
              {fee}
            </span>
          </div>
          <div className="text-xs text-[#f7931a]">{poolTypeName}</div>
        </div>
      </div>
      <button
        onClick={onChange}
        className="shrink-0 px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10 transition-colors"
      >
        Change
      </button>
    </div>
  );
}

// ─── Confirmed row (compact summary of a prior step) ──────────────────────────

function ConfirmedRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="bg-[#0a1612] rounded-2xl border border-white/10 px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-[#f7931a] flex items-center justify-center shrink-0">
          <Check className="w-3 h-3 text-white" />
        </div>
        <span className="text-sm font-medium text-white/80">{label}</span>
      </div>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs text-white/50 truncate">{value}</span>
        <button
          onClick={onEdit}
          className="shrink-0 px-2.5 py-1 rounded-lg bg-white/5 text-white/60 text-xs hover:bg-white/10 transition-colors"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

// ─── Stat row ────────────────────────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <span className="text-sm text-white/50">{label}</span>
      <span className="text-sm text-white font-medium">{value}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Step = "selection" | "price" | "amount" | "review";
type LockOption = "forever" | "6months" | "none";
type PoolType = (typeof POOL_TYPES)[number];

export default function GuidedLaunchPage() {
  const { address: walletAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { toast } = useToast();
  const { pools, discoveredTokens } = usePools();
  const addresses = ADDRESSES[CHAIN_ID];

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("selection");

  // ── Selection state ─────────────────────────────────────────────────────────
  const [searchAddress, setSearchAddress] = useState("");
  const [searchedToken, setSearchedToken] = useState<TokenInfo | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedPairing, setSelectedPairing] = useState<TokenInfo>(
    TOKEN_LIST.find((t) => t.symbol === "WMON") ?? TOKEN_LIST[1]
  );
  const [selectedPoolType, setSelectedPoolType] = useState<PoolType>(
    POOL_TYPES[0]
  );

  // ── Price state ─────────────────────────────────────────────────────────────
  const [tokenPrice, setTokenPrice] = useState(""); // pairing per 1 searched

  // ── CL price-range state ─────────────────────────────────────────────────
  const [rangeType, setRangeType] = useState<"full" | "custom">("full");
  const [maxPrice, setMaxPrice] = useState(""); // custom range max (pairingPerSearched)

  // ── Amount state ────────────────────────────────────────────────────────────
  const [amount0, setAmount0] = useState(""); // searched token
  const [useNative, setUseNative] = useState(false); // use MON instead of WMON for pairing

  // ── Lock state ──────────────────────────────────────────────────────────────
  const [lockOption, setLockOption] = useState<LockOption>("6months");

  // ── Tx state ────────────────────────────────────────────────────────────────
  const [txType, setTxType] = useState<
    "approve0" | "approve1" | "create" | null
  >(null);

  // ── Computed amounts ────────────────────────────────────────────────────────
  const dec0 = searchedToken?.decimals ?? 18;
  const dec1 = selectedPairing?.decimals ?? 18;

  const priceNum = parseFloat(tokenPrice) || 0;
  const amount0Num = parseFloat(amount0) || 0;
  const amount1Num = amount0Num * priceNum;

  const amount0Parsed = useMemo(() => {
    try {
      return parseUnits(amount0 || "0", dec0);
    } catch {
      return 0n;
    }
  }, [amount0, dec0]);

  // Compute amount1Parsed directly from bigint math to avoid floating-point
  // truncation bugs. For tokens with different decimals (e.g. 18 vs 6) the
  // old toFixed(6/8) approach would silently drop precision.
  const amount1Parsed = useMemo(() => {
    if (amount0Parsed === 0n || !priceNum) return 0n;
    try {
      // Represent the price with 15-digit integer precision
      const SCALE = 10n ** 15n;
      const priceBig = BigInt(Math.round(priceNum * Number(SCALE)));
      const decDiff = dec1 - dec0;
      if (decDiff >= 0) {
        return (amount0Parsed * priceBig * 10n ** BigInt(decDiff)) / SCALE;
      } else {
        return (amount0Parsed * priceBig) / (SCALE * 10n ** BigInt(-decDiff));
      }
    } catch {
      return 0n;
    }
  }, [amount0Parsed, priceNum, dec0, dec1]);

  // ── Pool fee display ─────────────────────────────────────────────────────────
  const feeDisplay = selectedPoolType.isStable ? "0.05%" : "0.30%";

  // ── Check existing pool ───────────────────────────────────────────────────
  const existingPools = useMemo(() => {
    if (!searchedToken || !selectedPairing) return [];
    const a = searchedToken.address?.toLowerCase();
    const b = selectedPairing.address?.toLowerCase();
    if (!a || !b) return [];
    return pools.filter((p) => {
      const p0 = p.token0.address.toLowerCase();
      const p1 = p.token1.address.toLowerCase();
      return (
        [p0, p1].includes(a) &&
        [p0, p1].includes(b) &&
        p.isStable === selectedPoolType.isStable &&
        !p.isCL
      );
    });
  }, [pools, searchedToken, selectedPairing, selectedPoolType]);

  const { data: onChainPair } = useReadContract({
    address: addresses?.pairFactory,
    abi: ABIS.PairFactory,
    functionName: "getPair",
    args: [
      (searchedToken?.address ?? zeroAddress) as Address,
      (selectedPairing?.address ?? zeroAddress) as Address,
      selectedPoolType.isStable,
    ],
    query: { enabled: !!searchedToken?.address && !!selectedPairing?.address && !!addresses?.pairFactory },
  });
  const poolAlreadyExists =
    existingPools.length > 0 || (!!onChainPair && onChainPair !== zeroAddress);

  // ── Pairing token USD price (from Envio) ──────────────────────────────────
  const pairingPriceUSD = useMemo(() => {
    const found = discoveredTokens.find(
      (t) => t.address.toLowerCase() === selectedPairing?.address?.toLowerCase()
    );
    return found?.priceUSD ?? 0;
  }, [discoveredTokens, selectedPairing]);

  // ── Total supply of searched token ─────────────────────────────────────────
  const { data: totalSupplyRaw } = useReadContract({
    address: searchedToken?.address as Address,
    abi: TOTAL_SUPPLY_ABI,
    functionName: "totalSupply",
    query: { enabled: !!searchedToken?.address },
  });

  const totalSupply = totalSupplyRaw
    ? Number(formatUnits(totalSupplyRaw as bigint, dec0))
    : 0;
  const tokenPriceUSD = priceNum * pairingPriceUSD;
  const marketCap = totalSupply * tokenPriceUSD;
  const liquidityUSD = amount1Num * pairingPriceUSD;

  // ── Allowances ───────────────────────────────────────────────────────────
  const isWMONPairing =
    selectedPairing?.address?.toLowerCase() ===
    MONAD_CONTRACTS.WMON.toLowerCase();
  const useETH = !selectedPoolType.isCL && useNative && isWMONPairing;

  // CL uses positionManager as spender; V2 uses router
  const spender = selectedPoolType.isCL
    ? (addresses?.positionManager ?? zeroAddress)
    : (addresses?.router ?? zeroAddress);

  // For CL: token0/token1 sorted by address
  const isToken0 =
    (searchedToken?.address ?? "").toLowerCase() <
    (selectedPairing?.address ?? "").toLowerCase();

  const { data: allowances, refetch: refetchAllowances } = useReadContracts({
    contracts: [
      {
        address: (searchedToken?.address ?? zeroAddress) as Address,
        abi: ABIS.ERC20,
        functionName: "allowance",
        args: [walletAddress ?? zeroAddress, spender],
      },
      {
        address: (selectedPairing?.address ?? zeroAddress) as Address,
        abi: ABIS.ERC20,
        functionName: "allowance",
        args: [walletAddress ?? zeroAddress, spender],
      },
    ],
    query: { enabled: !!walletAddress && !!searchedToken && !!addresses },
  });

  const allowance0 = allowances?.[0]?.result as bigint | undefined;
  const allowance1 = allowances?.[1]?.result as bigint | undefined;
  const needApprove0 = amount0Parsed > 0n && (allowance0 ?? 0n) < amount0Parsed;
  // CL single-sided: no pairing token needed
  const needApprove1 =
    selectedPoolType.id === "cl-single"
      ? false
      : !useETH && amount1Parsed > 0n && (allowance1 ?? 0n) < amount1Parsed;

  // ── Token balances ─────────────────────────────────────────────────────────
  const { data: nativeBalance } = useBalance({ address: walletAddress });

  const { data: tokenBalances } = useReadContracts({
    contracts: [
      {
        address: (searchedToken?.address ?? zeroAddress) as Address,
        abi: ABIS.ERC20,
        functionName: "balanceOf",
        args: [walletAddress ?? zeroAddress],
      },
      {
        address: (selectedPairing?.address ?? zeroAddress) as Address,
        abi: ABIS.ERC20,
        functionName: "balanceOf",
        args: [walletAddress ?? zeroAddress],
      },
    ],
    query: { enabled: !!walletAddress && !!searchedToken },
  });

  const balance0Raw = tokenBalances?.[0]?.result as bigint | undefined;
  const balance1Raw = tokenBalances?.[1]?.result as bigint | undefined;

  function fmtBal(
    raw: bigint | undefined,
    decimals: number,
    isNative: boolean
  ) {
    if (isNative && nativeBalance) {
      const n = Number(formatUnits(nativeBalance.value, 18));
      return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
    }
    if (!walletAddress || raw === undefined) return "-";
    const n = Number(formatUnits(raw, decimals));
    return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
  }

  // ── Write contract ─────────────────────────────────────────────────────────
  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isConfirmed || !txType) return;
    if (txType === "approve0") {
      toast({ title: `${searchedToken?.symbol} approved` });
      refetchAllowances();
      setTxType(null);
    } else if (txType === "approve1") {
      toast({ title: `${selectedPairing?.symbol} approved` });
      refetchAllowances();
      setTxType(null);
    } else if (txType === "create") {
      toast({
        title: "Pool created!",
        description: "Initial liquidity has been added.",
      });
      setTxType(null);
    }
    resetWrite();
  }, [isConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!writeError) return;
    const msg =
      (writeError as { shortMessage?: string })?.shortMessage ??
      writeError.message;
    toast({
      title: msg?.includes("User rejected")
        ? "Transaction rejected"
        : "Transaction failed",
      description: msg?.includes("User rejected") ? undefined : msg,
    });
    setTxType(null);
    resetWrite();
  }, [writeError]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Token search ───────────────────────────────────────────────────────────
  const searchToken = async (address: string) => {
    if (!address || address.length < 10) {
      setSearchedToken(null);
      setSearchError("");
      return;
    }
    if (!address.startsWith("0x") || address.length !== 42) {
      setSearchError("Invalid address format");
      setSearchedToken(null);
      return;
    }

    const local = TOKEN_LIST.find(
      (t) => t.address?.toLowerCase() === address.toLowerCase()
    );
    if (local) {
      setSearchedToken(local);
      setSearchError("");
      return;
    }

    setIsSearching(true);
    setSearchError("");
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (data?.data?.tokenProjects?.[0]?.tokens?.[0]) {
        const proj = data.data.tokenProjects[0];
        const tok = proj.tokens[0];
        setSearchedToken({
          id: tok.id ?? address,
          address: tok.address as Address,
          chain: "MONAD",
          decimals: tok.decimals ?? 18,
          name: tok.name ?? "Unknown",
          symbol: tok.symbol ?? "???",
          logoUrl: proj.logoUrl ?? "",
          safetyLevel: proj.safetyLevel ?? "UNKNOWN",
          standard: "ERC20",
        });
        setSearchError("");
      } else {
        setSearchError("Token not found");
        setSearchedToken(null);
      }
    } catch {
      setSearchError("Failed to search token");
      setSearchedToken(null);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchAddress) searchToken(searchAddress);
    }, 500);
    return () => clearTimeout(t);
  }, [searchAddress]);

  // ── Simulation helper ──────────────────────────────────────────────────────
  function getSimError(err: unknown): string {
    const e = err as {
      shortMessage?: string;
      message?: string;
      cause?: { reason?: string; errorName?: string; args?: unknown[] };
    };
    if (e?.cause?.reason) return e.cause.reason;
    if (e?.cause?.errorName) {
      const args = e.cause.args?.length
        ? `: ${JSON.stringify(e.cause.args)}`
        : "";
      return `${e.cause.errorName}${args}`;
    }
    return e?.shortMessage ?? e?.message ?? "Transaction will revert";
  }

  function isContractRevert(err: unknown): boolean {
    const e = err as { name?: string; cause?: { reason?: string; errorName?: string } };
    return (
      e?.name === "ContractFunctionRevertedError" ||
      !!e?.cause?.reason ||
      !!e?.cause?.errorName
    );
  }

  // ── Action handlers ────────────────────────────────────────────────────────
  async function handleApprove0() {
    if (txType !== null) return;
    if (!searchedToken?.address || !addresses || !walletAddress || !publicClient) return;
    try {
      await publicClient.simulateContract({
        address: searchedToken.address as Address,
        abi: ABIS.ERC20,
        functionName: "approve",
        args: [spender, amount0Parsed],
        account: walletAddress,
      });
    } catch (err) {
      if (isContractRevert(err)) {
        toast({ title: "Approve will fail", description: getSimError(err) });
        return;
      }
    }
    setTxType("approve0");
    toast({ title: `Approving ${searchedToken.symbol}…` });
    writeContract({
      address: searchedToken.address as Address,
      abi: ABIS.ERC20,
      functionName: "approve",
      args: [spender, amount0Parsed],
    });
  }

  async function handleApprove1() {
    if (txType !== null) return;
    if (!selectedPairing?.address || !addresses || !walletAddress || !publicClient) return;
    try {
      await publicClient.simulateContract({
        address: selectedPairing.address as Address,
        abi: ABIS.ERC20,
        functionName: "approve",
        args: [spender, amount1Parsed],
        account: walletAddress,
      });
    } catch (err) {
      if (isContractRevert(err)) {
        toast({ title: "Approve will fail", description: getSimError(err) });
        return;
      }
    }
    setTxType("approve1");
    toast({ title: `Approving ${selectedPairing.symbol}…` });
    writeContract({
      address: selectedPairing.address as Address,
      abi: ABIS.ERC20,
      functionName: "approve",
      args: [spender, amount1Parsed],
    });
  }

  async function handleCreate() {
    if (txType !== null) return;
    if (
      !searchedToken?.address ||
      !selectedPairing?.address ||
      !walletAddress ||
      !addresses ||
      !publicClient
    ) return;

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

    // ── CL path (single-sided or dual-sided) ─────────────────────────────
    if (selectedPoolType.isCL) {
      if (!addresses.positionManager) {
        toast({ title: "Position manager not configured" });
        return;
      }
      const ts = CL_TICK_SPACING;
      const minTickAligned = alignTickUp(-MAX_TICK, ts);
      const maxTickAligned = alignTickDown(MAX_TICK, ts);

      // Compute initial price tick from user's entered price
      const initialTick = humanToTick(priceNum, isToken0, dec0, dec1);
      const tickLower = Math.max(alignTickDown(initialTick, ts), minTickAligned);
      const tickUpper =
        rangeType === "full"
          ? maxTickAligned
          : (() => {
              const mp = parseFloat(maxPrice);
              if (!mp || mp <= priceNum) return maxTickAligned;
              const t = humanToTick(mp, isToken0, dec0, dec1);
              return Math.min(alignTickUp(t, ts), maxTickAligned);
            })();

      if (tickLower >= tickUpper) {
        toast({ title: "Invalid price range", description: "Max price must be above initial price." });
        return;
      }

      const sqrtPriceX96 = humanToSqrtPriceX96(priceNum, isToken0, dec0, dec1);
      const token0Addr = (isToken0 ? searchedToken.address : selectedPairing.address) as Address;
      const token1Addr = (isToken0 ? selectedPairing.address : searchedToken.address) as Address;

      // Single-sided: only searchedToken amount, pairing = 0
      const a0 = selectedPoolType.id === "cl-single"
        ? (isToken0 ? amount0Parsed : 0n)
        : (isToken0 ? amount0Parsed : amount1Parsed);
      const a1 = selectedPoolType.id === "cl-single"
        ? (isToken0 ? 0n : amount0Parsed)
        : (isToken0 ? amount1Parsed : amount0Parsed);

      const mintParams = {
        token0: token0Addr,
        token1: token1Addr,
        tickSpacing: ts,
        tickLower,
        tickUpper,
        amount0Desired: a0,
        amount1Desired: a1,
        amount0Min: (a0 * 95n) / 100n,
        amount1Min: (a1 * 95n) / 100n,
        recipient: walletAddress,
        deadline,
        sqrtPriceX96,
      };

      try {
        await publicClient.simulateContract({
          address: addresses.positionManager,
          abi: ABIS.NonfungiblePositionManager,
          functionName: "mint",
          args: [mintParams],
          account: walletAddress,
        });
      } catch (err) {
        if (isContractRevert(err)) {
          toast({ title: "Transaction will fail", description: getSimError(err) });
          return;
        }
        console.warn("CL mint simulation failed (non-revert):", err);
      }

      setTxType("create");
      toast({ title: "Creating position…" });
      writeContract({
        address: addresses.positionManager,
        abi: ABIS.NonfungiblePositionManager,
        functionName: "mint",
        args: [mintParams],
      });
      return;
    }

    // ── V2 path ──────────────────────────────────────────────────────────
    // Pre-flight: check if pool already exists on-chain
    try {
      const existingPair = await publicClient.readContract({
        address: addresses.pairFactory,
        abi: ABIS.PairFactory,
        functionName: "getPair",
        args: [
          searchedToken.address as Address,
          selectedPairing.address as Address,
          selectedPoolType.isStable,
        ],
      });
      if (existingPair && existingPair !== zeroAddress) {
        toast({
          title: "Pool already exists",
          description: "This pool already exists. Use the Deposit page to add liquidity.",
        });
        return;
      }
    } catch {
      // factory check failed — let the router handle it
    }

    const min0 = (amount0Parsed * 98n) / 100n;
    const min1 = (amount1Parsed * 98n) / 100n;

    try {
      if (useETH) {
        await publicClient.simulateContract({
          address: addresses.router,
          abi: ABIS.Router,
          functionName: "addLiquidityETH",
          args: [searchedToken.address as Address, selectedPoolType.isStable, amount0Parsed, min0, min1, walletAddress, deadline],
          value: amount1Parsed,
          account: walletAddress,
        });
      } else {
        await publicClient.simulateContract({
          address: addresses.router,
          abi: ABIS.Router,
          functionName: "addLiquidity",
          args: [searchedToken.address as Address, selectedPairing.address as Address, selectedPoolType.isStable, amount0Parsed, amount1Parsed, min0, min1, walletAddress, deadline],
          account: walletAddress,
        });
      }
    } catch (err) {
      if (isContractRevert(err)) {
        toast({ title: "Transaction will fail", description: getSimError(err) });
        return;
      }
      console.warn("V2 simulation failed (non-revert):", err);
    }

    setTxType("create");
    toast({ title: "Creating pool and adding liquidity…" });
    if (useETH) {
      writeContract({
        address: addresses.router,
        abi: ABIS.Router,
        functionName: "addLiquidityETH",
        args: [searchedToken.address as Address, selectedPoolType.isStable, amount0Parsed, min0, min1, walletAddress, deadline],
        value: amount1Parsed,
      });
    } else {
      writeContract({
        address: addresses.router,
        abi: ABIS.Router,
        functionName: "addLiquidity",
        args: [searchedToken.address as Address, selectedPairing.address as Address, selectedPoolType.isStable, amount0Parsed, amount1Parsed, min0, min1, walletAddress, deadline],
      });
    }
  }

  const isBusy = isPending || isConfirming;

  const depositHref = useMemo(() => {
    if (existingPools.length > 0)
      return `/liquidity/deposit?pool=${existingPools[0].poolAddress}`;
    if (onChainPair && onChainPair !== zeroAddress)
      return `/liquidity/deposit?pool=${onChainPair}`;
    return "/liquidity/deposit";
  }, [existingPools, onChainPair]);

  const shortenAddress = (addr: string | null | undefined) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <main
      className="min-h-screen text-white flex flex-col"
      style={{
        background:
          "linear-gradient(135deg, #0a1612 0%, #0d2820 25%, #0d3d2e 50%, #15713a 100%)",
      }}
    >
      <Header />

      <div className="flex-1 px-4 py-8 md:py-12">
        <div className="w-full max-w-xl mx-auto space-y-3">
          {/* Breadcrumb */}
          <div className="bg-[#0a1612] rounded-2xl border border-white/10 p-5">
            <div className="flex items-center gap-3 text-lg font-semibold">
              <Link
                href="/liquidity/launch"
                className="hover:text-[#f7931a] transition-colors"
              >
                Launch pool
              </Link>
              <ChevronRight className="w-4 h-4 text-white/30" />
              <span className="text-white/50">Guided</span>
              <HelpCircle className="w-5 h-5 text-white/40 ml-auto cursor-pointer hover:text-white/60 transition-colors" />
            </div>
          </div>

          {/* Pool header (steps 2–4) */}
          {step !== "selection" && searchedToken && (
            <PoolHeader
              searched={searchedToken}
              pairing={selectedPairing}
              poolTypeName={selectedPoolType.name}
              fee={feeDisplay}
              onChange={() => {
                setStep("selection");
                setTokenPrice("");
                setAmount0("");
              }}
            />
          )}

          {/* Confirmed price (steps 3–4) */}
          {(step === "amount" || step === "review") && priceNum > 0 && (
            <ConfirmedRow
              label="Price"
              value={`${priceNum} ${selectedPairing.symbol} = 1 ${searchedToken?.symbol}`}
              onEdit={() => setStep("price")}
            />
          )}

          {/* Confirmed amount (step 4) */}
          {step === "review" && amount0Num > 0 && (
            <ConfirmedRow
              label="Deposit amount"
              value={`~$${liquidityUSD > 0 ? liquidityUSD.toFixed(2) : "-"}`}
              onEdit={() => setStep("amount")}
            />
          )}

          {/* ── STEP: SELECTION ── */}
          {step === "selection" && (
            <div className="bg-[#0a1612] rounded-2xl border border-white/10 p-5 sm:p-8 space-y-8">
              {/* Token search */}
              <div className="space-y-3">
                <div className="text-sm font-semibold">Token search</div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    placeholder="Enter token contract address (0x…)"
                    className="w-full bg-[#0d1f1a] border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/40 focus:outline-none focus:border-[#f7931a]/50 transition-colors pr-10"
                  />
                  {searchAddress && (
                    <button
                      onClick={() => {
                        setSearchAddress("");
                        setSearchedToken(null);
                        setSearchError("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <X className="w-3 h-3 text-white/60" />
                    </button>
                  )}
                </div>
                {isSearching && (
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching…
                  </div>
                )}
                {searchError && (
                  <div className="text-sm text-red-400">{searchError}</div>
                )}
                {searchedToken && (
                  <div className="flex items-center gap-4 rounded-xl border border-[#f7931a] bg-[#0a1612] p-4">
                    <div className="w-6 h-6 rounded-full border-2 border-[#f7931a] bg-[#f7931a] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex items-center gap-3 border-l border-white/10 pl-4">
                      <TokenLogo
                        url={searchedToken.logoUrl}
                        symbol={searchedToken.symbol}
                        size={36}
                      />
                      <div>
                        <div className="text-sm font-semibold">
                          {searchedToken.symbol}
                        </div>
                        <div className="text-xs text-white/40">
                          {shortenAddress(searchedToken.address)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {searchedToken && (
                <>
                  {/* Liquidity pairing */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Liquidity pairing</h3>
                    <div className="space-y-2">
                      {TOKEN_LIST.filter(
                        (t) =>
                          t.address !== null &&
                          t.address?.toLowerCase() !==
                            searchedToken.address?.toLowerCase()
                      )
                        .slice(0, 5)
                        .map((token) => (
                          <button
                            key={token.id}
                            onClick={() => setSelectedPairing(token)}
                            className={`w-full flex items-center rounded-xl border p-3.5 transition-all ${
                              selectedPairing?.id === token.id
                                ? "border-[#f7931a] bg-[#0a1612]"
                                : "border-transparent bg-[#0a1612] hover:border-white/20"
                            }`}
                          >
                            <div className="mr-4 border-r border-white/10 pr-4">
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  selectedPairing?.id === token.id
                                    ? "border-[#f7931a] bg-[#f7931a]"
                                    : "border-white/30"
                                }`}
                              >
                                <Check
                                  className={`w-3 h-3 ${
                                    selectedPairing?.id === token.id
                                      ? "text-white"
                                      : "invisible"
                                  }`}
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <TokenLogo
                                url={token.logoUrl}
                                symbol={token.symbol}
                                size={36}
                              />
                              <div className="text-left">
                                <div className="text-sm font-semibold">
                                  {token.symbol}
                                </div>
                                <div className="text-xs text-white/40">
                                  {token.name}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Pool type */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Pool type</h3>
                    <div className="space-y-2">
                      {POOL_TYPES.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => { setSelectedPoolType(type); setRangeType("full"); setMaxPrice(""); }}
                          className={`w-full flex items-center rounded-xl border p-3.5 transition-all ${
                            selectedPoolType.id === type.id
                              ? "border-[#f7931a] bg-[#0a1612]"
                              : "border-transparent bg-[#0a1612] hover:border-white/20"
                          }`}
                        >
                          <div className="mr-4 pl-1">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                selectedPoolType.id === type.id
                                  ? "border-[#f7931a] bg-[#f7931a]"
                                  : "border-white/30"
                              }`}
                            >
                              <Check
                                className={`w-3 h-3 ${
                                  selectedPoolType.id === type.id
                                    ? "text-white"
                                    : "invisible"
                                }`}
                              />
                            </div>
                          </div>
                          <div className="flex grow items-center justify-between gap-3">
                            <span className="text-sm font-semibold">
                              {type.name}
                            </span>
                            <span className="text-xs text-white/40">
                              {type.description}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pool already exists */}
                  {poolAlreadyExists && (
                    <div className="bg-[#f7931a]/10 border border-[#f7931a]/30 rounded-xl p-4 space-y-3">
                      <p className="text-sm text-[#f7931a] font-medium">
                        This pool already exists
                      </p>
                      <p className="text-xs text-white/60">
                        A {selectedPoolType.name.toLowerCase()} pool for{" "}
                        {searchedToken.symbol} / {selectedPairing.symbol} is
                        already deployed.
                      </p>
                      {existingPools.slice(0, 2).map((p) => (
                        <Link
                          key={p.id}
                          href={`/liquidity/deposit?pool=${p.poolAddress}`}
                          className="flex items-center justify-between bg-[#0a1612] rounded-lg px-3 py-2 text-xs hover:bg-[#1a2f2a] transition-colors"
                        >
                          <span className="text-white/60">
                            {p.poolType} · {p.fee} · TVL {p.tvl}
                          </span>
                          <span className="text-[#f7931a] font-medium">
                            Deposit →
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Link
                      href="/liquidity/launch"
                      className="flex-1 py-3.5 rounded-full bg-[#f7931a]/10 text-[#f7931a] text-sm font-semibold text-center hover:bg-[#f7931a]/20 transition-colors"
                    >
                      Cancel
                    </Link>
                    {poolAlreadyExists ? (
                      <Link
                        href={depositHref}
                        className="flex-1 py-3.5 rounded-full bg-[#f7931a] text-white text-sm font-semibold text-center hover:bg-[#ff9f2a] transition-colors"
                      >
                        New deposit
                      </Link>
                    ) : (
                      <button
                        onClick={() => setStep("price")}
                        className="flex-1 py-3.5 rounded-full bg-[#f7931a] text-white text-sm font-semibold hover:bg-[#ff9f2a] transition-colors"
                      >
                        Continue
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── STEP: PRICE ── */}
          {step === "price" && searchedToken && (
            <div className="bg-[#0a1612] rounded-2xl border border-white/10 p-5 sm:p-8 space-y-6">
              {totalSupply > 0 && (
                <div className="divide-y divide-white/5">
                  <StatRow
                    label="Supply"
                    value={`${compactNum(totalSupply)} ${searchedToken.symbol}`}
                  />
                  <StatRow
                    label="Market cap"
                    value={marketCap > 0 ? compactNum(marketCap, "~$") : "-"}
                  />
                  <StatRow
                    label="Price"
                    value={
                      tokenPriceUSD > 0 ? `~$${tokenPriceUSD.toFixed(6)}` : "-"
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm font-semibold">
                  {selectedPoolType.isCL ? "Initial token price" : "Token price"}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={tokenPrice}
                    onChange={(e) => {
                      if (/^\d*\.?\d*$/.test(e.target.value))
                        setTokenPrice(e.target.value);
                    }}
                    placeholder="0"
                    className="w-full bg-[#0d1f1a] border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#f7931a]/50 transition-colors pr-48"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/40 whitespace-nowrap">
                    {priceNum > 0
                      ? `${priceNum} ${selectedPairing.symbol} = 1 ${searchedToken.symbol}`
                      : `__ ${selectedPairing.symbol} = 1 ${searchedToken.symbol}`}
                  </div>
                </div>
              </div>

              {/* CL price range */}
              {selectedPoolType.isCL && priceNum > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold">Price range</div>
                  <div className="space-y-2">
                    {(["full", "custom"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setRangeType(opt)}
                        className={`w-full flex items-center gap-4 rounded-xl border p-4 transition-all text-left ${
                          rangeType === opt
                            ? "border-[#f7931a] bg-[#0d1f1a]"
                            : "border-white/10 bg-transparent hover:border-white/20"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            rangeType === opt
                              ? "border-[#f7931a] bg-[#f7931a]"
                              : "border-white/30"
                          }`}
                        >
                          <Check
                            className={`w-3 h-3 ${rangeType === opt ? "text-white" : "invisible"}`}
                          />
                        </div>
                        <span className="text-sm">
                          {opt === "full"
                            ? "Use the full price range"
                            : "Use a custom price range"}
                        </span>
                      </button>
                    ))}
                  </div>

                  {rangeType === "custom" && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <div className="text-xs text-white/50">Minimum price</div>
                        <div className="bg-[#0d1f1a] border border-white/10 rounded-xl p-3 space-y-1">
                          <div className="text-sm text-white/40 text-right">
                            {priceNum > 0 ? priceNum : "—"}
                          </div>
                          <div className="text-[11px] text-white/30 text-right">
                            {selectedPairing.symbol} = 1 {searchedToken.symbol}
                          </div>
                        </div>
                        <div className="text-[11px] text-white/40 px-1">
                          (initial price = floor)
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-white/50">Maximum price</div>
                        <div className="bg-[#0d1f1a] border border-white/10 rounded-xl p-3 space-y-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={maxPrice}
                            onChange={(e) => {
                              if (/^\d*\.?\d*$/.test(e.target.value))
                                setMaxPrice(e.target.value);
                            }}
                            placeholder="∞"
                            className="w-full bg-transparent text-right text-sm font-medium outline-none placeholder-white/20"
                          />
                          <div className="text-[11px] text-white/30 text-right">
                            {selectedPairing.symbol} = 1 {searchedToken.symbol}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("selection")}
                  className="flex-1 py-3.5 rounded-full bg-[#f7931a]/10 text-[#f7931a] text-sm font-semibold hover:bg-[#f7931a]/20 transition-colors"
                >
                  Change pool
                </button>
                <button
                  onClick={() => setStep("amount")}
                  disabled={!priceNum}
                  className={`flex-1 py-3.5 rounded-full text-sm font-semibold transition-colors ${
                    priceNum
                      ? "bg-[#f7931a] text-white hover:bg-[#ff9f2a]"
                      : "bg-white/10 text-white/40 cursor-not-allowed"
                  }`}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: AMOUNT ── */}
          {step === "amount" && searchedToken && (
            <div className="bg-[#0a1612] rounded-2xl border border-white/10 p-5 sm:p-8 space-y-6">
              {/* Stats */}
              <div className="divide-y divide-white/5">
                {totalSupply > 0 && (
                  <StatRow
                    label="Supply"
                    value={`${compactNum(totalSupply)} ${searchedToken.symbol}`}
                  />
                )}
                {marketCap > 0 && (
                  <StatRow
                    label="Market cap"
                    value={compactNum(marketCap, "~$")}
                  />
                )}
                {tokenPriceUSD > 0 && (
                  <StatRow
                    label="Price"
                    value={`~$${tokenPriceUSD.toFixed(6)}`}
                  />
                )}
              </div>

              {/* Token 0 input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-white/80">Amount</span>
                  <span className="text-xs text-white/40">
                    Balance {fmtBal(balance0Raw, dec0, false)}{" "}
                    {searchedToken.symbol}
                  </span>
                </div>
                <div className="bg-[#0d1f1a] border border-white/10 rounded-xl p-4 flex items-center gap-3">
                  <div className="flex items-center gap-2 shrink-0">
                    <TokenLogo
                      url={searchedToken.logoUrl}
                      symbol={searchedToken.symbol}
                      size={24}
                    />
                    <span className="text-sm font-medium">
                      {searchedToken.symbol}
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount0}
                    onChange={(e) => {
                      if (/^\d*\.?\d*$/.test(e.target.value))
                        setAmount0(e.target.value);
                    }}
                    placeholder="0"
                    className="flex-1 bg-transparent text-right text-xl font-medium placeholder-white/20 outline-none"
                  />
                </div>
                <div className="text-right text-xs text-white/30">
                  ~$
                  {amount0Num > 0 && tokenPriceUSD > 0
                    ? (amount0Num * tokenPriceUSD).toFixed(2)
                    : "0.0"}
                </div>
              </div>

              {/* Token 1 (computed) — hidden for CL single-sided */}
              <div className={`space-y-2 ${selectedPoolType.id === "cl-single" ? "hidden" : ""}`}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white/80">Amount</span>
                    {isWMONPairing && (
                      <button
                        onClick={() => setUseNative((v) => !v)}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                          useNative
                            ? "bg-[#f7931a] text-white"
                            : "bg-[#f7931a]/20 text-[#f7931a]"
                        }`}
                      >
                        USE NATIVE
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-white/40">
                    Balance{" "}
                    {fmtBal(balance1Raw, dec1, useNative && isWMONPairing)}{" "}
                    {useNative && isWMONPairing
                      ? "MON"
                      : selectedPairing.symbol}
                  </span>
                </div>
                <div className="bg-[#0d1f1a] border border-white/10 rounded-xl p-4 flex items-center gap-3">
                  <div className="flex items-center gap-2 shrink-0">
                    <TokenLogo
                      url={selectedPairing.logoUrl}
                      symbol={selectedPairing.symbol}
                      size={24}
                    />
                    <span className="text-sm font-medium">
                      {useNative && isWMONPairing
                        ? "MON"
                        : selectedPairing.symbol}
                    </span>
                  </div>
                  <div className="flex-1 text-right text-xl font-medium text-white/60">
                    {amount1Num > 0
                      ? amount1Num.toLocaleString("en-US", {
                          maximumFractionDigits: 6,
                        })
                      : "0"}
                  </div>
                </div>
                <div className="text-right text-xs text-white/30">
                  ~${liquidityUSD > 0 ? liquidityUSD.toFixed(2) : "0.0"}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("price")}
                  className="flex-1 py-3.5 rounded-full bg-[#f7931a]/10 text-[#f7931a] text-sm font-semibold hover:bg-[#f7931a]/20 transition-colors"
                >
                  Edit price
                </button>
                <button
                  onClick={() => setStep("review")}
                  disabled={!amount0Num}
                  className={`flex-1 py-3.5 rounded-full text-sm font-semibold transition-colors ${
                    amount0Num
                      ? "bg-[#f7931a] text-white hover:bg-[#ff9f2a]"
                      : "bg-white/10 text-white/40 cursor-not-allowed"
                  }`}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: REVIEW + LOCK ── */}
          {step === "review" && searchedToken && (
            <div className="bg-[#0a1612] rounded-2xl border border-white/10 p-5 sm:p-8 space-y-6">
              {/* Stats */}
              <div className="divide-y divide-white/5">
                {totalSupply > 0 && (
                  <StatRow
                    label="Supply"
                    value={`${compactNum(totalSupply)} ${searchedToken.symbol}`}
                  />
                )}
                {marketCap > 0 && (
                  <StatRow
                    label="Market cap"
                    value={compactNum(marketCap, "~$")}
                  />
                )}
                {tokenPriceUSD > 0 && (
                  <StatRow
                    label="Price"
                    value={`~$${tokenPriceUSD.toFixed(6)}`}
                  />
                )}
                <StatRow
                  label="Token amount"
                  value={`${compactNum(amount0Num)} ${searchedToken.symbol}${
                    totalSupply > 0
                      ? ` (${((amount0Num / totalSupply) * 100).toFixed(2)}%)`
                      : ""
                  }`}
                />
                <StatRow
                  label="Liquidity amount"
                  value={`${compactNum(amount1Num)} ${
                    useNative && isWMONPairing ? "MON" : selectedPairing.symbol
                  }${liquidityUSD > 0 ? ` ~$${liquidityUSD.toFixed(2)}` : ""}`}
                />
              </div>

              {/* Lock options */}
              <div className="space-y-2">
                {(["forever", "6months", "none"] as LockOption[]).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setLockOption(opt)}
                    className={`w-full flex items-center gap-4 rounded-xl border p-4 transition-all text-left ${
                      lockOption === opt
                        ? "border-[#f7931a] bg-[#0d1f1a]"
                        : "border-white/10 bg-transparent hover:border-white/20"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        lockOption === opt
                          ? "border-[#f7931a] bg-[#f7931a]"
                          : "border-white/30"
                      }`}
                    >
                      <Check
                        className={`w-3 h-3 ${
                          lockOption === opt ? "text-white" : "invisible"
                        }`}
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm">
                        {opt === "forever" &&
                          "Yes, I want to lock the deposit forever"}
                        {opt === "6months" &&
                          "Yes, I want to lock the deposit for 6 months"}
                        {opt === "none" && "No, thank you"}
                      </span>
                      {opt === "6months" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f7931a]/20 text-[#f7931a] font-semibold">
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Action button */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("amount")}
                  className="flex-1 py-3.5 rounded-full bg-[#f7931a]/10 text-[#f7931a] text-sm font-semibold hover:bg-[#f7931a]/20 transition-colors"
                >
                  Edit amount
                </button>

                {!isConnected ? (
                  <button
                    disabled
                    className="flex-1 py-3.5 rounded-full bg-white/10 text-white/40 text-sm font-semibold cursor-not-allowed"
                  >
                    Connect Wallet
                  </button>
                ) : chainId !== CHAIN_ID ? (
                  <button
                    disabled
                    className="flex-1 py-3.5 rounded-full bg-white/10 text-white/40 text-sm font-semibold cursor-not-allowed"
                  >
                    Wrong Network
                  </button>
                ) : isBusy ? (
                  <button
                    disabled
                    className="flex-1 py-3.5 rounded-full bg-[#f7931a]/70 text-white text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {txType === "approve0"
                      ? `Approving ${searchedToken.symbol}…`
                      : txType === "approve1"
                      ? `Approving ${selectedPairing.symbol}…`
                      : "Creating pool…"}
                  </button>
                ) : needApprove0 ? (
                  <button
                    onClick={handleApprove0}
                    className="flex-1 py-3.5 rounded-full bg-[#f7931a] text-white text-sm font-semibold hover:bg-[#ff9f2a] transition-colors"
                  >
                    Approve {searchedToken.symbol}
                  </button>
                ) : needApprove1 ? (
                  <button
                    onClick={handleApprove1}
                    className="flex-1 py-3.5 rounded-full bg-[#f7931a] text-white text-sm font-semibold hover:bg-[#ff9f2a] transition-colors"
                  >
                    Approve {selectedPairing.symbol}
                  </button>
                ) : (
                  <button
                    onClick={handleCreate}
                    className="flex-1 py-3.5 rounded-full bg-[#f7931a] text-white text-sm font-semibold hover:bg-[#ff9f2a] transition-colors shadow-lg shadow-[#f7931a]/25"
                  >
                    Create pool
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
