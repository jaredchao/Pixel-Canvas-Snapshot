'use client'
import { http } from 'wagmi'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { localhost, mainnet, sepolia } from 'wagmi/chains'
import { defineChain } from 'viem'

// RainbowKit + Wagmi 配置

// 定义本地链
const localhostChain = defineChain({
  id: 31337,
  name: 'Localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://localhost:8545'],
    },
  },
  testnet: true,
})

const chains = [localhostChain, sepolia] as const

export const config = getDefaultConfig({
  appName: 'PixelCanvas DApp',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id-replace-with-real-one',
  chains,
})

// PixelCanvas 合约配置
import pixelCanvasAbi from './pixelCanvasAbi.json'

export const pixelCanvasContract = {
  address: (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) || '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
  abi: pixelCanvasAbi,
} as const

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
