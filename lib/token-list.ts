import { Address } from "viem";
import { MONAD_CONTRACTS } from "./contracts";

export interface TokenInfo {
  id: string;
  address: Address | null; // null for native MON
  chain: string;
  decimals: number;
  name: string;
  symbol: string;
  logoUrl: string;
  safetyLevel: string;
  standard: "NATIVE" | "ERC20";
}

/**
 * Resolve the on-chain address for routing purposes.
 * Native MON (address: null) maps to WMON for DEX interactions.
 */
export function getRoutingAddress(token: TokenInfo): Address {
  if (token.address === null) {
    return MONAD_CONTRACTS.WMON;
  }
  return token.address;
}

export function isNativeToken(token: TokenInfo): boolean {
  return token.address === null || token.standard === "NATIVE";
}

/**
 * Canonical token list for Megadrome on Monad.
 * This list will be extended via subgraph as new pairs are created.
 */
export const TOKEN_LIST: TokenInfo[] = [
  {
    id: "mon-native",
    address: null,
    chain: "MONAD",
    decimals: 18,
    name: "Monad",
    symbol: "MON",
    logoUrl:
      "https://assets.coingecko.com/coins/images/38927/large/monad.jpg?1719547722",
    safetyLevel: "VERIFIED",
    standard: "NATIVE",
  },
  {
    id: "wmon",
    address: MONAD_CONTRACTS.WMON,
    chain: "MONAD",
    decimals: 18,
    name: "Wrapped MON",
    symbol: "WMON",
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/70784/large/wmon.png?1766028904",
    safetyLevel: "VERIFIED",
    standard: "ERC20",
  },
  {
    id: "usdc-monad",
    address: MONAD_CONTRACTS.USDC,
    chain: "MONAD",
    decimals: 6,
    name: "USD Coin",
    symbol: "USDC",
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694",
    safetyLevel: "VERIFIED",
    standard: "ERC20",
  },
  {
    id: "usdt-monad",
    address: MONAD_CONTRACTS.USDT,
    chain: "MONAD",
    decimals: 6,
    name: "Tether USD",
    symbol: "USDT",
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/325/large/Tether.png",
    safetyLevel: "VERIFIED",
    standard: "ERC20",
  },
  {
    id: "weth-monad",
    address: MONAD_CONTRACTS.WETH,
    chain: "MONAD",
    decimals: 18,
    name: "Wrapped Ether",
    symbol: "WETH",
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/2518/large/weth.png",
    safetyLevel: "VERIFIED",
    standard: "ERC20",
  },
  {
    id: "wbtc-monad",
    address: MONAD_CONTRACTS.WBTC,
    chain: "MONAD",
    decimals: 8,
    name: "Wrapped Bitcoin",
    symbol: "WBTC",
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png",
    safetyLevel: "VERIFIED",
    standard: "ERC20",
  },
  {
    id: "wsteth-monad",
    address: MONAD_CONTRACTS.wstETH,
    chain: "MONAD",
    decimals: 18,
    name: "Wrapped stETH",
    symbol: "wstETH",
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/18834/large/wstETH.png",
    safetyLevel: "VERIFIED",
    standard: "ERC20",
  },
  {
    id: "ausd-monad",
    address: "0x00000000efe302beaa2b3e6e1b18d08d69a9012a" as Address,
    chain: "MONAD",
    decimals: 6,
    name: "AUSD",
    symbol: "AUSD",
    logoUrl:
      "https://coin-images.coingecko.com/coins/images/39284/large/AUSD_1024px.png?1764684132",
    safetyLevel: "VERIFIED",
    standard: "ERC20",
  },
  {
    id: "bbz-monad",
    address: "0x0F498298F4a480883d52B854b628EdA82dA3158c" as Address,
    chain: "MONAD",
    decimals: 18,
    name: "Buri Buri Zeamon",
    symbol: "BBZ",
    logoUrl:
      "https://cdn.shopify.com/s/files/1/0590/1271/0563/files/udf-ultra-detail-figure-no-731-crayon-shin-chan-buri-buri-zaemon-renewal-version-985134.jpg?v=1737717917",
    safetyLevel: "UNVERIFIED",
    standard: "ERC20",
  },
  {
    id: "qubot-monad",
    address: "0x22c09e09a2410d0b15FbfE21b681F39C0f46e14c" as Address,
    chain: "MONAD",
    decimals: 18,
    name: "Quantum Robot",
    symbol: "QUBOT",
    logoUrl: "https://www.1999.co.jp/itbig26/10260930a13_m.jpg",
    safetyLevel: "UNVERIFIED",
    standard: "ERC20",
  },
];

export function getTokenBySymbol(symbol: string): TokenInfo | undefined {
  return TOKEN_LIST.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase()
  );
}

export function getTokenByAddress(address: Address): TokenInfo | undefined {
  return TOKEN_LIST.find(
    (t) => t.address?.toLowerCase() === address.toLowerCase()
  );
}
