import { Address } from "viem";

// Monad canonical contract addresses
export const MONAD_CONTRACTS = {
  WMON: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A" as Address,
  MULTICALL3: "0xcA11bde05977b3631167028862bE2a173976CA11" as Address,
  PERMIT2: "0x000000000022d473030f116ddee9f6b43ac78ba3" as Address,
  USDC: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603" as Address,
  USDT: "0xe7cd86e13AC4309349F30B3435a9d337750fC82D" as Address,
  WETH: "0xEE8c0E9f1BFFb4Eb878d8f15f368A02a35481242" as Address,
  WBTC: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c" as Address,
  wstETH: "0x10Aeaf63194db8d453d4D85a06E5eFE1dd0b5417" as Address,
};

// DEX contract addresses
export const ADDRESSES: Record<
  number,
  {
    token: Address;
    votingEscrow: Address;
    router: Address;
    pairFactory: Address;
    voter: Address;
    minter: Address;
    rewardsDistributor: Address;
    weth: Address;
  }
> = {
  // Monad Mainnet (143)
  143: {
    token: process.env.NEXT_PUBLIC_MEGA as Address,
    votingEscrow: process.env.NEXT_PUBLIC_VOTING_ESCROW as Address,
    router: process.env.NEXT_PUBLIC_ROUTER as Address,
    pairFactory: process.env.NEXT_PUBLIC_POOL_FACTORY as Address,
    voter: process.env.NEXT_PUBLIC_VOTER as Address,
    minter: process.env.NEXT_PUBLIC_MINTER as Address,
    rewardsDistributor: process.env.NEXT_PUBLIC_DISTRIBUTOR as Address,
    weth: MONAD_CONTRACTS.WMON,
  },
};

// ABIs - minimal ABIs for the functions we need
export const ABIS = {
  ERC20: [
    {
      name: "name",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "string" }],
    },
    {
      name: "symbol",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "string" }],
    },
    {
      name: "decimals",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "uint8" }],
    },
    {
      name: "balanceOf",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ type: "uint256" }],
    },
    {
      name: "allowance",
      type: "function",
      stateMutability: "view",
      inputs: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
      ],
      outputs: [{ type: "uint256" }],
    },
    {
      name: "approve",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "spender", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ type: "bool" }],
    },
    {
      name: "transfer",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ type: "bool" }],
    },
  ],
  Router: [
    {
      name: "getAmountOut",
      type: "function",
      stateMutability: "view",
      inputs: [
        { name: "amountIn", type: "uint256" },
        { name: "tokenIn", type: "address" },
        { name: "tokenOut", type: "address" },
      ],
      outputs: [
        { name: "amount", type: "uint256" },
        { name: "stable", type: "bool" },
      ],
    },
    {
      name: "getAmountsOut",
      type: "function",
      stateMutability: "view",
      inputs: [
        { name: "amountIn", type: "uint256" },
        {
          name: "routes",
          type: "tuple[]",
          components: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "stable", type: "bool" },
            { name: "factory", type: "address" },
          ],
        },
      ],
      outputs: [{ name: "amounts", type: "uint256[]" }],
    },
    {
      name: "swapExactTokensForTokens",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "amountIn", type: "uint256" },
        { name: "amountOutMin", type: "uint256" },
        {
          name: "routes",
          type: "tuple[]",
          components: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "stable", type: "bool" },
            { name: "factory", type: "address" },
          ],
        },
        { name: "to", type: "address" },
        { name: "deadline", type: "uint256" },
      ],
      outputs: [{ name: "amounts", type: "uint256[]" }],
    },
    {
      name: "swapExactETHForTokens",
      type: "function",
      stateMutability: "payable",
      inputs: [
        { name: "amountOutMin", type: "uint256" },
        {
          name: "routes",
          type: "tuple[]",
          components: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "stable", type: "bool" },
            { name: "factory", type: "address" },
          ],
        },
        { name: "to", type: "address" },
        { name: "deadline", type: "uint256" },
      ],
      outputs: [{ name: "amounts", type: "uint256[]" }],
    },
    {
      name: "swapExactTokensForETH",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "amountIn", type: "uint256" },
        { name: "amountOutMin", type: "uint256" },
        {
          name: "routes",
          type: "tuple[]",
          components: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "stable", type: "bool" },
            { name: "factory", type: "address" },
          ],
        },
        { name: "to", type: "address" },
        { name: "deadline", type: "uint256" },
      ],
      outputs: [{ name: "amounts", type: "uint256[]" }],
    },
    {
      name: "addLiquidity",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "tokenA", type: "address" },
        { name: "tokenB", type: "address" },
        { name: "stable", type: "bool" },
        { name: "amountADesired", type: "uint256" },
        { name: "amountBDesired", type: "uint256" },
        { name: "amountAMin", type: "uint256" },
        { name: "amountBMin", type: "uint256" },
        { name: "to", type: "address" },
        { name: "deadline", type: "uint256" },
      ],
      outputs: [
        { name: "amountA", type: "uint256" },
        { name: "amountB", type: "uint256" },
        { name: "liquidity", type: "uint256" },
      ],
    },
    {
      name: "removeLiquidity",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "tokenA", type: "address" },
        { name: "tokenB", type: "address" },
        { name: "stable", type: "bool" },
        { name: "liquidity", type: "uint256" },
        { name: "amountAMin", type: "uint256" },
        { name: "amountBMin", type: "uint256" },
        { name: "to", type: "address" },
        { name: "deadline", type: "uint256" },
      ],
      outputs: [
        { name: "amountA", type: "uint256" },
        { name: "amountB", type: "uint256" },
      ],
    },
  ],
  VotingEscrow: [
    {
      name: "createLock",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "_value", type: "uint256" },
        { name: "_lockDuration", type: "uint256" },
      ],
      outputs: [{ name: "", type: "uint256" }],
    },
    {
      name: "increaseAmount",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "_tokenId", type: "uint256" },
        { name: "_value", type: "uint256" },
      ],
      outputs: [],
    },
    {
      name: "increaseUnlockTime",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "_tokenId", type: "uint256" },
        { name: "_lockDuration", type: "uint256" },
      ],
      outputs: [],
    },
    {
      name: "merge",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "_from", type: "uint256" },
        { name: "_to", type: "uint256" },
      ],
      outputs: [],
    },
    {
      name: "transferFrom",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "_from", type: "address" },
        { name: "_to", type: "address" },
        { name: "_tokenId", type: "uint256" },
      ],
      outputs: [],
    },
    {
      name: "withdraw",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [{ name: "_tokenId", type: "uint256" }],
      outputs: [],
    },
    {
      name: "balanceOf",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "_owner", type: "address" }],
      outputs: [{ type: "uint256" }],
    },
    {
      name: "ownerOf",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "_tokenId", type: "uint256" }],
      outputs: [{ type: "address" }],
    },
    {
      name: "tokenOfOwnerByIndex",
      type: "function",
      stateMutability: "view",
      inputs: [
        { name: "_owner", type: "address" },
        { name: "_tokenIndex", type: "uint256" },
      ],
      outputs: [{ type: "uint256" }],
    },
    {
      name: "locked",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "_tokenId", type: "uint256" }],
      outputs: [
        {
          name: "",
          type: "tuple",
          components: [
            { name: "amount", type: "int128" },
            { name: "end", type: "uint256" },
          ],
        },
      ],
    },
    {
      name: "balanceOfNFT",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "_tokenId", type: "uint256" }],
      outputs: [{ type: "uint256" }],
    },
    {
      name: "supply",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "uint256" }],
    },
  ],
  Voter: [
    {
      name: "vote",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "_tokenId", type: "uint256" },
        { name: "_poolVote", type: "address[]" },
        { name: "_weights", type: "uint256[]" },
      ],
      outputs: [],
    },
    {
      name: "reset",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [{ name: "_tokenId", type: "uint256" }],
      outputs: [],
    },
    {
      name: "claimBribes",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "_bribes", type: "address[]" },
        { name: "_tokens", type: "address[][]" },
        { name: "_tokenId", type: "uint256" },
      ],
      outputs: [],
    },
    {
      name: "claimFees",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "_fees", type: "address[]" },
        { name: "_tokens", type: "address[][]" },
        { name: "_tokenId", type: "uint256" },
      ],
      outputs: [],
    },
  ],
  Gauge: [
    {
      name: "deposit",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "amount", type: "uint256" },
        { name: "tokenId", type: "uint256" },
      ],
      outputs: [],
    },
    {
      name: "withdraw",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [{ name: "amount", type: "uint256" }],
      outputs: [],
    },
    {
      name: "getReward",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "account", type: "address" },
        { name: "tokens", type: "address[]" },
      ],
      outputs: [],
    },
    {
      name: "earned",
      type: "function",
      stateMutability: "view",
      inputs: [
        { name: "token", type: "address" },
        { name: "account", type: "address" },
      ],
      outputs: [{ type: "uint256" }],
    },
    {
      name: "balanceOf",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ type: "uint256" }],
    },
  ],
  Pair: [
    {
      name: "token0",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "address" }],
    },
    {
      name: "token1",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "address" }],
    },
    {
      name: "stable",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "bool" }],
    },
    {
      name: "getReserves",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [
        { name: "_reserve0", type: "uint256" },
        { name: "_reserve1", type: "uint256" },
        { name: "_blockTimestampLast", type: "uint256" },
      ],
    },
    {
      name: "totalSupply",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "uint256" }],
    },
  ],
  PairFactory: [
    {
      name: "allPairsLength",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "uint256" }],
    },
    {
      name: "allPairs",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "", type: "uint256" }],
      outputs: [{ type: "address" }],
    },
    {
      name: "getPair",
      type: "function",
      stateMutability: "view",
      inputs: [
        { name: "tokenA", type: "address" },
        { name: "tokenB", type: "address" },
        { name: "stable", type: "bool" },
      ],
      outputs: [{ type: "address" }],
    },
    {
      name: "isPair",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "pair", type: "address" }],
      outputs: [{ type: "bool" }],
    },
  ],
  WMON: [
    {
      name: "deposit",
      type: "function",
      stateMutability: "payable",
      inputs: [],
      outputs: [],
    },
    {
      name: "withdraw",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [{ name: "amount", type: "uint256" }],
      outputs: [],
    },
    {
      name: "balanceOf",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ type: "uint256" }],
    },
  ],
  RewardsDistributor: [
    {
      name: "claimable",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "_tokenId", type: "uint256" }],
      outputs: [{ type: "uint256" }],
    },
    {
      name: "claim",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [{ name: "_tokenId", type: "uint256" }],
      outputs: [{ type: "uint256" }],
    },
  ],
  Minter: [
    {
      name: "weekly",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "uint256" }],
    },
    {
      name: "calculate_rebate",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "_minted", type: "uint256" }],
      outputs: [{ type: "uint256" }],
    },
  ],
} as const;
