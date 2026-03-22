"use client";

import { useCallback } from "react";
import {
  useAccount,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
  useConfig,
} from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import {
  type Address,
  ContractFunctionRevertedError,
  ContractFunctionExecutionError,
} from "viem";
import { ADDRESSES, ABIS } from "@/lib/contracts";

const CHAIN_ID = 143;
const WEEK = 604800; // 7 days in seconds

// ── Epoch helpers (mirrors ProtocolTimeLibrary) ────────────────────────────
// epochVoteEnd = start of NEXT epoch - 1 hour
// Voting is only allowed BEFORE epochVoteEnd
function epochStart(nowSec: number): number {
  return Math.floor(nowSec / WEEK) * WEEK;
}
function epochVoteEnd(nowSec: number): number {
  return epochStart(nowSec) + WEEK - 3600; // last hour is blocked
}

export type VoteStatus =
  | "idle"
  | "outside_window" // past epochVoteEnd
  | "already_voted"  // tokenId already voted this epoch
  | "ready"          // can vote

export interface VoteState {
  status: VoteStatus;
  epochEndsIn: string; // human-readable countdown
  voteWindowClosesIn: string; // human-readable countdown to close
}

export function useVoteStatus(tokenId: bigint | undefined): VoteState {
  const addresses = ADDRESSES[CHAIN_ID];
  const nowSec = Math.floor(Date.now() / 1000);
  const voteEnd = epochVoteEnd(nowSec);
  const nextEpoch = epochStart(nowSec) + WEEK;

  const { data } = useReadContracts({
    contracts: tokenId != null
      ? [
          {
            address: addresses?.voter as Address,
            abi: ABIS.Voter,
            functionName: "lastVoted" as const,
            args: [tokenId],
          },
          {
            address: addresses?.voter as Address,
            abi: ABIS.Voter,
            functionName: "isWhitelistedNFT" as const,
            args: [tokenId],
          },
        ]
      : [],
    query: { enabled: tokenId != null && !!addresses?.voter },
  });

  const lastVotedTs = Number((data?.[0]?.result as bigint | undefined) ?? 0n);
  const isWhitelisted = (data?.[1]?.result as boolean | undefined) ?? false;
  const alreadyVotedThisEpoch = lastVotedTs >= epochStart(nowSec);

  // Blocked past epochVoteEnd unless whitelisted
  const outsideWindow = nowSec > voteEnd && !isWhitelisted;

  function fmtCountdown(seconds: number): string {
    if (seconds <= 0) return "now";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  const status: VoteStatus = outsideWindow
    ? "outside_window"
    : alreadyVotedThisEpoch
    ? "already_voted"
    : "ready";

  return {
    status,
    epochEndsIn: fmtCountdown(nextEpoch - nowSec),
    voteWindowClosesIn: fmtCountdown(voteEnd - nowSec),
  };
}

// ── Main vote hook ─────────────────────────────────────────────────────────

export interface UseVoteReturn {
  castVote: (
    tokenId: bigint,
    pools: Address[],
    weights: number[] // percentages 0-100, must sum to 100
  ) => Promise<void>;
  isPending: boolean;
  isConfirming: boolean;
  txHash: `0x${string}` | undefined;
  error: string | null;
}

// Unwrap viem's ContractFunctionExecutionError → ContractFunctionRevertedError
function extractRevertError(err: unknown): ContractFunctionRevertedError | null {
  if (err instanceof ContractFunctionRevertedError) return err;
  if (
    err instanceof ContractFunctionExecutionError &&
    err.cause instanceof ContractFunctionRevertedError
  )
    return err.cause;
  return null;
}

function parseVoteError(err: unknown): string {
  const revert = extractRevertError(err);
  if (revert) {
    const name = revert.data?.errorName ?? "";
    const msg = revert.shortMessage ?? "";
    const reason = name || msg;
    if (reason.includes("AlreadyVotedOrDeposited"))
      return "This lock already voted in the current epoch. Wait for the next epoch.";
    if (reason.includes("NotApprovedOrOwner"))
      return "You are not the owner of this lock.";
    if (reason.includes("NotWhitelistedNFT") || reason.includes("SpecialVotingWindow"))
      return "Voting window is closed for this epoch (last hour blocked). Try again next epoch.";
    if (reason.includes("TooManyPools"))
      return "Too many pools selected. Reduce your selection.";
    if (reason.includes("UnequalLengths"))
      return "Pool and weight arrays must match.";
    if (reason.includes("InactiveManagedNFT"))
      return "This lock has been deactivated.";
    return `Contract reverted: ${reason || "unknown reason"}`;
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("user rejected") || msg.includes("User denied"))
    return "Transaction rejected by user.";
  return "Vote failed. Please try again.";
}

export function useVote(): UseVoteReturn {
  const { address } = useAccount();
  const config = useConfig();
  const publicClient = usePublicClient();
  const addresses = ADDRESSES[CHAIN_ID];

  const {
    writeContractAsync,
    isPending,
    data: txHash,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const castVote = useCallback(
    async (tokenId: bigint, pools: Address[], pcts: number[]) => {
      if (!addresses?.voter || !address || !publicClient) return;

      // Convert percentages to bigint weights (pass raw percentages — contract normalizes)
      const weights = pcts.map((p) => BigInt(Math.round(p)));

      // Simulate first to get a clear revert reason
      try {
        await publicClient.simulateContract({
          address: addresses.voter as Address,
          abi: ABIS.Voter,
          functionName: "vote",
          args: [tokenId, pools, weights],
          account: address,
        });
      } catch (simErr) {
        // Block on any contract revert (handles both direct and wrapped errors)
        if (extractRevertError(simErr)) {
          throw new Error(parseVoteError(simErr));
        }
        // Pure RPC / infrastructure error — warn and let writeContract try anyway
        console.warn("Vote simulation infrastructure error:", simErr);
      }

      // Execute
      const hash = await writeContractAsync({
        address: addresses.voter as Address,
        abi: ABIS.Voter,
        functionName: "vote",
        args: [tokenId, pools, weights],
      });

      await waitForTransactionReceipt(config, { hash, confirmations: 1 });
    },
    [addresses, address, publicClient, writeContractAsync, config]
  );

  return {
    castVote,
    isPending,
    isConfirming,
    txHash,
    error: null, // errors thrown directly from castVote — caller handles
  };
}
