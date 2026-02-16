import { Address } from "viem";

// Time constants
export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 3600;
export const SECONDS_PER_DAY = 86400;
export const SECONDS_PER_WEEK = 604800;

// Lock durations
export const MIN_LOCK_DURATION = SECONDS_PER_WEEK; // 1 week
export const MAX_LOCK_DURATION = SECONDS_PER_WEEK * 26; // 26 weeks

// Epoch duration (for voting)
export const EPOCH_DURATION = SECONDS_PER_WEEK;

// Slippage defaults
export const DEFAULT_SLIPPAGE = 0.5; // 0.5%
export const SLIPPAGE_OPTIONS = [0.1, 0.5, 1.0];

// Transaction deadline
export const DEFAULT_DEADLINE_MINUTES = 30;

// Common tokens on Monad (for quick selection)
export const COMMON_TOKENS: Address[] = [
  "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A", // WMON
  "0x754704Bc059F8C67012fEd69BC8A327a5aafb603", // USDC
  "0xe7cd86e13AC4309349F30B3435a9d337750fC82D", // USDT
  "0xEE8c0E9f1BFFb4Eb878d8f15f368A02a35481242", // WETH
  "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c", // WBTC
];

// Zero address
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

// Max uint256 for approvals
export const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
