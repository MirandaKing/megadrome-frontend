"use client";

import { useState, useCallback, useMemo } from "react";
import {
  useConnection,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useConfig,
} from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { parseUnits, formatUnits, Address } from "viem";
import { ADDRESSES, ABIS } from "@/lib/contracts";

interface UseLockProps {
  amountIn: string;
  lockWeeks: number;
}

interface UseLockReturn {
  balance: string;
  rawBalance: bigint;
  insufficientBalance: boolean;
  needsApproval: boolean;
  approve: () => Promise<void>;
  isApproving: boolean;
  createLock: () => Promise<string | undefined>;
  isCreating: boolean;
  error: string | null;
  clearError: () => void;
  lastTxHash: string | undefined;
}

function parseLockError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("user rejected") || message.includes("User denied")) {
    return "Transaction rejected by user";
  }
  if (message.includes("insufficient funds")) {
    return "Insufficient funds for gas";
  }
  return "Transaction failed. Please try again.";
}

export function useLock({ amountIn, lockWeeks }: UseLockProps): UseLockReturn {
  const config = useConfig();
  const { address, chainId } = useConnection();
  const [error, setError] = useState<string | null>(null);

  const addresses = chainId ? ADDRESSES[chainId] : undefined;
  const tokenAddress = addresses?.token as Address | undefined; // MEGA token
  const votingEscrowAddress = addresses?.votingEscrow as Address | undefined;

  // Parse input amount (MEGA has 18 decimals)
  const amountBigInt = useMemo(() => {
    if (!amountIn) return BigInt(0);
    try {
      return parseUnits(amountIn, 18);
    } catch {
      return BigInt(0);
    }
  }, [amountIn]);

  // Lock duration in seconds
  const lockDurationSeconds = useMemo(() => {
    return BigInt(lockWeeks * 7 * 24 * 3600);
  }, [lockWeeks]);

  // --- MEGA token balance ---
  const { data: rawBalanceData, refetch: refetchBalance } = useReadContract({
    address: tokenAddress,
    abi: ABIS.ERC20,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!tokenAddress,
    },
  });

  const rawBalance = (rawBalanceData as bigint) ?? BigInt(0);
  const balance = formatUnits(rawBalance, 18);
  const insufficientBalance = amountBigInt > BigInt(0) && amountBigInt > rawBalance;

  // --- Allowance for VotingEscrow ---
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ABIS.ERC20,
    functionName: "allowance",
    args:
      address && votingEscrowAddress
        ? [address, votingEscrowAddress]
        : undefined,
    query: {
      enabled: !!address && !!tokenAddress && !!votingEscrowAddress,
    },
  });

  const needsApproval =
    allowanceData !== undefined &&
    (allowanceData as bigint) < amountBigInt &&
    amountBigInt > BigInt(0);

  // --- Write contracts ---

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
    writeContractAsync: createLockAsync,
    isPending: isCreatePending,
    data: createTxHash,
  } = useWriteContract();

  const { isLoading: isCreateConfirming } = useWaitForTransactionReceipt({
    hash: createTxHash,
  });

  const isCreating = isCreatePending || isCreateConfirming;

  // --- Actions ---

  const approve = useCallback(async () => {
    if (!tokenAddress || !votingEscrowAddress) return;
    setError(null);

    try {
      const hash = await approveAsync({
        address: tokenAddress,
        abi: ABIS.ERC20,
        functionName: "approve",
        args: [votingEscrowAddress, amountBigInt],
      });

      if (hash) {
        const receipt = await waitForTransactionReceipt(config, {
          hash,
          confirmations: 1,
        });
        if (receipt.status === "success") {
          await refetchAllowance();
        }
      }
    } catch (err) {
      const msg = parseLockError(err);
      setError(msg);
      throw err;
    }
  }, [
    tokenAddress,
    votingEscrowAddress,
    approveAsync,
    amountBigInt,
    refetchAllowance,
    config,
  ]);

  const createLock = useCallback(async () => {
    if (!votingEscrowAddress || amountBigInt === BigInt(0)) return;
    setError(null);

    try {
      const hash = await createLockAsync({
        address: votingEscrowAddress,
        abi: ABIS.VotingEscrow,
        functionName: "createLock",
        args: [amountBigInt, lockDurationSeconds],
      });

      // Refetch balance after successful lock creation
      await refetchBalance();

      return hash;
    } catch (err) {
      const msg = parseLockError(err);
      setError(msg);
      throw err;
    }
  }, [
    votingEscrowAddress,
    createLockAsync,
    amountBigInt,
    lockDurationSeconds,
    refetchBalance,
  ]);

  return {
    balance,
    rawBalance,
    insufficientBalance,
    needsApproval,
    approve,
    isApproving,
    createLock,
    isCreating,
    error,
    clearError: () => setError(null),
    lastTxHash: createTxHash,
  };
}
