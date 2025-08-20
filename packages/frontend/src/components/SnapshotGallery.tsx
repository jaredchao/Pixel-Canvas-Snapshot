/**
 * 快照画廊组件 - 包含快照生成、IPFS上传和NFT认领功能
 */
'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount } from 'wagmi'
import { useClaimableSnapshots, useClaimNFT, useUserNFTBalance, useSnapshot, useCurrentCycleInfo, useSetSnapshotIPFS } from '@/hooks/usePixelCanvas'
import { ErrorAlert } from './ErrorAlert'
import { snapshotService, type SnapshotGenerationStatus } from '@/lib/snapshotService'
import { ipfsService, type IPFSUploadStatus } from '@/lib/ipfsService'
import { calculateCanvasState, type PixelChange } from '@/lib/canvasUtils'

interface SnapshotGalleryProps {
  className?: string
  pixelChanges?: PixelChange[]
  currentCycle?: number
}

export function SnapshotGallery({ 
  className = '', 
  pixelChanges = [],
  currentCycle = 1
}: SnapshotGalleryProps) {
  const { address, isConnected } = useAccount()
  const { snapshotIds, isLoading, refetch } = useClaimableSnapshots(address)
  const { balance } = useUserNFTBalance(address)
  const claimNFT = useClaimNFT()
  const setSnapshotIPFS = useSetSnapshotIPFS()
  const cycleInfo = useCurrentCycleInfo()
  
  // 快照生成状态
  const [generationStatus, setGenerationStatus] = useState<SnapshotGenerationStatus>({
    status: 'idle',
    progress: 0,
    message: '准备就绪'
  })
  
  // IPFS上传状态
  const [uploadStatus, setUploadStatus] = useState<IPFSUploadStatus>({
    status: 'idle',
    progress: 0,
    message: '等待上传'
  })
  
  // UI状态
  const [activeTab, setActiveTab] = useState<'available' | 'owned' | 'preview'>('available')
  const [claimingId, setClaimingId] = useState<bigint | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  
  // 函数引用，用于在useEffect中调用
  const handleGenerateSnapshotRef = useRef<(() => Promise<void>) | null>(null)

  // 订阅快照生成状态更新
  useEffect(() => {
    const unsubscribe = snapshotService.onStatusUpdate(setGenerationStatus)
    return unsubscribe
  }, [])

  // 监听设置IPFS哈希交易状态
  useEffect(() => {
    if (setSnapshotIPFS.isConfirmed) {
      console.log('✅ IPFS哈希设置成功，刷新快照列表')
      refetch() // 刷新可认领快照列表
      
      // 更新上传状态为最终完成
      setUploadStatus(prev => ({
        ...prev,
        status: 'completed',
        progress: 100,
        message: '快照生成完成！现在可以认领NFT了'
      }))
    }
    
    if (setSnapshotIPFS.error) {
      console.error('❌ IPFS哈希设置失败:', setSnapshotIPFS.error)
      setUploadStatus({
        status: 'error',
        progress: 0,
        message: 'IPFS哈希设置失败',
        error: setSnapshotIPFS.error.message || '未知错误'
      })
    }
  }, [setSnapshotIPFS.isConfirmed, setSnapshotIPFS.error, refetch])

  // 监听自动快照生成事件
  useEffect(() => {
    const handleAutoGenerateSnapshot = async (event: CustomEvent) => {
      const { snapshotId, timestamp, totalChanges } = event.detail
      console.log('🎯 自动处理快照:', { snapshotId, timestamp, totalChanges })
      
      // 检查是否需要为当前周期生成快照
      if (snapshotId === currentCycle) {
        console.log('🔄 自动触发快照生成和IPFS上传...')
        
        // 自动触发快照生成
        setTimeout(() => {
          if (handleGenerateSnapshotRef.current) {
            handleGenerateSnapshotRef.current()
          }
        }, 2000) // 延迟2秒确保区块链状态更新
      }
    }

    // 添加事件监听器
    window.addEventListener('autoGenerateSnapshot', handleAutoGenerateSnapshot as EventListener)
    
    // 清理函数
    return () => {
      window.removeEventListener('autoGenerateSnapshot', handleAutoGenerateSnapshot as EventListener)
    }
  }, [currentCycle]) // 移除handleGenerateSnapshot依赖，因为它还没有定义完成

  // 生成当前画布的预览
  const generatePreview = async () => {
    if (pixelChanges.length === 0) {
      setPreviewImage(null)
      return
    }

    try {
      setGenerationStatus({
        status: 'rendering',
        progress: 50,
        message: '生成预览图...'
      })

      const previewBlob = await snapshotService.generatePreview(pixelChanges, 256)
      const imageUrl = URL.createObjectURL(previewBlob)
      setPreviewImage(imageUrl)

      setGenerationStatus({
        status: 'completed',
        progress: 100,
        message: '预览生成完成'
      })
    } catch (error) {
      console.error('预览生成失败:', error)
      setGenerationStatus({
        status: 'error',
        progress: 0,
        message: '预览生成失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  // 触发快照生成和上传
  const handleGenerateSnapshot = useCallback(async () => {
    if (!ipfsService.isAvailable()) {
      alert('IPFS服务不可用，请配置NFT.Storage API密钥')
      return
    }

    if (!isConnected) {
      alert('请先连接钱包')
      return
    }

    try {
      // 生成快照
      const snapshot = await snapshotService.generateSnapshot(
        currentCycle,
        pixelChanges
      )

      // 上传到IPFS
      setUploadStatus({
        status: 'uploading',
        progress: 10,
        message: '开始上传到IPFS...'
      })

      const nftResult = await ipfsService.uploadNFT(
        snapshot.imageBlob,
        {
          name: `PixelCanvas Snapshot #${currentCycle}`,
          description: snapshot.metadata.description,
          attributes: snapshot.metadata.attributes
        },
        {
          onProgress: (status) => {
            if (status.progress < 90) {
              setUploadStatus(status)
            }
          }
        }
      )

      // 设置快照IPFS哈希到智能合约
      setUploadStatus({
        status: 'uploading',
        progress: 90,
        message: '设置智能合约IPFS哈希...'
      })

      console.log('🔗 设置快照IPFS哈希:', {
        snapshotId: currentCycle,
        metadataHash: nftResult.metadataHash,
      })

      // 调用智能合约设置IPFS哈希 (需要合约owner权限)
      console.log('🔑 尝试设置IPFS哈希 (需要合约owner权限)...')
      
      try {
        setSnapshotIPFS.setSnapshotIPFS(BigInt(currentCycle), nftResult.metadataHash)
        
        // 等待交易确认
        setUploadStatus({
          status: 'uploading',
          progress: 95,
          message: '等待交易确认...'
        })
        
      } catch (contractError) {
        console.warn('⚠️ 无法设置IPFS哈希 (可能需要合约owner权限):', contractError)
        
        // 显示完成状态，但提示用户需要owner权限
        setUploadStatus({
          status: 'completed',
          progress: 100,
          message: '快照已上传到IPFS！需要合约owner设置哈希才能认领NFT',
          ipfsHash: nftResult.metadataHash,
          gatewayUrl: nftResult.metadataUrl,
          error: '提示：需要合约owner权限才能完成设置。在开发环境中，请使用anvil的第一个账户。'
        })
        
        return // 不再等待交易确认
      }

      console.log('✅ 快照处理完成:', {
        snapshotId: currentCycle,
        metadataHash: nftResult.metadataHash,
        imageHash: nftResult.imageHash,
        transactionHash: setSnapshotIPFS.hash
      })

    } catch (error) {
      console.error('快照生成失败:', error)
      setUploadStatus({
        status: 'error',
        progress: 0,
        message: '快照生成失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }, [ipfsService, isConnected, currentCycle, pixelChanges, setSnapshotIPFS])

  // 更新函数引用
  useEffect(() => {
    handleGenerateSnapshotRef.current = handleGenerateSnapshot
  }, [handleGenerateSnapshot])

  // 认领单个NFT
  const handleClaimSingle = async (snapshotId: bigint) => {
    try {
      setClaimingId(snapshotId)
      await claimNFT.claimSnapshotNFT(snapshotId)
      await refetch()
    } catch (error) {
      console.error('认领失败:', error)
    } finally {
      setClaimingId(null)
    }
  }

  // 批量认领NFT
  const handleClaimMultiple = async () => {
    if (snapshotIds.length === 0) return

    try {
      setClaimingId(BigInt(-1)) // 使用-1表示批量认领
      await claimNFT.claimMultipleNFTs(snapshotIds)
      await refetch()
    } catch (error) {
      console.error('批量认领失败:', error)
    } finally {
      setClaimingId(null)
    }
  }

  if (!isConnected) {
    return (
      <div className={`bg-white rounded-lg p-6 text-center ${className}`}>
        <div className="text-gray-500 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">连接钱包</h3>
          <p className="text-gray-500">连接您的钱包以查看和认领NFT</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {/* 标签页导航 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('available')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'available'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            可认领快照 ({snapshotIds.length})
          </button>
          <button
            onClick={() => setActiveTab('owned')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'owned'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            我的NFT ({balance})
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'preview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            当前预览
          </button>
        </nav>
      </div>

      <div className="p-6">
        {/* 可认领快照标签页 */}
        {activeTab === 'available' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">可认领的快照NFT</h3>
              {snapshotIds.length > 1 && (
                <button
                  onClick={handleClaimMultiple}
                  disabled={claimingId !== null}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {claimingId === BigInt(-1) ? '批量认领中...' : `认领全部 (${snapshotIds.length})`}
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">加载中...</span>
              </div>
            ) : snapshotIds.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 8h10a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500">暂无可认领的快照</p>
                <p className="text-sm text-gray-400 mt-1">参与绘制像素即可在快照生成后认领NFT</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {snapshotIds.map((snapshotId) => (
                  <SnapshotCard
                    key={snapshotId.toString()}
                    snapshotId={snapshotId}
                    onClaim={() => handleClaimSingle(snapshotId)}
                    isClaiming={claimingId === snapshotId}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 我的NFT标签页 */}
        {activeTab === 'owned' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-6">我的快照NFT</h3>
            {balance > 0 ? (
              <div className="text-center py-8">
                <div className="text-green-500 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-900 font-medium">您拥有 {balance} 个快照NFT</p>
                <p className="text-sm text-gray-500 mt-1">NFT详情功能开发中...</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-gray-500">您还没有快照NFT</p>
                <p className="text-sm text-gray-400 mt-1">参与绘制并认领快照NFT开始收藏</p>
              </div>
            )}
          </div>
        )}

        {/* 当前预览标签页 */}
        {activeTab === 'preview' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">当前画布预览</h3>
              <div className="flex space-x-2">
                <button
                  onClick={generatePreview}
                  disabled={generationStatus.status === 'rendering'}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {generationStatus.status === 'rendering' ? '生成中...' : '生成预览'}
                </button>
                <button
                  onClick={handleGenerateSnapshot}
                  disabled={generationStatus.status !== 'idle' || uploadStatus.status === 'uploading'}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {uploadStatus.status === 'uploading' ? '上传中...' : '生成快照'}
                </button>
              </div>
            </div>

            {/* 生成状态 */}
            {generationStatus.status !== 'idle' && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">快照生成进度</span>
                  <span className="text-sm text-gray-500">{generationStatus.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${generationStatus.progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">{generationStatus.message}</p>
              </div>
            )}

            {/* 上传状态 */}
            {uploadStatus.status !== 'idle' && (
              <div className="mb-4 p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-700">IPFS上传进度</span>
                  <span className="text-sm text-purple-500">{uploadStatus.progress}%</span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadStatus.progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-purple-600 mt-2">{uploadStatus.message}</p>
                {uploadStatus.ipfsHash && (
                  <p className="text-xs text-purple-500 mt-1">
                    IPFS: {uploadStatus.ipfsHash}
                  </p>
                )}
              </div>
            )}

            {/* 预览图显示 */}
            <div className="text-center">
              {previewImage ? (
                <div className="inline-block">
                  <img 
                    src={previewImage} 
                    alt="画布预览" 
                    className="max-w-full h-auto border border-gray-200 rounded-lg shadow-sm"
                    style={{ imageRendering: 'pixelated', maxWidth: '300px' }}
                  />
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      当前周期: {currentCycle} | 总更改: {pixelChanges.length}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      触发阈值: {cycleInfo.data?.threshold || 10} 次更改
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-12">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">点击"生成预览"查看当前画布状态</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {claimNFT.error && (
        <div className="p-4 border-t border-gray-200">
          <ErrorAlert
            error={claimNFT.error}
            onDismiss={() => {
              console.log('NFT claim error dismissed')
            }}
            autoHide={true}
            autoHideDelay={10000}
          />
        </div>
      )}
    </div>
  )
}

// 快照卡片组件
function SnapshotCard({ 
  snapshotId, 
  onClaim, 
  isClaiming 
}: { 
  snapshotId: bigint
  onClaim: () => void
  isClaiming: boolean
}) {
  const snapshot = useSnapshot(snapshotId)

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">快照 #{snapshotId.toString()}</h4>
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
          可认领
        </span>
      </div>
      
      {snapshot.data ? (
        <div className="space-y-2 text-sm text-gray-600">
          <p>更改次数: {snapshot.data.totalChanges.toString()}</p>
          <p>参与者: {snapshot.data.participantCount.toString()}</p>
          <p>时间: {new Date(Number(snapshot.data.timestamp) * 1000).toLocaleDateString()}</p>
          {snapshot.data.ipfsHash && (
            <p className="text-xs text-blue-600 truncate">
              IPFS: {snapshot.data.ipfsHash}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        </div>
      )}

      <button
        onClick={onClaim}
        disabled={isClaiming}
        className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isClaiming ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            认领中...
          </div>
        ) : (
          '认领NFT'
        )}
      </button>
    </div>
  )
}

export default SnapshotGallery
