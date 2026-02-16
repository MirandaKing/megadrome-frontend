import { http, createConfig } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { type Chain } from "viem";

// Define Monad chain
export const monad: Chain = {
  id: 143,
  name: "Monad",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpc.monad.xyz"] },
    public: { http: ["https://rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "MonadVision", url: "https://monadvision.com" },
  },
};

// WalletConnect Project ID - Replace with your own
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id";

export const config = createConfig({
  chains: [monad],
  connectors: [
    injected(),
    walletConnect({
      projectId,
      metadata: {
        name: "Megadrome",
        description: "Megadrome DEX on Monad",
        url: "https://megadrome.xyz",
        icons: ["https://megadrome.xyz/logo.png"],
      },
    }),
  ],
  transports: {
    [monad.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
