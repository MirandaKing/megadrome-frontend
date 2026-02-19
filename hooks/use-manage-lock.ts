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
import { parseUnits, isAddress, Address } from "viem";
import { ADDRESSES, ABIS } from "@/lib/contracts";

function parseManageError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("user rejected") || message.includes("User denied"))
    return "Transaction rejected by user";
  if (message.includes("insufficient funds"))
    return "Insufficient funds for gas";
  return "Transaction failed. Please try again.";
}

// ── Increase Amount ───────────────────────────────────────────────────────────
export function useIncreaseAmount(tokenId: bigint, amountIn: string) {
  const config = useConfig();
  const { address, chainId } = useConnection();
  const [error, setError] = useState<string | null>(null);

  const addresses = chainId ? ADDRESSES[chainId] : undefined;
  const tokenAddress = addresses?.token as Address | undefined;
  const votingEscrowAddress = addresses?.votingEscrow as Address | undefined;

  const amountBigInt = useMemo(() => {
    if (!amountIn) return BigInt(0);
    try { return parseUnits(amountIn, 18); } catch { return BigInt(0); }
  }, [amountIn]);

  // MEGA balance
  const { data: rawBalanceData } = useReadContract({
    address: tokenAddress,
    abi: ABIS.ERC20,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!tokenAddress },
  });
  const rawBalance = (rawBalanceData as bigint) ?? BigInt(0);

  // Allowance
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ABIS.ERC20,
    functionName: "allowance",
    args: address && votingEscrowAddress ? [address, votingEscrowAddress] : undefined,
    query: { enabled: !!address && !!tokenAddress && !!votingEscrowAddress },
  });
  const needsApproval =
    allowanceData !== undefined &&
    (allowanceData as bigint) < amountBigInt &&
    amountBigInt > BigInt(0);

  const { writeContractAsync: approveAsync, isPending: isApprovePending, data: approveTxHash } = useWriteContract();
  const { isLoading: isApproveConfirming } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const isApproving = isApprovePending || isApproveConfirming;

  const { writeContractAsync: increaseAsync, isPending: isIncreasePending, data: increaseTxHash } = useWriteContract();
  const { isLoading: isIncreaseConfirming } = useWaitForTransactionReceipt({ hash: increaseTxHash });
  const isIncreasing = isIncreasePending || isIncreaseConfirming;

  const approve = useCallback(async () => {
    if (!tokenAddress || !votingEscrowAddress) return;
    setError(null);
    try {
      const hash = await approveAsync({
        address: tokenAddress, abi: ABIS.ERC20, functionName: "approve",
        args: [votingEscrowAddress, amountBigInt],
      });
      if (hash) {
        const receipt = await waitForTransactionReceipt(config, { hash, confirmations: 1 });
        if (receipt.status === "success") await refetchAllowance();
      }
    } catch (err) { const msg = parseManageError(err); setError(msg); throw err; }
  }, [tokenAddress, votingEscrowAddress, approveAsync, amountBigInt, refetchAllowance, config]);

  const increaseAmount = useCallback(async () => {
    if (!votingEscrowAddress || amountBigInt === BigInt(0)) return;
    setError(null);
    try {
      const hash = await increaseAsync({
        address: votingEscrowAddress, abi: ABIS.VotingEscrow,
        functionName: "increaseAmount", args: [tokenId, amountBigInt],
      });
      return hash;
    } catch (err) { const msg = parseManageError(err); setError(msg); throw err; }
  }, [votingEscrowAddress, increaseAsync, tokenId, amountBigInt]);

  return {
    rawBalance, amountBigInt, needsApproval, approve, isApproving,
    increaseAmount, isIncreasing, error, clearError: () => setError(null),
    insufficientBalance: amountBigInt > BigInt(0) && amountBigInt > rawBalance,
    lastTxHash: increaseTxHash,
  };
}

// ── Extend Unlock Time ────────────────────────────────────────────────────────
export function useExtendLock(tokenId: bigint, newLockWeeks: number) {
  const { chainId } = useConnection();
  const [error, setError] = useState<string | null>(null);

  const addresses = chainId ? ADDRESSES[chainId] : undefined;
  const votingEscrowAddress = addresses?.votingEscrow as Address | undefined;

  const lockDurationSeconds = useMemo(
    () => BigInt(newLockWeeks * 7 * 24 * 3600),
    [newLockWeeks]
  );

  const { writeContractAsync: extendAsync, isPending: isExtendPending, data: extendTxHash } = useWriteContract();
  const { isLoading: isExtendConfirming } = useWaitForTransactionReceipt({ hash: extendTxHash });
  const isExtending = isExtendPending || isExtendConfirming;

  const extendLock = useCallback(async () => {
    if (!votingEscrowAddress) return;
    setError(null);
    try {
      const hash = await extendAsync({
        address: votingEscrowAddress, abi: ABIS.VotingEscrow,
        functionName: "increaseUnlockTime", args: [tokenId, lockDurationSeconds],
      });
      return hash;
    } catch (err) { const msg = parseManageError(err); setError(msg); throw err; }
  }, [votingEscrowAddress, extendAsync, tokenId, lockDurationSeconds]);

  return { extendLock, isExtending, error, clearError: () => setError(null), lastTxHash: extendTxHash };
}

// ── Merge ─────────────────────────────────────────────────────────────────────
export function useMergeLock(fromTokenId: bigint, toTokenId: bigint | null) {
  const { chainId } = useConnection();
  const [error, setError] = useState<string | null>(null);

  const addresses = chainId ? ADDRESSES[chainId] : undefined;
  const votingEscrowAddress = addresses?.votingEscrow as Address | undefined;

  const { writeContractAsync: mergeAsync, isPending: isMergePending, data: mergeTxHash } = useWriteContract();
  const { isLoading: isMergeConfirming } = useWaitForTransactionReceipt({ hash: mergeTxHash });
  const isMerging = isMergePending || isMergeConfirming;

  const mergeLock = useCallback(async () => {
    if (!votingEscrowAddress || !toTokenId) return;
    setError(null);
    try {
      const hash = await mergeAsync({
        address: votingEscrowAddress, abi: ABIS.VotingEscrow,
        functionName: "merge", args: [fromTokenId, toTokenId],
      });
      return hash;
    } catch (err) { const msg = parseManageError(err); setError(msg); throw err; }
  }, [votingEscrowAddress, mergeAsync, fromTokenId, toTokenId]);

  return { mergeLock, isMerging, error, clearError: () => setError(null), lastTxHash: mergeTxHash };
}

// ── Transfer ──────────────────────────────────────────────────────────────────
export function useTransferLock(tokenId: bigint, toAddress: string) {
  const { address, chainId } = useConnection();
  const [error, setError] = useState<string | null>(null);

  const addresses = chainId ? ADDRESSES[chainId] : undefined;
  const votingEscrowAddress = addresses?.votingEscrow as Address | undefined;

  const isValidAddress = isAddress(toAddress);

  const { writeContractAsync: transferAsync, isPending: isTransferPending, data: transferTxHash } = useWriteContract();
  const { isLoading: isTransferConfirming } = useWaitForTransactionReceipt({ hash: transferTxHash });
  const isTransferring = isTransferPending || isTransferConfirming;

  const transferLock = useCallback(async () => {
    if (!votingEscrowAddress || !address || !isValidAddress) return;
    setError(null);
    try {
      const hash = await transferAsync({
        address: votingEscrowAddress, abi: ABIS.VotingEscrow,
        functionName: "transferFrom",
        args: [address, toAddress as Address, tokenId],
      });
      return hash;
    } catch (err) { const msg = parseManageError(err); setError(msg); throw err; }
  }, [votingEscrowAddress, transferAsync, address, toAddress, tokenId, isValidAddress]);

  return { transferLock, isTransferring, isValidAddress, error, clearError: () => setError(null), lastTxHash: transferTxHash };
}
