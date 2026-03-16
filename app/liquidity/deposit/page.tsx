"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { ArrowLeft, ChevronDown, HelpCircle, Loader2 } from "lucide-react";
import {
  useAccount,
  useBalance,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  usePublicClient,
} from "wagmi";
import { parseUnits, formatUnits, type Address, zeroAddress } from "viem";
import { usePools } from "@/hooks/use-pools";
import { ADDRESSES, ABIS, MONAD_CONTRACTS } from "@/lib/contracts";
import { TOKEN_LIST, type TokenInfo } from "@/lib/token-list";
import { useToast } from "@/hooks/use-toast";

const CHAIN_ID = 143;

// ─── Token Logo ──────────────────────────────────────────────────────────────

function TokenLogo({
  url,
  symbol,
  size = 32,
}: {
  url: string;
  symbol: string;
  size?: number;
}) {
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

// ─── Token Picker Dropdown ───────────────────────────────────────────────────

function TokenPicker({
  value,
  onSelect,
  label,
}: {
  value: TokenInfo | null;
  onSelect: (t: TokenInfo) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = TOKEN_LIST.filter(
    (t) =>
      t.symbol.toLowerCase().includes(q.toLowerCase()) ||
      t.name.toLowerCase().includes(q.toLowerCase())
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
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0a1612] border border-white/10 rounded-xl shadow-2xl p-2">
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
                onClick={() => {
                  onSelect(t);
                  setOpen(false);
                  setQ("");
                }}
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
      )}
    </div>
  );
}

// ─── Pool Selector (Mode A: no ?pool= param) ─────────────────────────────────

function PoolSelector() {
  const { pools, loading } = usePools();
  const [tokenA, setTokenA] = useState<TokenInfo | null>(null);
  const [tokenB, setTokenB] = useState<TokenInfo | null>(null);
  const filteredPools = useMemo(() => {
    return pools.filter((p) => {
      if (p.isCL) return false; // only show V2 pools
      const addrA = tokenA?.address?.toLowerCase();
      const addrB = tokenB?.address?.toLowerCase();
      const p0 = p.token0.address.toLowerCase();
      const p1 = p.token1.address.toLowerCase();

      if (tokenA && tokenB) {
        return [p0, p1].includes(addrA!) && [p0, p1].includes(addrB!);
      } else if (tokenA) {
        return p0 === addrA || p1 === addrA;
      } else if (tokenB) {
        return p0 === addrB || p1 === addrB;
      }
      return true;
    });
  }, [pools, tokenA, tokenB]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-2">
        <Link
          href="/liquidity"
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">New deposit</h1>
      </div>

      {/* Filter card */}
      <div className="bg-[#0a1612]/80 backdrop-blur-sm rounded-xl border border-white/5 p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <TokenPicker
            value={tokenA}
            onSelect={setTokenA}
            label="Select token A"
          />
          <TokenPicker
            value={tokenB}
            onSelect={setTokenB}
            label="Select token B"
          />
        </div>
      </div>

      {/* Pool list */}
      {loading ? (
        <div className="text-center py-16 text-white/40 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading pools…</span>
        </div>
      ) : filteredPools.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          No matching pools found.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPools.map((pool) => (
            <Link
              key={pool.id}
              href={`/liquidity/deposit?pool=${pool.poolAddress}`}
              className="block bg-[#0a1612]/80 backdrop-blur-sm rounded-xl border border-white/5 p-4 hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <TokenLogo
                      url={pool.token0.logoUrl}
                      symbol={pool.token0.symbol}
                      size={32}
                    />
                    <TokenLogo
                      url={pool.token1.logoUrl}
                      symbol={pool.token1.symbol}
                      size={32}
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">
                      {pool.token0.symbol} / {pool.token1.symbol}
                    </div>
                    <div className="text-xs text-white/40">
                      {pool.poolType} · {pool.fee}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-medium text-[#f7931a]">
                    Deposit →
                  </div>
                  <div className="text-xs text-white/40">TVL {pool.tvl}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Deposit Form (Mode B: ?pool=ADDRESS) ────────────────────────────────────

function DepositForm({ poolAddress }: { poolAddress: string }) {
  const { pools, loading } = usePools();
  const { address: walletAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { toast } = useToast();

  const pool = useMemo(
    () =>
      pools.find(
        (p) => p.poolAddress.toLowerCase() === poolAddress.toLowerCase()
      ),
    [pools, poolAddress]
  );

  const addresses = ADDRESSES[CHAIN_ID];
  const spender: Address | undefined = pool?.isCL
    ? addresses?.positionManager
    : addresses?.router;

  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [useNative0, setUseNative0] = useState(false);
  const [useNative1, setUseNative1] = useState(false);
  const [txType, setTxType] = useState<
    "approve0" | "approve1" | "deposit" | null
  >(null);

  const isWMON0 =
    pool?.token0.address.toLowerCase() === MONAD_CONTRACTS.WMON.toLowerCase();
  const isWMON1 =
    pool?.token1.address.toLowerCase() === MONAD_CONTRACTS.WMON.toLowerCase();

  const token0Address = pool?.token0.address as Address | undefined;
  const token1Address = pool?.token1.address as Address | undefined;
  const dec0 = pool?.token0.decimals ?? 18;
  const dec1 = pool?.token1.decimals ?? 18;

  // Native MON balance
  const { data: nativeBalance } = useBalance({ address: walletAddress });

  // ERC20 reads: balance0, balance1, allowance0, allowance1
  const { data: contractReads, refetch: refetchReads } = useReadContracts({
    contracts: [
      {
        address: token0Address!,
        abi: ABIS.ERC20,
        functionName: "balanceOf",
        args: [walletAddress ?? zeroAddress],
      },
      {
        address: token1Address!,
        abi: ABIS.ERC20,
        functionName: "balanceOf",
        args: [walletAddress ?? zeroAddress],
      },
      {
        address: token0Address!,
        abi: ABIS.ERC20,
        functionName: "allowance",
        args: [walletAddress ?? zeroAddress, spender ?? zeroAddress],
      },
      {
        address: token1Address!,
        abi: ABIS.ERC20,
        functionName: "allowance",
        args: [walletAddress ?? zeroAddress, spender ?? zeroAddress],
      },
    ],
    query: {
      enabled: !!walletAddress && !!pool && !!spender,
    },
  });

  const balance0Raw = contractReads?.[0]?.result as bigint | undefined;
  const balance1Raw = contractReads?.[1]?.result as bigint | undefined;
  const allowance0 = contractReads?.[2]?.result as bigint | undefined;
  const allowance1 = contractReads?.[3]?.result as bigint | undefined;

  const amount0Parsed = useMemo(() => {
    try {
      return parseUnits(amount0 || "0", dec0);
    } catch {
      return 0n;
    }
  }, [amount0, dec0]);

  const amount1Parsed = useMemo(() => {
    try {
      return parseUnits(amount1 || "0", dec1);
    } catch {
      return 0n;
    }
  }, [amount1, dec1]);

  const needApprove0 = useMemo(() => {
    if (!pool || amount0Parsed === 0n) return false;
    if (useNative0 && isWMON0) return false;
    return (allowance0 ?? 0n) < amount0Parsed;
  }, [pool, amount0Parsed, allowance0, useNative0, isWMON0]);

  const needApprove1 = useMemo(() => {
    if (!pool || amount1Parsed === 0n) return false;
    if (useNative1 && isWMON1) return false;
    return (allowance1 ?? 0n) < amount1Parsed;
  }, [pool, amount1Parsed, allowance1, useNative1, isWMON1]);

  const {
    writeContract,
    data: txHash,
    isPending,
    reset: resetWrite,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isConfirmed || !txType) return;
    if (txType === "approve0") {
      toast({ title: `${pool?.token0.symbol} approved` });
    } else if (txType === "approve1") {
      toast({ title: `${pool?.token1.symbol} approved` });
    } else if (txType === "deposit") {
      toast({
        title: "Deposit successful!",
        description: "Liquidity added to the pool.",
      });
      setAmount0("");
      setAmount1("");
    }
    refetchReads();
    setTxType(null);
    resetWrite();
  }, [isConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!writeError) return;
    const msg =
      (writeError as { shortMessage?: string })?.shortMessage ??
      writeError.message;
    if (msg?.includes("User rejected")) {
      toast({
        title: "Transaction rejected",
        description: "You cancelled the transaction.",
      });
    } else {
      toast({ title: "Transaction failed", description: msg });
    }
    setTxType(null);
    resetWrite();
  }, [writeError]); // eslint-disable-line react-hooks/exhaustive-deps

  function fmtBal(
    raw: bigint | undefined,
    decimals: number,
    useNative: boolean,
    isWMON: boolean
  ) {
    if (useNative && isWMON && nativeBalance) {
      const n = Number(formatUnits(nativeBalance.value, 18));
      return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
    }
    if (raw === undefined) return "-";
    const n = Number(formatUnits(raw, decimals));
    return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
  }

  function getSimError(err: unknown): string {
    const e = err as { shortMessage?: string; message?: string; cause?: { reason?: string } };
    return e?.cause?.reason ?? e?.shortMessage ?? e?.message ?? "Transaction will revert";
  }

  async function handleApprove0() {
    if (!token0Address || !spender || !publicClient || !walletAddress) return;
    try {
      await publicClient.simulateContract({
        address: token0Address,
        abi: ABIS.ERC20,
        functionName: "approve",
        args: [spender, amount0Parsed],
        account: walletAddress,
      });
    } catch (err) {
      toast({ title: "Approval would fail", description: getSimError(err) });
      return;
    }
    setTxType("approve0");
    toast({ title: `Approving ${pool?.token0.symbol}…` });
    writeContract({
      address: token0Address,
      abi: ABIS.ERC20,
      functionName: "approve",
      args: [spender, amount0Parsed],
    });
  }

  async function handleApprove1() {
    if (!token1Address || !spender || !publicClient || !walletAddress) return;
    try {
      await publicClient.simulateContract({
        address: token1Address,
        abi: ABIS.ERC20,
        functionName: "approve",
        args: [spender, amount1Parsed],
        account: walletAddress,
      });
    } catch (err) {
      toast({ title: "Approval would fail", description: getSimError(err) });
      return;
    }
    setTxType("approve1");
    toast({ title: `Approving ${pool?.token1.symbol}…` });
    writeContract({
      address: token1Address,
      abi: ABIS.ERC20,
      functionName: "approve",
      args: [spender, amount1Parsed],
    });
  }

  async function handleDeposit() {
    if (!pool || !walletAddress || !addresses || !publicClient) return;

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
    const min0 = (amount0Parsed * 98n) / 100n;
    const min1 = (amount1Parsed * 98n) / 100n;

    if (pool.isCL) {
      const ts = pool.tickSpacing || 60;
      const MAX_TICK = 887272;
      const tickLower = Math.ceil(-MAX_TICK / ts) * ts;
      const tickUpper = Math.floor(MAX_TICK / ts) * ts;
      const mintParams = {
        token0: token0Address!,
        token1: token1Address!,
        tickSpacing: ts,
        tickLower,
        tickUpper,
        amount0Desired: amount0Parsed,
        amount1Desired: amount1Parsed,
        amount0Min: min0,
        amount1Min: min1,
        recipient: walletAddress,
        deadline,
        sqrtPriceX96: 0n,
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
        toast({ title: "Deposit would fail", description: getSimError(err) });
        return;
      }
      setTxType("deposit");
      toast({ title: "Submitting deposit…" });
      writeContract({
        address: addresses.positionManager,
        abi: ABIS.NonfungiblePositionManager,
        functionName: "mint",
        args: [mintParams],
      });
    } else {
      const useETH0 = useNative0 && isWMON0;
      const useETH1 = useNative1 && isWMON1;

      if (useETH0 || useETH1) {
        const token = useETH0 ? token1Address! : token0Address!;
        const amountToken = useETH0 ? amount1Parsed : amount0Parsed;
        const amountETH = useETH0 ? amount0Parsed : amount1Parsed;
        try {
          await publicClient.simulateContract({
            address: addresses.router,
            abi: ABIS.Router,
            functionName: "addLiquidityETH",
            args: [token, pool.isStable, amountToken, (amountToken * 98n) / 100n, (amountETH * 98n) / 100n, walletAddress, deadline],
            value: amountETH,
            account: walletAddress,
          });
        } catch (err) {
          toast({ title: "Deposit would fail", description: getSimError(err) });
          return;
        }
        setTxType("deposit");
        toast({ title: "Submitting deposit…" });
        writeContract({
          address: addresses.router,
          abi: ABIS.Router,
          functionName: "addLiquidityETH",
          args: [token, pool.isStable, amountToken, (amountToken * 98n) / 100n, (amountETH * 98n) / 100n, walletAddress, deadline],
          value: amountETH,
        });
      } else {
        try {
          await publicClient.simulateContract({
            address: addresses.router,
            abi: ABIS.Router,
            functionName: "addLiquidity",
            args: [token0Address!, token1Address!, pool.isStable, amount0Parsed, amount1Parsed, min0, min1, walletAddress, deadline],
            account: walletAddress,
          });
        } catch (err) {
          toast({ title: "Deposit would fail", description: getSimError(err) });
          return;
        }
        setTxType("deposit");
        toast({ title: "Submitting deposit…" });
        writeContract({
          address: addresses.router,
          abi: ABIS.Router,
          functionName: "addLiquidity",
          args: [token0Address!, token1Address!, pool.isStable, amount0Parsed, amount1Parsed, min0, min1, walletAddress, deadline],
        });
      }
    }
  }

  const isBusy = isPending || isConfirming;
  const noAmounts = amount0Parsed === 0n && amount1Parsed === 0n;

  // ── Loading / not found ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#f7931a]" />
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="text-center py-24 space-y-3">
        <p className="text-white/40">Pool not found</p>
        <Link
          href="/liquidity/deposit"
          className="text-[#f7931a] text-sm hover:underline"
        >
          ← Browse pools
        </Link>
      </div>
    );
  }

  // ── Button logic ──
  function ActionButton() {
    if (!isConnected) {
      return (
        <button
          disabled
          className="w-full py-3.5 rounded-xl bg-white/10 text-white/40 font-semibold"
        >
          Connect Wallet
        </button>
      );
    }
    if (chainId !== CHAIN_ID) {
      return (
        <button
          disabled
          className="w-full py-3.5 rounded-xl bg-white/10 text-white/40 font-semibold"
        >
          Wrong Network
        </button>
      );
    }
    if (noAmounts) {
      return (
        <button
          disabled
          className="w-full py-3.5 rounded-xl bg-white/10 text-white/40 font-semibold"
        >
          Enter amounts
        </button>
      );
    }
    if (isBusy) {
      return (
        <button
          disabled
          className="w-full py-3.5 rounded-xl bg-[#f7931a]/70 text-white font-semibold flex items-center justify-center gap-2"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          {txType === "approve0"
            ? `Approving ${pool!.token0.symbol}…`
            : txType === "approve1"
            ? `Approving ${pool!.token1.symbol}…`
            : "Depositing…"}
        </button>
      );
    }
    if (needApprove0) {
      return (
        <button
          onClick={handleApprove0}
          className="w-full py-3.5 rounded-xl bg-[#f7931a] hover:bg-[#ff9f2a] text-white font-semibold transition-colors"
        >
          Approve {pool!.token0.symbol}
        </button>
      );
    }
    if (needApprove1) {
      return (
        <button
          onClick={handleApprove1}
          className="w-full py-3.5 rounded-xl bg-[#f7931a] hover:bg-[#ff9f2a] text-white font-semibold transition-colors"
        >
          Approve {pool!.token1.symbol}
        </button>
      );
    }
    return (
      <button
        onClick={handleDeposit}
        className="w-full py-3.5 rounded-xl bg-[#f7931a] hover:bg-[#ff9f2a] text-white font-semibold transition-colors"
      >
        Deposit
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/liquidity/deposit"
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">New deposit</h1>
          <HelpCircle className="w-4 h-4 text-white/40" />
        </div>
      </div>

      {/* Pool header card */}
      <div className="bg-[#0a1612]/80 backdrop-blur-sm rounded-xl border border-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex -space-x-2 shrink-0">
              <TokenLogo
                url={pool.token0.logoUrl}
                symbol={pool.token0.symbol}
                size={36}
              />
              <TokenLogo
                url={pool.token1.logoUrl}
                symbol={pool.token1.symbol}
                size={36}
              />
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate">
                {pool.token0.symbol} / {pool.token1.symbol}
              </div>
              <div className="text-xs text-[#f7931a] truncate">
                {pool.poolType} · {pool.fee}
              </div>
            </div>
          </div>
          <Link
            href="/liquidity/deposit"
            className="shrink-0 px-3 py-1.5 rounded-lg border border-[#f7931a]/30 text-[#f7931a] text-xs font-medium hover:bg-[#f7931a]/10 transition-colors"
          >
            Change
          </Link>
        </div>
      </div>

      {/* CL notice */}
      {pool.isCL && (
        <div className="bg-[#f7931a]/10 border border-[#f7931a]/20 rounded-xl px-4 py-3 text-xs text-[#f7931a]">
          Concentrated liquidity - deposit uses full price range.
        </div>
      )}

      {/* Amounts card */}
      <div className="bg-[#0a1612]/80 backdrop-blur-sm rounded-xl border border-white/5 p-5 space-y-4">
        <div className="text-sm font-semibold">Set deposit amount</div>

        {/* Token 0 input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-white/50">
            <div className="flex items-center gap-2">
              <span>Amount</span>
              {isWMON0 && (
                <button
                  onClick={() => setUseNative0((v) => !v)}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    useNative0
                      ? "bg-[#f7931a] text-white"
                      : "bg-[#f7931a]/20 text-[#f7931a]"
                  }`}
                >
                  USE NATIVE
                </button>
              )}
            </div>
            <span>
              Balance: {fmtBal(balance0Raw, dec0, useNative0, isWMON0)}{" "}
              {useNative0 && isWMON0 ? "MON" : pool.token0.symbol}
            </span>
          </div>
          <div className="bg-[#1a2f2a] rounded-xl p-4 flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <TokenLogo
                url={pool.token0.logoUrl}
                symbol={pool.token0.symbol}
                size={24}
              />
              <span className="font-medium text-sm">
                {useNative0 && isWMON0 ? "MON" : pool.token0.symbol}
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
              placeholder="0.0"
              className="flex-1 bg-transparent text-right text-xl font-medium text-white placeholder-white/30 outline-none"
            />
          </div>
        </div>

        {/* Token 1 input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-white/50">
            <div className="flex items-center gap-2">
              <span>Amount</span>
              {isWMON1 && (
                <button
                  onClick={() => setUseNative1((v) => !v)}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    useNative1
                      ? "bg-[#f7931a] text-white"
                      : "bg-[#f7931a]/20 text-[#f7931a]"
                  }`}
                >
                  USE NATIVE
                </button>
              )}
            </div>
            <span>
              Balance: {fmtBal(balance1Raw, dec1, useNative1, isWMON1)}{" "}
              {useNative1 && isWMON1 ? "MON" : pool.token1.symbol}
            </span>
          </div>
          <div className="bg-[#1a2f2a] rounded-xl p-4 flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <TokenLogo
                url={pool.token1.logoUrl}
                symbol={pool.token1.symbol}
                size={24}
              />
              <span className="font-medium text-sm">
                {useNative1 && isWMON1 ? "MON" : pool.token1.symbol}
              </span>
            </div>
            <input
              type="text"
              inputMode="decimal"
              value={amount1}
              onChange={(e) => {
                if (/^\d*\.?\d*$/.test(e.target.value))
                  setAmount1(e.target.value);
              }}
              placeholder="0.0"
              className="flex-1 bg-transparent text-right text-xl font-medium text-white placeholder-white/30 outline-none"
            />
          </div>
        </div>

        <ActionButton />
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function DepositContent() {
  const searchParams = useSearchParams();
  const poolAddress = searchParams.get("pool");

  return (
    <main
      className="min-h-screen text-white flex flex-col"
      style={{
        background:
          "linear-gradient(135deg, #0a1612 0%, #0d2820 25%, #0d3d2e 50%, #15713a 100%)",
      }}
    >
      <Header />
      <div className="flex-1 px-4 py-8 sm:px-6 md:px-12">
        <div className="max-w-150 mx-auto">
          {poolAddress ? (
            <DepositForm poolAddress={poolAddress} />
          ) : (
            <PoolSelector />
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}

export default function DepositPage() {
  return (
    <Suspense
      fallback={
        <main
          className="min-h-screen text-white flex flex-col"
          style={{
            background:
              "linear-gradient(135deg, #0a1612 0%, #0d2820 25%, #0d3d2e 50%, #15713a 100%)",
          }}
        >
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#f7931a]" />
          </div>
          <Footer />
        </main>
      }
    >
      <DepositContent />
    </Suspense>
  );
}
