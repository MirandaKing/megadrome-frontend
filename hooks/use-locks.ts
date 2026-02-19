"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useReadContracts,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { formatUnits, Address } from "viem";
import { ADDRESSES, ABIS } from "@/lib/contracts";

export interface LockInfo {
  tokenId: bigint;
  lockedAmount: string;
  lockedAmountRaw: bigint;
  votingPower: string;
  votingPowerRaw: bigint;
  unlockDate: Date;
  unlockTimestamp: number;
  isExpired: boolean;
  remainingWeeks: number;
  lockDurationWeeks: number;
  rebaseApr: string | null;
  claimable: string;
  claimableRaw: bigint;
}

interface EnvioVeNFTState {
  tokenId: string;
  locktime: string;
  totalValueLocked: string;
}

export function useLocks() {
  const { address, chainId } = useAccount();

  const addresses = chainId ? ADDRESSES[chainId] : undefined;
  const votingEscrowAddress = addresses?.votingEscrow as Address | undefined;
  const rewardsDistributorAddress = addresses?.rewardsDistributor as
    | Address
    | undefined;
  const minterAddress = addresses?.minter as Address | undefined;

  const [envioLocks, setEnvioLocks] = useState<EnvioVeNFTState[]>([]);
  const [envioLoading, setEnvioLoading] = useState(false);

  const loadLocks = (addr: string) => {
    let cancelled = false;
    setEnvioLoading(true);

    fetch(`/api/locks?address=${addr}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setEnvioLocks(json?.data?.VeNFTState ?? []);
      })
      .catch(() => {
        if (!cancelled) setEnvioLocks([]);
      })
      .finally(() => {
        if (!cancelled) setEnvioLoading(false);
      });

    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    if (!address) {
      setEnvioLocks([]);
      return;
    }
    return loadLocks(address);
  }, [address]);

  const tokenIds: bigint[] = useMemo(
    () => envioLocks.map((l) => BigInt(l.tokenId)),
    [envioLocks]
  );

  // Batch read: voting power per lock
  const vpContracts = useMemo(
    () =>
      tokenIds.map((tokenId) => ({
        address: votingEscrowAddress!,
        abi: ABIS.VotingEscrow,
        functionName: "balanceOfNFT" as const,
        args: [tokenId],
      })),
    [tokenIds, votingEscrowAddress]
  );

  const { data: vpResults } = useReadContracts({
    contracts: vpContracts,
    query: { enabled: tokenIds.length > 0 && !!votingEscrowAddress },
  });

  // Batch read: claimable rebase per lock
  const claimableContracts = useMemo(
    () =>
      tokenIds.map((tokenId) => ({
        address: rewardsDistributorAddress!,
        abi: ABIS.RewardsDistributor,
        functionName: "claimable" as const,
        args: [tokenId],
      })),
    [tokenIds, rewardsDistributorAddress]
  );

  const { data: claimableResults } = useReadContracts({
    contracts: claimableContracts,
    query: { enabled: tokenIds.length > 0 && !!rewardsDistributorAddress },
  });

  // Protocol-level reads for rebase APR calculation
  const { data: weeklyEmission } = useReadContract({
    address: minterAddress,
    abi: ABIS.Minter,
    functionName: "weekly",
    query: { enabled: !!minterAddress },
  });

  const { data: totalSupply } = useReadContract({
    address: votingEscrowAddress,
    abi: ABIS.VotingEscrow,
    functionName: "supply",
    query: { enabled: !!votingEscrowAddress },
  });

  // calculate_rebate depends on weeklyEmission, so chain this read
  const { data: weeklyRebase } = useReadContract({
    address: minterAddress,
    abi: ABIS.Minter,
    functionName: "calculate_rebate",
    args: [weeklyEmission ?? BigInt(0)],
    query: {
      enabled:
        !!minterAddress && !!weeklyEmission && weeklyEmission > BigInt(0),
    },
  });

  // Rebase APR = (weeklyRebase / totalSupply) * 52 * 100
  // Protocol-wide rate — the same for all locks
  const rebaseApr = useMemo(() => {
    if (!weeklyRebase || !totalSupply || totalSupply === BigInt(0)) return null;
    const aprBps = (weeklyRebase * BigInt(52) * BigInt(10000)) / totalSupply;
    return `${(Number(aprBps) / 100).toFixed(2)}%`;
  }, [weeklyRebase, totalSupply]);

  // Claim rebase for a lock — auto-compounds back into the lock via RewardsDistributor
  const { writeContract, isPending: isClaiming } = useWriteContract();

  const claim = (tokenId: bigint) => {
    if (!rewardsDistributorAddress) return;
    writeContract({
      address: rewardsDistributorAddress,
      abi: ABIS.RewardsDistributor,
      functionName: "claim",
      args: [tokenId],
    });
  };

  const locks: LockInfo[] = useMemo(() => {
    if (envioLocks.length === 0) return [];
    const now = Math.floor(Date.now() / 1000);

    return envioLocks.map((envioLock, i) => {
      const unlockTimestamp = Number(envioLock.locktime);
      const unlockDate = new Date(unlockTimestamp * 1000);
      const isExpired = unlockTimestamp <= now;
      const remainingSeconds = Math.max(0, unlockTimestamp - now);
      const remainingWeeks = Math.ceil(remainingSeconds / (7 * 24 * 3600));
      const lockDurationWeeks = Math.min(208, remainingWeeks);

      const tvlRaw = BigInt(envioLock.totalValueLocked);
      const lockedAmountRaw = tvlRaw < BigInt(0) ? -tvlRaw : tvlRaw;

      const vpResult = vpResults?.[i];
      const votingPowerRaw =
        vpResult?.status === "success"
          ? (vpResult.result as bigint)
          : BigInt(0);

      const claimableResult = claimableResults?.[i];
      const claimableRaw =
        claimableResult?.status === "success"
          ? (claimableResult.result as bigint)
          : BigInt(0);

      const info: LockInfo = {
        tokenId: BigInt(envioLock.tokenId),
        lockedAmount: formatUnits(lockedAmountRaw, 18),
        lockedAmountRaw,
        votingPower: formatUnits(votingPowerRaw, 18),
        votingPowerRaw,
        unlockDate,
        unlockTimestamp,
        isExpired,
        remainingWeeks,
        lockDurationWeeks,
        rebaseApr,
        claimable: formatUnits(claimableRaw, 18),
        claimableRaw,
      };
      return info;
    });
  }, [envioLocks, vpResults, claimableResults, rebaseApr]);

  const isLoading = envioLoading && locks.length === 0;
  const refetch = () => {
    if (address) loadLocks(address);
  };

  return { locks, isLoading, refetch, claim, isClaiming };
}
