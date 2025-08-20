'use client'
import { http, webSocket } from 'wagmi'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { localhost, mainnet, sepolia } from 'wagmi/chains'
import { defineChain } from 'viem'

// RainbowKit + Wagmi 配置

// 定义本地链
export const localhostChain = defineChain({
  id: 31337,
  name: 'Localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
      webSocket: ['ws://127.0.0.1:8545'],
    },
    public: {
      http: ['http://127.0.0.1:8545'],
      webSocket: ['ws://127.0.0.1:8545'],
    },
  },
  testnet: true,
})
const chains = [localhostChain, sepolia] as const
console.log(chains)

export const config = getDefaultConfig({
  appName: 'PixelCanvas DApp',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id-replace-with-real-one',
  chains,
  transports: {
    [sepolia.id]: http('https://sepolia.infura.io/v3/c141ecde53b248289fd54f093a67d8f0'),
    [localhostChain.id]: webSocket('ws://127.0.0.1:8545'),
  },
})

// PixelCanvas 合约配置
import pixelCanvasAbi from './pixelCanvasAbi.json'

export const pixelCanvasContract = {
  address: (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`),
  abi: pixelCanvasAbi,
} as const


declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
