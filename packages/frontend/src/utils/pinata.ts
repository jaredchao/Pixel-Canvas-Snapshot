import { PinataSDK } from "pinata"

// Pinata配置
const PINATA_JWT = process.env.PINATA_JWT || process.env.NEXT_PUBLIC_PINATA_JWT

// 创建Pinata SDK实例
export const pinata = new PinataSDK({
  pinataJwt: PINATA_JWT,
  // 注意：这里暂时没有设置gateway，因为需要从Pinata面板获取
  pinataGateway: process.env.NEXT_PUBLIC_GATEWAY_URL
})

// 检查配置
if (!PINATA_JWT) {
  console.warn('未设置Pinata JWT，IPFS功能将受限')
}

export default pinata
