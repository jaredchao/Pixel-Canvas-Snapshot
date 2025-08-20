/**
 * 画布状态计算和快照生成工具函数
 */

import { COLOR_PALETTE } from '@/components/PixelCanvas'

// 像素更改数据类型
export interface PixelChange {
  artist: string
  x: number
  y: number
  color: number
  timestamp: number
}

// 画布状态类型
export interface CanvasState {
  pixels: number[][] // 16x16的颜色矩阵
  changes: PixelChange[]
  lastUpdate: number
}

// 快照元数据类型
export interface SnapshotMetadata {
  id: number
  timestamp: number
  totalChanges: number
  participantCount: number
  participants: string[]
  canvasSize: number
  colorPalette: string[]
  description: string
  attributes: Array<{
    trait_type: string
    value: string | number
  }>
}

/**
 * 计算画布的最终状态
 * @param changes 像素更改记录数组
 * @param canvasSize 画布大小 (默认16)
 * @returns 最终的画布状态
 */
export function calculateCanvasState(changes: PixelChange[], canvasSize: number = 16): CanvasState {
  // 初始化空白画布 (默认颜色为0-白色)
  const pixels: number[][] = Array(canvasSize).fill(null).map(() => Array(canvasSize).fill(0))
  
  // 按时间戳排序，确保更改按正确顺序应用
  const sortedChanges = [...changes].sort((a, b) => a.timestamp - b.timestamp)
  
  // 应用所有像素更改
  for (const change of sortedChanges) {
    if (change.x >= 0 && change.x < canvasSize && change.y >= 0 && change.y < canvasSize) {
      pixels[change.y][change.x] = change.color
    }
  }
  
  return {
    pixels,
    changes: sortedChanges,
    lastUpdate: sortedChanges.length > 0 ? sortedChanges[sortedChanges.length - 1].timestamp : 0
  }
}

/**
 * 将画布状态渲染到Canvas元素
 * @param canvasState 画布状态
 * @param canvasElement HTML Canvas元素
 * @param pixelSize 每个像素的显示大小
 */
export function renderCanvasToElement(
  canvasState: CanvasState, 
  canvasElement: HTMLCanvasElement, 
  pixelSize: number = 32
) {
  const ctx = canvasElement.getContext('2d')
  if (!ctx) throw new Error('无法获取Canvas上下文')
  
  const canvasSize = canvasState.pixels.length
  
  // 设置Canvas尺寸
  canvasElement.width = canvasSize * pixelSize
  canvasElement.height = canvasSize * pixelSize
  
  // 清空Canvas
  ctx.clearRect(0, 0, canvasElement.width, canvasElement.height)
  
  // 绘制每个像素
  for (let y = 0; y < canvasSize; y++) {
    for (let x = 0; x < canvasSize; x++) {
      const colorIndex = canvasState.pixels[y][x]
      const color = COLOR_PALETTE[colorIndex] || COLOR_PALETTE[0]
      
      ctx.fillStyle = color
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize)
    }
  }
  
  // 绘制网格线
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  
  // 垂直线
  for (let x = 0; x <= canvasSize; x++) {
    ctx.beginPath()
    ctx.moveTo(x * pixelSize, 0)
    ctx.lineTo(x * pixelSize, canvasSize * pixelSize)
    ctx.stroke()
  }
  
  // 水平线
  for (let y = 0; y <= canvasSize; y++) {
    ctx.beginPath()
    ctx.moveTo(0, y * pixelSize)
    ctx.lineTo(canvasSize * pixelSize, y * pixelSize)
    ctx.stroke()
  }
}

/**
 * 将画布状态转换为PNG图片数据
 * @param canvasState 画布状态
 * @param pixelSize 每个像素的显示大小 (默认32，适合NFT)
 * @param quality 图片质量 (0-1)
 * @returns Promise<Blob> PNG图片数据
 */
export async function canvasStateToImage(
  canvasState: CanvasState, 
  pixelSize: number = 32,
  quality: number = 1.0
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // 创建临时Canvas
    const canvas = document.createElement('canvas')
    
    try {
      // 渲染画布状态到Canvas
      renderCanvasToElement(canvasState, canvas, pixelSize)
      
      // 转换为Blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('无法生成图片数据'))
        }
      }, 'image/png', quality)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * 生成快照元数据
 * @param snapshotId 快照ID
 * @param canvasState 画布状态
 * @param ipfsImageHash IPFS图片哈希
 * @returns 快照元数据
 */
export function generateSnapshotMetadata(
  snapshotId: number,
  canvasState: CanvasState,
  ipfsImageHash: string
): SnapshotMetadata {
  // 统计参与者
  const participants = Array.from(new Set(canvasState.changes.map(change => change.artist)))
  
  // 统计颜色使用情况
  const colorUsage: { [color: number]: number } = {}
  const pixels = canvasState.pixels.flat()
  
  for (const pixel of pixels) {
    colorUsage[pixel] = (colorUsage[pixel] || 0) + 1
  }
  
  // 计算主要颜色
  const dominantColor = Object.entries(colorUsage)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([color]) => COLOR_PALETTE[parseInt(color)])
  
  // 计算活跃度指标
  const uniquePixelsModified = new Set(
    canvasState.changes.map(change => `${change.x},${change.y}`)
  ).size
  
  const totalPixels = canvasState.pixels.length * canvasState.pixels[0].length
  const pixelCoverage = (uniquePixelsModified / totalPixels * 100).toFixed(1)
  
  return {
    id: snapshotId,
    timestamp: Date.now(),
    totalChanges: canvasState.changes.length,
    participantCount: participants.length,
    participants,
    canvasSize: canvasState.pixels.length,
    colorPalette: COLOR_PALETTE,
    description: `PixelCanvas协作艺术快照 #${snapshotId}，由${participants.length}位艺术家共同创作，包含${canvasState.changes.length}次像素更改。`,
    attributes: [
      {
        trait_type: "Snapshot ID",
        value: snapshotId
      },
      {
        trait_type: "Total Changes",
        value: canvasState.changes.length
      },
      {
        trait_type: "Participants",
        value: participants.length
      },
      {
        trait_type: "Pixel Coverage",
        value: `${pixelCoverage}%`
      },
      {
        trait_type: "Dominant Colors",
        value: dominantColor.join(", ")
      },
      {
        trait_type: "Canvas Size",
        value: `${canvasState.pixels.length}x${canvasState.pixels[0].length}`
      },
      {
        trait_type: "Creation Date",
        value: new Date().toISOString().split('T')[0]
      }
    ]
  }
}

/**
 * 比较两个画布状态是否不同
 * @param state1 画布状态1
 * @param state2 画布状态2
 * @returns 是否不同
 */
export function isCanvasStateDifferent(state1: CanvasState, state2: CanvasState): boolean {
  if (state1.changes.length !== state2.changes.length) {
    return true
  }
  
  for (let y = 0; y < state1.pixels.length; y++) {
    for (let x = 0; x < state1.pixels[y].length; x++) {
      if (state1.pixels[y][x] !== state2.pixels[y][x]) {
        return true
      }
    }
  }
  
  return false
}

/**
 * 获取画布状态的哈希值 (用于缓存和比较)
 * @param canvasState 画布状态
 * @returns 状态哈希值
 */
export function getCanvasStateHash(canvasState: CanvasState): string {
  const stateString = canvasState.pixels.flat().join(',') + canvasState.changes.length
  return btoa(stateString).slice(0, 16) // 简单的哈希实现
}

/**
 * 验证画布状态的有效性
 * @param canvasState 画布状态
 * @returns 验证结果
 */
export function validateCanvasState(canvasState: CanvasState): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // 检查画布尺寸
  if (!canvasState.pixels || canvasState.pixels.length === 0) {
    errors.push('画布数据为空')
  } else {
    const size = canvasState.pixels.length
    if (size !== 16) {
      errors.push(`画布尺寸不正确，期望16x16，实际${size}x${canvasState.pixels[0]?.length || 0}`)
    }
    
    // 检查每行长度
    for (let i = 0; i < canvasState.pixels.length; i++) {
      if (canvasState.pixels[i].length !== size) {
        errors.push(`第${i}行长度不正确`)
        break
      }
    }
  }
  
  // 检查颜色值
  for (let y = 0; y < canvasState.pixels.length; y++) {
    for (let x = 0; x < canvasState.pixels[y].length; x++) {
      const color = canvasState.pixels[y][x]
      if (color < 0 || color >= COLOR_PALETTE.length) {
        errors.push(`像素(${x},${y})的颜色值${color}超出范围`)
      }
    }
  }
  
  // 检查更改记录
  for (const change of canvasState.changes) {
    if (change.x < 0 || change.x >= 16 || change.y < 0 || change.y >= 16) {
      errors.push(`更改记录坐标(${change.x},${change.y})超出范围`)
    }
    if (change.color < 0 || change.color >= COLOR_PALETTE.length) {
      errors.push(`更改记录颜色值${change.color}超出范围`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 导出画布状态为JSON
 * @param canvasState 画布状态
 * @returns JSON字符串
 */
export function exportCanvasState(canvasState: CanvasState): string {
  return JSON.stringify({
    ...canvasState,
    exportTime: Date.now(),
    version: '1.0'
  }, null, 2)
}

/**
 * 从JSON导入画布状态
 * @param jsonString JSON字符串
 * @returns 画布状态
 */
export function importCanvasState(jsonString: string): CanvasState {
  try {
    const data = JSON.parse(jsonString)
    return {
      pixels: data.pixels,
      changes: data.changes,
      lastUpdate: data.lastUpdate
    }
  } catch (error) {
    throw new Error('无法解析画布状态数据')
  }
}
