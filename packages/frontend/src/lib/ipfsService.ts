/**
 * IPFS存储服务
 * 使用 Pinata SDK 作为IPFS服务提供商
 * Pinata提供稳定可靠的IPFS固定服务
 */

import { pinata } from '../utils/pinata'

// IPFS上传状态
export interface IPFSUploadStatus {
  status: 'idle' | 'preparing' | 'uploading' | 'completed' | 'error'
  progress: number // 0-100
  message: string
  ipfsHash?: string
  gatewayUrl?: string
  error?: string
}

// 上传选项
export interface UploadOptions {
  onProgress?: (status: IPFSUploadStatus) => void
  timeout?: number // 上传超时时间 (ms)
}



// NFT元数据标准格式
export interface NFTMetadata {
  name: string
  description: string
  image: string // IPFS URL
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
  external_url?: string
  animation_url?: string
  background_color?: string
}

/**
 * IPFS存储服务类
 */
export class IPFSService {
  constructor() {
    // 不需要额外配置，使用导入的pinata实例
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return !!pinata
  }

  /**
   * 上传图片文件到IPFS (使用Pinata SDK)
   * @param imageBlob 图片Blob数据
   * @param filename 文件名
   * @param options 上传选项
   * @returns IPFS哈希和访问URL
   */
  async uploadImage(
    imageBlob: Blob,
    filename: string = 'snapshot.png',
    options: UploadOptions = {}
  ): Promise<{ hash: string; url: string }> {
    if (!this.isAvailable()) {
      throw new Error('IPFS服务不可用：Pinata SDK未正确配置')
    }

    const { onProgress } = options

    try {
      // 更新状态：准备上传
      onProgress?.({
        status: 'preparing',
        progress: 10,
        message: '准备上传图片到Pinata...'
      })

      // 将Blob转换为File对象
      const file = new File([imageBlob], filename, { type: imageBlob.type })

      // 更新状态：开始上传
      onProgress?.({
        status: 'uploading',
        progress: 30,
        message: '上传图片到Pinata...'
      })

      // 使用Pinata SDK上传文件
      const uploadResult = await pinata.upload.public.file(file)

      onProgress?.({
        status: 'uploading',
        progress: 80,
        message: '生成访问URL...'
      })

      // 生成访问URL
      const gatewayUrl = await pinata.gateways.public.convert(uploadResult.cid)

      onProgress?.({
        status: 'completed',
        progress: 100,
        message: '图片上传完成',
        ipfsHash: uploadResult.cid,
        gatewayUrl
      })

      return {
        hash: uploadResult.cid,
        url: gatewayUrl
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败'
      
      onProgress?.({
        status: 'error',
        progress: 0,
        message: '图片上传失败',
        error: errorMessage
      })

      throw error
    }
  }

  /**
   * 上传JSON元数据到IPFS (使用Pinata SDK)
   * @param metadata 元数据对象
   * @param filename 文件名
   * @param options 上传选项
   * @returns IPFS哈希和访问URL
   */
  async uploadMetadata(
    metadata: object,
    filename: string = 'metadata.json',
    options: UploadOptions = {}
  ): Promise<{ hash: string; url: string }> {
    if (!this.isAvailable()) {
      throw new Error('IPFS服务不可用：Pinata SDK未正确配置')
    }

    const { onProgress } = options

    try {
      // 更新状态：准备上传
      onProgress?.({
        status: 'preparing',
        progress: 10,
        message: '准备上传元数据到Pinata...'
      })

      // 转换为File对象
      const jsonString = JSON.stringify(metadata, null, 2)
      const jsonBlob = new Blob([jsonString], { type: 'application/json' })
      const file = new File([jsonBlob], filename, { type: 'application/json' })

      // 更新状态：开始上传
      onProgress?.({
        status: 'uploading',
        progress: 30,
        message: '上传元数据到Pinata...'
      })

      // 使用Pinata SDK上传文件
      const uploadResult = await pinata.upload.public.file(file)

      onProgress?.({
        status: 'uploading',
        progress: 80,
        message: '生成访问URL...'
      })

      // 生成访问URL
      const gatewayUrl = await pinata.gateways.public.convert(uploadResult.cid)

      onProgress?.({
        status: 'completed',
        progress: 100,
        message: '元数据上传完成',
        ipfsHash: uploadResult.cid,
        gatewayUrl
      })

      return {
        hash: uploadResult.cid,
        url: gatewayUrl
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败'
      
      onProgress?.({
        status: 'error',
        progress: 0,
        message: '元数据上传失败',
        error: errorMessage
      })

      throw error
    }
  }

  /**
   * 上传完整的NFT (图片 + 元数据) 到Pinata
   * @param imageBlob 图片数据
   * @param baseMetadata 基础元数据
   * @param options 上传选项
   * @returns 元数据IPFS哈希 (用于NFT tokenURI)
   */
  async uploadNFT(
    imageBlob: Blob,
    baseMetadata: Omit<NFTMetadata, 'image'>,
    options: UploadOptions = {}
  ): Promise<{ metadataHash: string; imageHash: string; metadataUrl: string }> {
    const { onProgress } = options

    try {
      // 第一步：上传图片
      onProgress?.({
        status: 'uploading',
        progress: 10,
        message: '上传图片到Pinata...'
      })

      const imageResult = await this.uploadImage(imageBlob, 'snapshot.png', {
        ...options,
        onProgress: (status) => {
          onProgress?.({
            ...status,
            progress: 10 + (status.progress * 0.4) // 10-50%
          })
        }
      })

      // 第二步：创建完整元数据
      onProgress?.({
        status: 'uploading',
        progress: 55,
        message: '创建元数据...'
      })

      const fullMetadata: NFTMetadata = {
        ...baseMetadata,
        image: `ipfs://${imageResult.hash}`,
        external_url: `https://pixelcanvas.app/snapshot/${baseMetadata.name}`
      }

      // 第三步：上传元数据
      onProgress?.({
        status: 'uploading',
        progress: 65,
        message: '上传元数据到Pinata...'
      })

      const metadataResult = await this.uploadMetadata(fullMetadata, 'metadata.json', {
        ...options,
        onProgress: (status) => {
          onProgress?.({
            ...status,
            progress: 65 + (status.progress * 0.35) // 65-100%
          })
        }
      })

      return {
        metadataHash: metadataResult.hash,
        imageHash: imageResult.hash,
        metadataUrl: metadataResult.url
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'NFT上传失败'
      
      onProgress?.({
        status: 'error',
        progress: 0,
        message: 'NFT上传失败',
        error: errorMessage
      })

      throw error
    }
  }

  /**
   * 获取IPFS文件信息
   * @param ipfsHash IPFS哈希
   * @returns 文件信息
   */
  async getFileInfo(ipfsHash: string): Promise<{
    size: number
    type: string
    created: string
  } | null> {
    try {
      // 尝试通过Pinata获取信息
      const pinataStatus = await this.getPinataStatus(ipfsHash)
      if (pinataStatus) {
        return {
          size: pinataStatus.size || 0,
          type: pinataStatus.mime_type || 'unknown',
          created: pinataStatus.created_at || new Date().toISOString()
        }
      }

      // 回退：直接访问IPFS网关获取基本信息
      const gateways = [
        `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        `https://ipfs.io/ipfs/${ipfsHash}`,
        `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`
      ]

      for (const gatewayUrl of gateways) {
        try {
          const response = await fetch(gatewayUrl, {
            method: 'HEAD',
            timeout: 10000
          } as RequestInit)

          if (response.ok) {
            return {
              size: parseInt(response.headers.get('content-length') || '0'),
              type: response.headers.get('content-type') || 'unknown',
              created: response.headers.get('last-modified') || new Date().toISOString()
            }
          }
        } catch (error) {
          continue // 尝试下一个网关
        }
      }

      return null
    } catch (error) {
      console.error('获取IPFS文件信息失败:', error)
      return null
    }
  }

  /**
   * 检查IPFS哈希是否有效
   * @param ipfsHash IPFS哈希
   * @returns 是否有效
   */
  async isValidHash(ipfsHash: string): Promise<boolean> {
    if (!ipfsHash || ipfsHash.length < 10) {
      return false
    }

    try {
      // 尝试访问文件
      const response = await fetch(`https://${ipfsHash}.ipfs.nftstorage.link`, {
        method: 'HEAD',
        timeout: 5000
      } as RequestInit)
      
      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * 生成IPFS网关URL
   * @param ipfsHash IPFS哈希
   * @param gateway 网关域名
   * @returns 网关URL
   */
  getGatewayUrl(ipfsHash: string, gateway: string = 'nftstorage.link'): string {
    return `https://${ipfsHash}.ipfs.${gateway}`
  }

  /**
   * 从IPFS URL提取哈希
   * @param ipfsUrl IPFS URL
   * @returns IPFS哈希
   */
  extractHashFromUrl(ipfsUrl: string): string | null {
    const ipfsPattern = /(?:ipfs:\/\/|\/ipfs\/|\.ipfs\.)([a-zA-Z0-9]{46,})/
    const match = ipfsUrl.match(ipfsPattern)
    return match ? match[1] : null
  }









  /**
   * 获取Pinata固定状态 (使用SDK)
   */
  async getPinataStatus(ipfsHash: string): Promise<any> {
    try {
      const fileList = await pinata.files.list().containsCid(ipfsHash)
      return fileList.files[0] || null
    } catch (error) {
      console.error('获取Pinata状态失败:', error)
      return null
    }
  }

  /**
   * 设置Pinata JWT (已弃用 - 现在使用SDK配置)
   */
  setPinataJWT(jwt: string) {
    console.warn('setPinataJWT已弃用，请在utils/pinata.ts中配置JWT')
  }
}

// 导出单例实例
export const ipfsService = new IPFSService()

// 导出便捷函数
export async function uploadToIPFS(
  data: Blob | object,
  filename?: string,
  onProgress?: (status: IPFSUploadStatus) => void
): Promise<{ hash: string; url: string }> {
  if (data instanceof Blob) {
    return ipfsService.uploadImage(data, filename, { onProgress })
  } else {
    return ipfsService.uploadMetadata(data, filename, { onProgress })
  }
}

export async function uploadNFTToIPFS(
  imageBlob: Blob,
  metadata: Omit<NFTMetadata, 'image'>,
  onProgress?: (status: IPFSUploadStatus) => void
): Promise<{ metadataHash: string; imageHash: string; metadataUrl: string }> {
  return ipfsService.uploadNFT(imageBlob, metadata, { onProgress })
}




