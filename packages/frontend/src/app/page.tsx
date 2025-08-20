
'use client'
import { createPublicClient, http } from 'viem'

import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { PixelCanvas, ColorPalette } from '@/components/PixelCanvas'
import { StatusPanel, CompactStatusPanel } from '@/components/StatusPanel'
import { NFTGallery, CompactNFTDisplay } from '@/components/NFTGallery'
import SnapshotGallery from '@/components/SnapshotGallery'
import SnapshotProgress from '@/components/SnapshotProgress'
import { ErrorAlert, ErrorToast } from '@/components/ErrorAlert'
import { useRealtimeCanvasData, usePixelDrawing, useCanvasConfig, useEventDebugger } from '@/hooks/usePixelCanvas'
import { localhostChain } from '@/lib/wagmi'
import pixelCanvasContract from '@/lib/pixelCanvasAbi.json'

export default function Home() {
  const { isConnected, address } = useAccount()
  const [selectedColor, setSelectedColor] = useState(1) // 默认选择黑色
  const [activeTab, setActiveTab] = useState<'canvas' | 'nft' | 'snapshots'>('canvas')
  const [showErrorToast, setShowErrorToast] = useState(false)
  const [userTriggeredError, setUserTriggeredError] = useState<Error | null>(null)
  const [autoSnapshotStatus, setAutoSnapshotStatus] = useState<string | null>(null)
  
  // 获取画布数据和配置
  const { pixelChanges, cycleInfo, isLoading } = useRealtimeCanvasData()
  const { canvasSize } = useCanvasConfig()
  const { drawPixel, isDrawing, error: drawError, isConfirmed } = usePixelDrawing()
  
  // 事件监听调试工具
  const { debugInfo, testEventListening } = useEventDebugger()

  // 处理像素点击
  const handlePixelClick = (x: number, y: number) => {
    if (!isConnected || isDrawing) return
    
    try {
      setUserTriggeredError(null) // 清除之前的错误
      drawPixel(x, y, selectedColor)
    } catch (error) {
      console.error('Failed to draw pixel:', error)
      setUserTriggeredError(error as Error)
    }
  }

  // 监听drawError变化，只有在用户主动操作时才显示
  React.useEffect(() => {
    if (drawError && (isDrawing || isConfirmed)) {
      setUserTriggeredError(drawError)
    }
  }, [drawError, isDrawing, isConfirmed])

  // 清除成功状态的错误
  React.useEffect(() => {
    if (isConfirmed && userTriggeredError) {
      setUserTriggeredError(null)
    }
  }, [isConfirmed, userTriggeredError])

  // 监听自动快照生成事件
  React.useEffect(() => {
    const handleAutoGenerateSnapshot = (event: CustomEvent) => {
      const { snapshotId } = event.detail
      setAutoSnapshotStatus(`🎉 快照 #${snapshotId} 已自动生成！正在处理IPFS上传...`)
      
      // 5秒后清除通知
      setTimeout(() => {
        setAutoSnapshotStatus(null)
      }, 8000)
    }

    window.addEventListener('autoGenerateSnapshot', handleAutoGenerateSnapshot as EventListener)
    
    return () => {
      window.removeEventListener('autoGenerateSnapshot', handleAutoGenerateSnapshot as EventListener)
    }
  }, [])





// const publicClient = createPublicClient({
//   chain: localhostChain,
//   transport: http('http://127.0.0.1:8545'),
// })

// // 在组件中添加这个测试
// useEffect(() => {
//   const unwatch = publicClient.watchContractEvent({
//     address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
//     abi: pixelCanvasContract,
//     eventName: 'PixelChanged',
//     onLogs: logs => {
//       console.log('🔍 Direct viem event logs:', logs)
//     },
//     onError: error => {
//       console.error('🔍 Direct viem error:', error)
//     },
//   })

//   return () => unwatch()
// }, [])


  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            PixelCanvas
          </h1>
          <p className="text-gray-600">
            去中心化协作像素艺术平台 - 绘制、快照、收藏NFT
          </p>
        </div>

        {/* 连接钱包提示 */}
        {!isConnected && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-center">
            <h2 className="text-xl font-semibold text-blue-800 mb-2">
              欢迎来到 PixelCanvas！
            </h2>
            <p className="text-blue-700 mb-4">
              连接您的Web3钱包开始协作创作，每次绘制都将成为链上艺术的一部分
            </p>
            <div className="text-sm text-blue-600 mb-6">
              <p>• 16x16像素画布，8种颜色选择</p>
              <p>• 每50次变更自动生成快照NFT</p>
              <p>• 参与者免费获得快照NFT</p>
            </div>
            
            {/* 大型连接按钮 */}
            <div className="flex justify-center">
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button
                    onClick={openConnectModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    🎨 连接钱包开始创作
                  </button>
                )}
              </ConnectButton.Custom>
            </div>
          </div>
        )}

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧 - 画布和控制 */}
          <div className="lg:col-span-3">
            {/* 移动端标签切换 */}
            <div className="lg:hidden mb-4">
              <div className="flex bg-white rounded-lg shadow-sm p-1">
                <button
                  onClick={() => setActiveTab('canvas')}
                  className={`flex-1 py-2 px-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'canvas'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🎨 画布
                </button>
                <button
                  onClick={() => setActiveTab('snapshots')}
                  className={`flex-1 py-2 px-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'snapshots'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📸 快照
                </button>
                <button
                  onClick={() => setActiveTab('nft')}
                  className={`flex-1 py-2 px-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'nft'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🏆 NFT
                </button>
              </div>
            </div>

            {/* 画布区域 */}
            <div className={`${activeTab === 'canvas' ? 'block' : 'hidden lg:block'}`}>
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex flex-col items-center space-y-6">
                  {/* 颜色选择器 */}
                  <ColorPalette
                    selectedColor={selectedColor}
                    onColorSelect={setSelectedColor}
                    disabled={!isConnected || isDrawing}
                  />

                  {/* 像素画布 */}
                  <PixelCanvas
                    canvasSize={canvasSize || 16}
                    pixelSize={24}
                    onPixelClick={handlePixelClick}
                    pixelChanges={pixelChanges.map(change => ({
                      artist: change.artist,
                      x: change.x,
                      y: change.y,
                      color: change.color,
                      timestamp: Number(change.timestamp),
                    }))}
                    selectedColor={selectedColor}
                    disabled={!isConnected || isDrawing}
                  />

                  {/* 绘制状态 */}
                  {isDrawing && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full max-w-md">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span className="text-blue-800 font-medium">绘制中...</span>
                      </div>
                      <p className="text-blue-600 text-sm text-center mt-2">
                        请在钱包中确认交易
                      </p>
                    </div>
                  )}

                  {/* 成功提示 */}
                  {isConfirmed && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 w-full max-w-md">
                      <p className="text-green-800 font-medium text-center">
                        🎉 像素绘制成功！
                      </p>
                    </div>
                  )}

                  {/* 自动快照生成通知 */}
                  {autoSnapshotStatus && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full max-w-md">
                      <p className="text-blue-800 font-medium text-center">
                        {autoSnapshotStatus}
                      </p>
                    </div>
                  )}

                  {/* 错误提示 */}
                  {userTriggeredError && (
                    <ErrorAlert
                      error={userTriggeredError}
                      onDismiss={() => {
                        setUserTriggeredError(null)
                      }}
                      autoHide={true}
                      autoHideDelay={8000}
                      className="w-full max-w-md"
                    />
                  )}
                </div>
              </div>

              {/* 移动端紧凑状态显示 */}
              <div className="lg:hidden space-y-4">
                <CompactStatusPanel />
                <CompactNFTDisplay />
              </div>
            </div>

            {/* 快照画廊 (移动端) */}
            <div className={`lg:hidden ${activeTab === 'snapshots' ? 'block' : 'hidden'}`}>
              <SnapshotGallery 
                pixelChanges={pixelChanges.map(change => ({
                  artist: change.artist,
                  x: change.x,
                  y: change.y,
                  color: change.color,
                  timestamp: Number(change.timestamp),
                }))}
                currentCycle={cycleInfo?.cycle ? Number(cycleInfo.cycle) : 1}
              />
            </div>

            {/* NFT画廊 (移动端) */}
            <div className={`lg:hidden ${activeTab === 'nft' ? 'block' : 'hidden'}`}>
              <NFTGallery />
            </div>
          </div>

          {/* 右侧边栏 (桌面端) */}
          <div className="hidden lg:block space-y-6">
            {/* 状态面板 */}
            <StatusPanel />

            {/* 快照进度 */}
            <SnapshotProgress compact />

            {/* NFT画廊 */}
            <NFTGallery />
          </div>
        </div>

        {/* 调试工具 (开发环境) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">🔧 开发调试工具</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>合约地址:</strong> {debugInfo.contractAddress}</p>
                <p><strong>事件监听:</strong> {debugInfo.eventsEnabled ? '✅ 启用' : '❌ 禁用'}</p>
              </div>
              <div>
                <button
                  onClick={testEventListening}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                  🧪 测试事件监听
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              打开浏览器控制台查看详细调试信息。绘制像素后应该看到 &quot;🎨 New pixel changes:&quot; 日志。
            </div>
          </div>
        )}

        {/* 页脚信息 */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            基于以太坊的去中心化像素艺术平台 |{' '}
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700"
            >
              GitHub
            </a>
          </p>
          <p className="mt-1">
            当前使用 {isConnected ? 'Localhost' : 'Sepolia'} 网络
          </p>
        </div>
      </div>
    </div>
  )
}

