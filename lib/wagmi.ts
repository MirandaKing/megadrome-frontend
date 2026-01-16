import { http, createConfig } from 'wagmi'
import { injected, walletConnect } from 'wagmi/connectors'

// Define Monad chain
export const monad = {
    id: 10143,
    name: 'Monad Testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'Monad',
        symbol: 'MON',
    },
    rpcUrls: {
        default: { http: ['https://testnet-rpc.monad.xyz'] },
    },
    blockExplorers: {
        default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
    },
    testnet: true,
} as const

// WalletConnect Project ID - Replace with your own
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

export const config = createConfig({
    chains: [monad],
    connectors: [
        injected(),
        walletConnect({
            projectId,
            metadata: {
                name: 'Megadrome',
                description: 'Megadrome DEX on Monad',
                url: 'https://megadrome.xyz',
                icons: ['https://megadrome.xyz/logo.png'],
            },
        }),
    ],
    transports: {
        [monad.id]: http(),
    },
})

declare module 'wagmi' {
    interface Register {
        config: typeof config
    }
}
