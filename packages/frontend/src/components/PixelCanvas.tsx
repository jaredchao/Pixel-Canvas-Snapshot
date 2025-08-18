'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useAccount } from 'wagmi'

// 颜色调色板 - 8种颜色对应合约中的0-7
const COLOR_PALETTE = [
  '#FFFFFF', // 0 - 白色
  '#000000', // 1 - 黑色
  '#FF0000', // 2 - 红色
  '#00FF00', // 3 - 绿色
  '#0000FF', // 4 - 蓝色
  '#FFFF00', // 5 - 黄色
  '#FF00FF', // 6 - 洋红
  '#00FFFF', // 7 - 青色
]

interface PixelChange {
  artist: string
  x: number
  y: number
  color: number
  timestamp: number
}

interface PixelCanvasProps {
  canvasSize?: number
  pixelSize?: number
  onPixelClick?: (x: number, y: number) => void
  pixelChanges?: PixelChange[]
  selectedColor?: number
  disabled?: boolean
}

export function PixelCanvas({
  canvasSize = 16,
  pixelSize = 20,
  onPixelClick,
  pixelChanges = [],
  selectedColor = 0,
  disabled = false
}: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredPixel, setHoveredPixel] = useState<{x: number, y: number} | null>(null)
  const { isConnected } = useAccount()

  // 计算画布总尺寸
  const totalSize = canvasSize * pixelSize

  // 初始化画布
  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 设置画布尺寸
    canvas.width = totalSize
    canvas.height = totalSize

    // 清空画布并设置背景色
    ctx.fillStyle = COLOR_PALETTE[0] // 白色背景
    ctx.fillRect(0, 0, totalSize, totalSize)

    // 绘制网格线
    ctx.strokeStyle = '#E5E7EB' // 浅灰色网格
    ctx.lineWidth = 1

    // 绘制垂直线
    for (let x = 0; x <= canvasSize; x++) {
      ctx.beginPath()
      ctx.moveTo(x * pixelSize, 0)
      ctx.lineTo(x * pixelSize, totalSize)
      ctx.stroke()
    }

    // 绘制水平线
    for (let y = 0; y <= canvasSize; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * pixelSize)
      ctx.lineTo(totalSize, y * pixelSize)
      ctx.stroke()
    }
  }, [canvasSize, pixelSize, totalSize])

  // 绘制像素变更
  const drawPixelChanges = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 创建一个2D数组来追踪每个位置的最新颜色
    const pixelGrid: number[][] = Array(canvasSize).fill(null).map(() => Array(canvasSize).fill(0))

    // 应用所有像素变更，后面的变更会覆盖前面的
    pixelChanges.forEach(change => {
      if (change.x < canvasSize && change.y < canvasSize) {
        pixelGrid[change.y][change.x] = change.color
      }
    })

    // 绘制所有像素
    for (let y = 0; y < canvasSize; y++) {
      for (let x = 0; x < canvasSize; x++) {
        const colorIndex = pixelGrid[y][x]
        if (colorIndex > 0) { // 只绘制非白色像素（白色是默认背景）
          ctx.fillStyle = COLOR_PALETTE[colorIndex]
          ctx.fillRect(
            x * pixelSize + 1,
            y * pixelSize + 1,
            pixelSize - 2,
            pixelSize - 2
          )
        }
      }
    }
  }, [pixelChanges, canvasSize, pixelSize])

  // 绘制悬停效果
  const drawHoverEffect = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !hoveredPixel || disabled || !isConnected) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = hoveredPixel

    // 保存当前状态
    ctx.save()

    // 绘制悬停预览
    ctx.fillStyle = COLOR_PALETTE[selectedColor]
    ctx.globalAlpha = 0.7
    ctx.fillRect(
      x * pixelSize + 1,
      y * pixelSize + 1,
      pixelSize - 2,
      pixelSize - 2
    )

    // 绘制边框
    ctx.globalAlpha = 1
    ctx.strokeStyle = '#3B82F6' // 蓝色边框
    ctx.lineWidth = 2
    ctx.strokeRect(
      x * pixelSize + 1,
      y * pixelSize + 1,
      pixelSize - 2,
      pixelSize - 2
    )

    // 恢复状态
    ctx.restore()
  }, [hoveredPixel, selectedColor, pixelSize, disabled, isConnected])

  // 处理鼠标点击
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !isConnected || !onPixelClick) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((event.clientX - rect.left) / pixelSize)
    const y = Math.floor((event.clientY - rect.top) / pixelSize)

    if (x >= 0 && x < canvasSize && y >= 0 && y < canvasSize) {
      onPixelClick(x, y)
    }
  }, [disabled, isConnected, onPixelClick, pixelSize, canvasSize])

  // 处理鼠标移动
  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !isConnected) {
      setHoveredPixel(null)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((event.clientX - rect.left) / pixelSize)
    const y = Math.floor((event.clientY - rect.top) / pixelSize)

    if (x >= 0 && x < canvasSize && y >= 0 && y < canvasSize) {
      setHoveredPixel({ x, y })
    } else {
      setHoveredPixel(null)
    }
  }, [disabled, isConnected, pixelSize, canvasSize])

  // 处理鼠标离开
  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredPixel(null)
  }, [])

  // 重绘画布
  const redrawCanvas = useCallback(() => {
    initializeCanvas()
    drawPixelChanges()
    drawHoverEffect()
  }, [initializeCanvas, drawPixelChanges, drawHoverEffect])

  // 初始化和更新画布
  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
          className={`border-2 border-gray-300 rounded-lg shadow-lg ${
            disabled || !isConnected
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-crosshair hover:border-blue-400'
          }`}
          style={{
            imageRendering: 'pixelated',
          }}
        />
        
        {/* 悬停坐标显示 */}
        {hoveredPixel && isConnected && !disabled && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-sm">
            ({hoveredPixel.x}, {hoveredPixel.y})
          </div>
        )}
      </div>

      {/* 画布信息 */}
      <div className="text-sm text-gray-600 text-center">
        <p>画布尺寸: {canvasSize} x {canvasSize}</p>
        <p>像素变更: {pixelChanges.length}</p>
        {!isConnected && (
          <p className="text-red-500 mt-2">请连接钱包以开始绘制</p>
        )}
        {disabled && isConnected && (
          <p className="text-yellow-500 mt-2">绘制功能暂时不可用</p>
        )}
      </div>
    </div>
  )
}

// 颜色选择器组件
interface ColorPaletteProps {
  selectedColor: number
  onColorSelect: (color: number) => void
  disabled?: boolean
}

export function ColorPalette({ selectedColor, onColorSelect, disabled = false }: ColorPaletteProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <p className="w-full text-sm font-medium text-gray-700 text-center mb-2">
        选择颜色:
      </p>
      {COLOR_PALETTE.map((color, index) => (
        <button
          key={index}
          onClick={() => !disabled && onColorSelect(index)}
          disabled={disabled}
          className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
            selectedColor === index
              ? 'border-blue-500 scale-110 shadow-lg'
              : 'border-gray-300 hover:border-gray-400'
          } ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'
          }`}
          style={{ backgroundColor: color }}
          title={`颜色 ${index}: ${color}`}
        />
      ))}
      <div className="w-full text-center mt-2">
        <span className="text-xs text-gray-500">
          当前选择: {COLOR_PALETTE[selectedColor]}
        </span>
      </div>
    </div>
  )
}

export { COLOR_PALETTE }
