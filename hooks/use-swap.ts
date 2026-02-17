"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  useConnection,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  useConfig,
} from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { parseUnits, formatUnits, Address } from "viem";
import { ADDRESSES, ABIS } from "@/lib/contracts";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useDebounce } from "@/hooks/use-debounce";
import { TokenInfo, getRoutingAddress, isNativeToken } from "@/lib/token-list";

interface Route {
  from: Address;
  to: Address;
  stable: boolean;
  factory: Address;
}

interface UseSwapProps {
  tokenIn: TokenInfo | null;
  tokenOut: TokenInfo | null;
  amountIn: string;
}

interface UseSwapReturn {
  amountOut: string;
  quote: {
    isLoading: boolean;
    error: Error | null;
    priceImpact: number;
    exchangeRate: number;
    routeIsStable: boolean;
  };
  swap: () => Promise<string | undefined>;
  isSwapping: boolean;
  needsApproval: boolean;
  approve: () => Promise<void>;
  isApproving: boolean;
  error: string | null;
  clearError: () => void;
  balanceIn: string;
  balanceOut: string;
  insufficientBalance: boolean;
  lastTxHash: string | undefined;
}

function parseSwapError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("user rejected") || message.includes("User denied")) {
    return "Transaction rejected by user";
  }
  if (message.includes("insufficient funds")) {
    return "Insufficient funds for gas";
  }
  if (message.includes("INSUFFICIENT_OUTPUT_AMOUNT")) {
    return "Price moved unfavorably. Try increasing slippage.";
  }
  if (message.includes("EXPIRED")) {
    return "Transaction expired. Please try again.";
  }
  if (message.includes("INSUFFICIENT_LIQUIDITY")) {
    return "Insufficient liquidity for this trade.";
  }
  return "Transaction failed. Please try again.";
}

export function useSwap({
  tokenIn,
  tokenOut,
  amountIn,
}: UseSwapProps): UseSwapReturn {
  const config = useConfig();
  const { address, chainId } = useConnection();
  const { slippage, deadline } = useSettingsStore();
  const [error, setError] = useState<string | null>(null);

  const addresses = chainId ? ADDRESSES[chainId] : undefined;
  const routerAddress = addresses?.router;
  const factoryAddress = addresses?.pairFactory;

  // Debounce amountIn to avoid excessive RPC calls on every keystroke
  const debouncedAmountIn = useDebounce(amountIn, 500);

  // Resolve routing addresses (native MON -> WMON for on-chain calls)
  const routingAddressIn = tokenIn ? getRoutingAddress(tokenIn) : undefined;
  const routingAddressOut = tokenOut ? getRoutingAddress(tokenOut) : undefined;

  // Raw (non-debounced) bigint — used for wrap operations so output is instant
  const rawAmountInBigInt = useMemo(() => {
    if (!amountIn || !tokenIn) return BigInt(0);
    try {
      return parseUnits(amountIn, tokenIn.decimals);
    } catch {
      return BigInt(0);
    }
  }, [amountIn, tokenIn]);

  // Debounced bigint — used for router RPC calls to avoid excessive requests
  const amountInBigInt = useMemo(() => {
    if (!debouncedAmountIn || !tokenIn) return BigInt(0);
    try {
      return parseUnits(debouncedAmountIn, tokenIn.decimals);
    } catch {
      return BigInt(0);
    }
  }, [debouncedAmountIn, tokenIn]);

  // Check if this is a wrap/unwrap operation (MON <-> WMON)
  const isWrapOperation = useMemo(() => {
    if (!tokenIn || !tokenOut) return false;
    const wmonAddress = addresses?.weth; // WMON address
    if (!wmonAddress) return false;

    const isMonToWmon =
      isNativeToken(tokenIn) &&
      tokenOut.address?.toLowerCase() === wmonAddress.toLowerCase();
    const isWmonToMon =
      tokenIn.address?.toLowerCase() === wmonAddress.toLowerCase() &&
      isNativeToken(tokenOut);

    return isMonToWmon || isWmonToMon;
  }, [tokenIn, tokenOut, addresses]);

  // --- Balance Fetching ---

  // Native MON balance
  const { data: nativeBalance, refetch: refetchNativeBalance } = useBalance({
    address: address,
    query: { enabled: !!address },
  });

  // ERC20 balance for tokenIn
  const { data: erc20BalanceIn, refetch: refetchBalanceIn } = useReadContract({
    address:
      tokenIn && !isNativeToken(tokenIn)
        ? (tokenIn.address as Address)
        : undefined,
    abi: ABIS.ERC20,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!tokenIn && !isNativeToken(tokenIn),
    },
  });

  // ERC20 balance for tokenOut
  const { data: erc20BalanceOut, refetch: refetchBalanceOut } = useReadContract(
    {
      address:
        tokenOut && !isNativeToken(tokenOut)
          ? (tokenOut.address as Address)
          : undefined,
      abi: ABIS.ERC20,
      functionName: "balanceOf",
      args: address ? [address] : undefined,
      query: {
        enabled: !!address && !!tokenOut && !isNativeToken(tokenOut),
      },
    }
  );

  // Resolve formatted balances
  const rawBalanceIn: bigint = useMemo(() => {
    if (!tokenIn) return BigInt(0);
    if (isNativeToken(tokenIn)) return nativeBalance?.value ?? BigInt(0);
    return (erc20BalanceIn as bigint) ?? BigInt(0);
  }, [tokenIn, nativeBalance, erc20BalanceIn]);

  const rawBalanceOut: bigint = useMemo(() => {
    if (!tokenOut) return BigInt(0);
    if (isNativeToken(tokenOut)) return nativeBalance?.value ?? BigInt(0);
    return (erc20BalanceOut as bigint) ?? BigInt(0);
  }, [tokenOut, nativeBalance, erc20BalanceOut]);

  const balanceIn = useMemo(
    () => (tokenIn ? formatUnits(rawBalanceIn, tokenIn.decimals) : "0"),
    [rawBalanceIn, tokenIn]
  );

  const balanceOut = useMemo(
    () => (tokenOut ? formatUnits(rawBalanceOut, tokenOut.decimals) : "0"),
    [rawBalanceOut, tokenOut]
  );

  // Use rawAmountInBigInt for balance check so it's always instant (no debounce lag)
  const insufficientBalance =
    rawAmountInBigInt > BigInt(0) && rawAmountInBigInt > rawBalanceIn;

  // --- Quote Fetching ---

  // Check if same token (but allow wrap/unwrap operations)
  const sameToken =
    !isWrapOperation &&
    routingAddressIn &&
    routingAddressOut &&
    routingAddressIn.toLowerCase() === routingAddressOut.toLowerCase();

  // Build both stable and volatile routes to compare
  const volatileRoutes: Route[] =
    routingAddressIn && routingAddressOut && factoryAddress
      ? [
          {
            from: routingAddressIn,
            to: routingAddressOut,
            stable: false,
            factory: factoryAddress,
          },
        ]
      : [];

  const stableRoutes: Route[] =
    routingAddressIn && routingAddressOut && factoryAddress
      ? [
          {
            from: routingAddressIn,
            to: routingAddressOut,
            stable: true,
            factory: factoryAddress,
          },
        ]
      : [];

  // Query volatile route
  const {
    data: volatileAmounts,
    isLoading: volatileLoading,
    error: volatileError,
  } = useReadContract({
    address: routerAddress,
    abi: ABIS.Router,
    functionName: "getAmountsOut",
    args: [amountInBigInt, volatileRoutes],
    query: {
      enabled:
        !!routerAddress &&
        !!tokenIn &&
        !!tokenOut &&
        amountInBigInt > BigInt(0) &&
        !sameToken &&
        !isWrapOperation,
      refetchInterval: false,
      staleTime: 10000,
    },
  });

  // Query stable route
  const {
    data: stableAmounts,
    isLoading: stableLoading,
    error: stableError,
  } = useReadContract({
    address: routerAddress,
    abi: ABIS.Router,
    functionName: "getAmountsOut",
    args: [amountInBigInt, stableRoutes],
    query: {
      enabled:
        !!routerAddress &&
        !!tokenIn &&
        !!tokenOut &&
        amountInBigInt > BigInt(0) &&
        !sameToken &&
        !isWrapOperation,
      refetchInterval: false,
      staleTime: 10000,
    },
  });

  // Determine which route gives better output
  const { amounts, routes, routeIsStable, quoteLoading, quoteError } =
    useMemo(() => {
      const isLoading = volatileLoading || stableLoading;
      const error = volatileError || stableError;

      // Extract final amounts from both routes
      const volatileOut =
        volatileAmounts && Array.isArray(volatileAmounts) && volatileAmounts.length > 0
          ? volatileAmounts[volatileAmounts.length - 1]
          : BigInt(0);

      const stableOut =
        stableAmounts && Array.isArray(stableAmounts) && stableAmounts.length > 0
          ? stableAmounts[stableAmounts.length - 1]
          : BigInt(0);

      // Use whichever route gives better output
      const useStable = stableOut > volatileOut;

      return {
        amounts: useStable ? stableAmounts : volatileAmounts,
        routes: useStable ? stableRoutes : volatileRoutes,
        routeIsStable: useStable,
        quoteLoading: isLoading,
        quoteError: error,
      };
    }, [
      volatileAmounts,
      stableAmounts,
      volatileLoading,
      stableLoading,
      volatileError,
      stableError,
      volatileRoutes,
      stableRoutes,
    ]);

  // Extract the final amount from amounts array (last element)
  // For wrap/unwrap operations, return 1:1 conversion
  const quotedAmountOut = useMemo(() => {
    // Wrap/unwrap: use rawAmountInBigInt so output updates instantly (no debounce delay)
    if (isWrapOperation && rawAmountInBigInt > BigInt(0)) {
      return rawAmountInBigInt;
    }

    if (!amounts || !Array.isArray(amounts) || amounts.length === 0) {
      return BigInt(0);
    }
    // amounts is an array of bigints, last one is the output amount
    return amounts[amounts.length - 1];
  }, [amounts, isWrapOperation, rawAmountInBigInt]);

  // Debug logging
  // useEffect(() => {
  //   if (debouncedAmountIn && tokenIn && tokenOut) {
  //     console.log("Swap Debug:", {
  //       debouncedAmountIn,
  //       amountInBigInt: amountInBigInt.toString(),
  //       routerAddress,
  //       routingAddressIn,
  //       routingAddressOut,
  //       chainId,
  //       quoteLoading,
  //       quoteError: quoteError?.message,
  //       routes,
  //       amounts,
  //       quotedAmountOut: quotedAmountOut.toString(),
  //     });
  //   }
  // }, [
  //   debouncedAmountIn,
  //   amountInBigInt,
  //   routerAddress,
  //   routingAddressIn,
  //   routingAddressOut,
  //   chainId,
  //   quoteLoading,
  //   quoteError,
  //   routes,
  //   amounts,
  //   quotedAmountOut,
  //   tokenIn,
  //   tokenOut,
  // ]);

  // Format output amount
  const amountOut = useMemo(() => {
    if (!tokenOut || quotedAmountOut === BigInt(0)) return "";
    return formatUnits(quotedAmountOut, tokenOut.decimals);
  }, [quotedAmountOut, tokenOut]);

  // --- Reference quote for price impact & exchange rate ---

  const referenceAmountIn = useMemo(() => {
    if (!tokenIn) return BigInt(0);
    return parseUnits("1", tokenIn.decimals);
  }, [tokenIn]);

  // Build reference routes (same as main routes)
  const referenceRoutes: Route[] =
    routingAddressIn && routingAddressOut && factoryAddress
      ? [
          {
            from: routingAddressIn,
            to: routingAddressOut,
            stable: false,
            factory: factoryAddress,
          },
        ]
      : [];

  const { data: referenceAmounts } = useReadContract({
    address: routerAddress,
    abi: ABIS.Router,
    functionName: "getAmountsOut",
    args: [referenceAmountIn, referenceRoutes],
    query: {
      enabled: !!routerAddress && !!tokenIn && !!tokenOut && !sameToken,
    },
  });

  // Exchange rate: 1 tokenIn = X tokenOut
  const exchangeRate = useMemo(() => {
    if (
      !referenceAmounts ||
      !Array.isArray(referenceAmounts) ||
      referenceAmounts.length === 0 ||
      !tokenOut
    )
      return 0;
    const refAmount = referenceAmounts[referenceAmounts.length - 1];
    return Number(formatUnits(refAmount, tokenOut.decimals));
  }, [referenceAmounts, tokenOut]);

  // Price impact: compare effective rate to spot rate
  const priceImpact = useMemo(() => {
    if (
      !referenceAmounts ||
      !Array.isArray(referenceAmounts) ||
      referenceAmounts.length === 0 ||
      !tokenIn ||
      !tokenOut ||
      quotedAmountOut === BigInt(0) ||
      amountInBigInt === BigInt(0)
    )
      return 0;

    const spotRate = Number(referenceAmounts[referenceAmounts.length - 1]);
    if (spotRate === 0) return 0;

    const effectiveRate =
      (Number(quotedAmountOut) / Number(amountInBigInt)) *
      Number(referenceAmountIn);

    return Math.abs((1 - effectiveRate / spotRate) * 100);
  }, [
    referenceAmounts,
    quotedAmountOut,
    amountInBigInt,
    referenceAmountIn,
    tokenIn,
    tokenOut,
  ]);

  // --- Allowance & Approval ---

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address:
      tokenIn && !isNativeToken(tokenIn)
        ? (tokenIn.address as Address)
        : undefined,
    abi: ABIS.ERC20,
    functionName: "allowance",
    args: address && routerAddress ? [address, routerAddress] : undefined,
    query: {
      enabled:
        !!tokenIn && !isNativeToken(tokenIn) && !!address && !!routerAddress,
    },
  });

  const needsApproval =
    !!tokenIn &&
    !isNativeToken(tokenIn) &&
    !isWrapOperation && // No approval needed for wrap/unwrap
    allowance !== undefined &&
    (allowance as bigint) < amountInBigInt &&
    amountInBigInt > BigInt(0);

  // --- Write Contracts ---

  const {
    writeContractAsync: approveAsync,
    isPending: isApprovePending,
    data: approveTxHash,
  } = useWriteContract();

  const { isLoading: isApproveConfirming } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  const isApproving = isApprovePending || isApproveConfirming;

  const {
    writeContractAsync: swapAsync,
    isPending: isSwapPending,
    data: swapTxHash,
  } = useWriteContract();

  const { isLoading: isSwapConfirming } = useWaitForTransactionReceipt({
    hash: swapTxHash,
  });

  const isSwapping = isSwapPending || isSwapConfirming;

  // --- Actions ---

  const approve = useCallback(async () => {
    if (!tokenIn || isNativeToken(tokenIn) || !routerAddress) return;
    setError(null);

    try {
      const hash = await approveAsync({
        address: tokenIn.address as Address,
        abi: ABIS.ERC20,
        functionName: "approve",
        args: [routerAddress, amountInBigInt], // Approve only the exact amount needed
      });

      // Wait for transaction confirmation
      if (hash) {
        const receipt = await waitForTransactionReceipt(config, {
          hash,
          confirmations: 1,
        });

        // Only refetch if transaction was successful
        if (receipt.status === "success") {
          await refetchAllowance();
        }
      }
    } catch (err) {
      const msg = parseSwapError(err);
      setError(msg);
      throw err;
    }
  }, [
    tokenIn,
    routerAddress,
    approveAsync,
    refetchAllowance,
    amountInBigInt,
    config,
  ]);

  const swap = useCallback(async () => {
    if (!tokenIn || !tokenOut || !address) return;
    // Use rawAmountInBigInt for wraps (instant), amountInBigInt for swaps (debounced)
    const effectiveAmount = isWrapOperation ? rawAmountInBigInt : amountInBigInt;
    if (effectiveAmount === BigInt(0)) return;
    setError(null);

    try {
      let txHash: string;

      // Handle wrap/unwrap operations (MON <-> WMON)
      if (isWrapOperation) {
        const wmonAddress = addresses?.weth; // WMON address
        if (!wmonAddress) throw new Error("WMON address not found");

        const isWrapping = isNativeToken(tokenIn); // MON -> WMON

        if (isWrapping) {
          // MON -> WMON: deposit native MON to get WMON
          txHash = await swapAsync({
            address: wmonAddress,
            abi: ABIS.WMON,
            functionName: "deposit",
            args: [],
            value: rawAmountInBigInt,
          });
        } else {
          // WMON -> MON: withdraw WMON to get native MON
          txHash = await swapAsync({
            address: wmonAddress,
            abi: ABIS.WMON,
            functionName: "withdraw",
            args: [rawAmountInBigInt],
          });
        }

        // Refetch balances after wrap/unwrap
        await refetchNativeBalance();
        await refetchBalanceIn();
        await refetchBalanceOut();

        return txHash;
      }

      // Regular swap through router
      if (!routerAddress) return;
      if (routes.length === 0) return;

      const amountOutMin =
        (quotedAmountOut * BigInt(Math.floor((100 - slippage) * 100))) /
        BigInt(10000);
      const deadlineTimestamp = BigInt(
        Math.floor(Date.now() / 1000) + deadline * 60
      );

      const tokenInIsNative = isNativeToken(tokenIn);
      const tokenOutIsNative = isNativeToken(tokenOut);

      if (tokenInIsNative) {
        // Native MON -> ERC20: use swapExactETHForTokens
        txHash = await swapAsync({
          address: routerAddress,
          abi: ABIS.Router,
          functionName: "swapExactETHForTokens",
          args: [amountOutMin, routes, address, deadlineTimestamp],
          value: amountInBigInt,
        });
      } else if (tokenOutIsNative) {
        // ERC20 -> Native MON: use swapExactTokensForETH
        txHash = await swapAsync({
          address: routerAddress,
          abi: ABIS.Router,
          functionName: "swapExactTokensForETH",
          args: [
            amountInBigInt,
            amountOutMin,
            routes,
            address,
            deadlineTimestamp,
          ],
        });
      } else {
        // ERC20 -> ERC20: use swapExactTokensForTokens
        txHash = await swapAsync({
          address: routerAddress,
          abi: ABIS.Router,
          functionName: "swapExactTokensForTokens",
          args: [
            amountInBigInt,
            amountOutMin,
            routes,
            address,
            deadlineTimestamp,
          ],
        });
      }

      // Refetch balances after successful swap
      if (tokenInIsNative || tokenOutIsNative) {
        await refetchNativeBalance();
      }
      if (!tokenInIsNative) {
        await refetchBalanceIn();
      }
      if (!tokenOutIsNative) {
        await refetchBalanceOut();
      }

      return txHash;
    } catch (err) {
      const msg = parseSwapError(err);
      setError(msg);
      throw err;
    }
  }, [
    tokenIn,
    tokenOut,
    address,
    routerAddress,
    amountInBigInt,
    rawAmountInBigInt,
    quotedAmountOut,
    slippage,
    deadline,
    routes,
    swapAsync,
    refetchNativeBalance,
    refetchBalanceIn,
    refetchBalanceOut,
    isWrapOperation,
    addresses,
  ]);

  return {
    amountOut,
    quote: {
      isLoading: quoteLoading,
      error: quoteError as Error | null,
      priceImpact,
      exchangeRate,
      routeIsStable,
    },
    swap,
    isSwapping,
    needsApproval,
    approve,
    isApproving,
    error,
    clearError: () => setError(null),
    balanceIn,
    balanceOut,
    insufficientBalance,
    lastTxHash: swapTxHash,
  };
}
