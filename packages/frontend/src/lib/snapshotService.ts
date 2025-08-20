/**
 * 快照生成和管理服务
 */

import { 
  calculateCanvasState, 
  canvasStateToImage, 
  generateSnapshotMetadata,
  validateCanvasState,
  type PixelChange,
  type CanvasState,
  type SnapshotMetadata 
} from './canvasUtils'

// 快照生成状态
export interface SnapshotGenerationStatus {
  status: 'idle' | 'calculating' | 'rendering' | 'uploading' | 'completed' | 'error'
  progress: number // 0-100
  message: string
  snapshotId?: number
  ipfsHash?: string
  error?: string
}

// 快照生成配置
export interface SnapshotConfig {
  pixelSize: number // 图片中每个像素的尺寸
  quality: number // 图片质量 (0-1)
  includeGrid: boolean // 是否包含网格线
  backgroundTransparent: boolean // 背景是否透明
}

// 默认配置
const DEFAULT_CONFIG: SnapshotConfig = {
  pixelSize: 32,
  quality: 1.0,
  includeGrid: true,
  backgroundTransparent: false
}

// 快照服务类
export class SnapshotService {
  private statusCallbacks: Array<(status: SnapshotGenerationStatus) => void> = []
  private currentStatus: SnapshotGenerationStatus = {
    status: 'idle',
    progress: 0,
    message: '准备就绪'
  }

  /**
   * 订阅状态更新
   */
  onStatusUpdate(callback: (status: SnapshotGenerationStatus) => void) {
    this.statusCallbacks.push(callback)
    // 立即调用一次当前状态
    callback(this.currentStatus)
    
    // 返回取消订阅函数
    return () => {
      const index = this.statusCallbacks.indexOf(callback)
      if (index > -1) {
        this.statusCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * 更新状态
   */
  private updateStatus(update: Partial<SnapshotGenerationStatus>) {
    this.currentStatus = { ...this.currentStatus, ...update }
    this.statusCallbacks.forEach(callback => callback(this.currentStatus))
  }

  /**
   * 生成快照
   * @param snapshotId 快照ID
   * @param pixelChanges 像素更改数据
   * @param config 生成配置
   * @returns 生成的快照数据
   */
  async generateSnapshot(
    snapshotId: number,
    pixelChanges: PixelChange[],
    config: Partial<SnapshotConfig> = {}
  ): Promise<{
    imageBlob: Blob
    metadata: SnapshotMetadata
    canvasState: CanvasState
  }> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config }

    try {
      // 步骤1: 计算画布状态
      this.updateStatus({
        status: 'calculating',
        progress: 10,
        message: '计算画布状态...',
        snapshotId
      })

      await this.delay(100) // 让UI有时间更新

      const canvasState = calculateCanvasState(pixelChanges)
      
      // 验证画布状态
      const validation = validateCanvasState(canvasState)
      if (!validation.valid) {
        throw new Error(`画布状态无效: ${validation.errors.join(', ')}`)
      }

      // 步骤2: 渲染图片
      this.updateStatus({
        status: 'rendering',
        progress: 40,
        message: '生成快照图片...'
      })

      await this.delay(100)

      const imageBlob = await this.generateSnapshotImage(canvasState, finalConfig)

      // 步骤3: 生成元数据
      this.updateStatus({
        status: 'rendering',
        progress: 70,
        message: '生成元数据...'
      })

      await this.delay(100)

      // 临时使用空的IPFS哈希，后续上传后再更新
      const metadata = generateSnapshotMetadata(snapshotId, canvasState, '')

      // 步骤4: 完成
      this.updateStatus({
        status: 'completed',
        progress: 100,
        message: '快照生成完成'
      })

      return {
        imageBlob,
        metadata,
        canvasState
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      this.updateStatus({
        status: 'error',
        progress: 0,
        message: '快照生成失败',
        error: errorMessage
      })
      throw error
    }
  }

  /**
   * 生成快照图片
   */
  private async generateSnapshotImage(
    canvasState: CanvasState,
    config: SnapshotConfig
  ): Promise<Blob> {
    if (config.includeGrid) {
      // 使用现有的带网格线的渲染方法
      return canvasStateToImage(canvasState, config.pixelSize, config.quality)
    } else {
      // 不包含网格线的纯净版本
      return this.generateCleanImage(canvasState, config)
    }
  }

  /**
   * 生成不含网格线的纯净图片
   */
  private async generateCleanImage(
    canvasState: CanvasState,
    config: SnapshotConfig
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('无法获取Canvas上下文'))
        return
      }

      const canvasSize = canvasState.pixels.length
      canvas.width = canvasSize * config.pixelSize
      canvas.height = canvasSize * config.pixelSize

      // 设置背景
      if (!config.backgroundTransparent) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      // 绘制像素 (不绘制网格)
      for (let y = 0; y < canvasSize; y++) {
        for (let x = 0; x < canvasSize; x++) {
          const colorIndex = canvasState.pixels[y][x]
          const color = this.getColorFromPalette(colorIndex)
          
          if (color !== '#ffffff' || !config.backgroundTransparent) {
            ctx.fillStyle = color
            ctx.fillRect(x * config.pixelSize, y * config.pixelSize, config.pixelSize, config.pixelSize)
          }
        }
      }

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('无法生成图片数据'))
        }
      }, 'image/png', config.quality)
    })
  }

  /**
   * 从调色板获取颜色
   */
  private getColorFromPalette(colorIndex: number): string {
    // 临时使用固定调色板，后续从 COLOR_PALETTE 导入
    const palette = [
      '#ffffff', // 0 - 白色
      '#000000', // 1 - 黑色
      '#ff0000', // 2 - 红色
      '#00ff00', // 3 - 绿色
      '#0000ff', // 4 - 蓝色
      '#ffff00', // 5 - 黄色
      '#ff00ff', // 6 - 品红
      '#00ffff'  // 7 - 青色
    ]
    return palette[colorIndex] || palette[0]
  }

  /**
   * 生成预览图 (小尺寸，用于快速预览)
   */
  async generatePreview(
    pixelChanges: PixelChange[],
    previewSize: number = 128
  ): Promise<Blob> {
    const canvasState = calculateCanvasState(pixelChanges)
    const pixelSize = Math.floor(previewSize / canvasState.pixels.length)
    
    return this.generateCleanImage(canvasState, {
      pixelSize,
      quality: 0.8,
      includeGrid: false,
      backgroundTransparent: false
    })
  }

  /**
   * 批量生成多个快照
   */
  async batchGenerateSnapshots(
    snapshots: Array<{ id: number; changes: PixelChange[] }>,
    config: Partial<SnapshotConfig> = {}
  ): Promise<Array<{
    snapshotId: number
    imageBlob: Blob
    metadata: SnapshotMetadata
    canvasState: CanvasState
  }>> {
    const results = []
    
    for (let i = 0; i < snapshots.length; i++) {
      const snapshot = snapshots[i]
      
      this.updateStatus({
        status: 'rendering',
        progress: Math.floor((i / snapshots.length) * 100),
        message: `处理快照 ${i + 1}/${snapshots.length}...`,
        snapshotId: snapshot.id
      })

      try {
        const result = await this.generateSnapshot(snapshot.id, snapshot.changes, config)
        results.push({
          snapshotId: snapshot.id,
          ...result
        })
      } catch (error) {
        console.error(`快照 ${snapshot.id} 生成失败:`, error)
        // 继续处理其他快照
      }

      await this.delay(50) // 避免阻塞UI
    }

    this.updateStatus({
      status: 'completed',
      progress: 100,
      message: `批量处理完成，成功生成 ${results.length}/${snapshots.length} 个快照`
    })

    return results
  }

  /**
   * 获取快照统计信息
   */
  generateSnapshotStats(canvasState: CanvasState) {
    const participants = Array.from(new Set(canvasState.changes.map(c => c.artist)))
    const pixelCounts: { [address: string]: number } = {}
    
    for (const change of canvasState.changes) {
      pixelCounts[change.artist] = (pixelCounts[change.artist] || 0) + 1
    }

    const topContributors = Object.entries(pixelCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([address, count]) => ({
        address,
        count,
        percentage: (count / canvasState.changes.length * 100).toFixed(1)
      }))

    // 颜色使用统计
    const colorUsage: { [color: number]: number } = {}
    for (let y = 0; y < canvasState.pixels.length; y++) {
      for (let x = 0; x < canvasState.pixels[y].length; x++) {
        const color = canvasState.pixels[y][x]
        colorUsage[color] = (colorUsage[color] || 0) + 1
      }
    }

    const totalPixels = canvasState.pixels.length * canvasState.pixels[0].length
    const changedPixels = new Set(
      canvasState.changes.map(c => `${c.x},${c.y}`)
    ).size

    return {
      totalChanges: canvasState.changes.length,
      participantCount: participants.length,
      topContributors,
      colorUsage,
      pixelCoverage: {
        changed: changedPixels,
        total: totalPixels,
        percentage: (changedPixels / totalPixels * 100).toFixed(1)
      }
    }
  }

  /**
   * 重置状态
   */
  reset() {
    this.updateStatus({
      status: 'idle',
      progress: 0,
      message: '准备就绪',
      snapshotId: undefined,
      ipfsHash: undefined,
      error: undefined
    })
  }

  /**
   * 工具函数：延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取当前状态
   */
  getStatus(): SnapshotGenerationStatus {
    return this.currentStatus
  }
}

// 导出单例实例
export const snapshotService = new SnapshotService()
