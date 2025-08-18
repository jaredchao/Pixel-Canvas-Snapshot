'use client'

import React, { useState } from 'react'
import { useAccount } from 'wagmi'
import { useClaimableSnapshots, useClaimNFT, useUserNFTBalance, useSnapshot } from '@/hooks/usePixelCanvas'
import { ErrorAlert } from './ErrorAlert'

interface NFTGalleryProps {
  className?: string
}

export function NFTGallery({ className = '' }: NFTGalleryProps) {
  const { address, isConnected } = useAccount()
  const { snapshotIds, isLoading, refetch } = useClaimableSnapshots(address)
  const { balance } = useUserNFTBalance(address)
  const claimNFT = useClaimNFT()
  const [claimingId, setClaimingId] = useState<bigint | null>(null)
  const [claimingMultiple, setClaimingMultiple] = useState(false)

  const handleClaimSingle = async (snapshotId: bigint) => {
    setClaimingId(snapshotId)
    try {
      claimNFT.claimSnapshotNFT(snapshotId)
    } catch (error) {
      console.error('Failed to claim NFT:', error)
      setClaimingId(null)
    }
  }

  const handleClaimAll = async () => {
    if (snapshotIds.length === 0) return
    
    setClaimingMultiple(true)
    try {
      claimNFT.claimMultipleNFTs(snapshotIds)
    } catch (error) {
      console.error('Failed to claim multiple NFTs:', error)
      setClaimingMultiple(false)
    }
  }

  // 重置状态当交易完成
  React.useEffect(() => {
    if (claimNFT.isConfirmed) {
      setClaimingId(null)
      setClaimingMultiple(false)
      refetch() // 刷新可认领列表
    }
  }, [claimNFT.isConfirmed, refetch])

  if (!isConnected) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">NFT 画廊</h2>
        <div className="text-center py-8">
          <p className="text-gray-500">请连接钱包查看NFT</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h2 className="text-xl font-bold text-gray-800 mb-4">NFT 画廊</h2>
      
      {/* NFT 统计 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">
            {balance ? balance.toString() : '0'}
          </p>
          <p className="text-sm text-purple-700">拥有的NFT</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">
            {snapshotIds.length}
          </p>
          <p className="text-sm text-orange-700">可认领快照</p>
        </div>
      </div>

      {/* 可认领的快照 */}
      {snapshotIds.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">可认领快照</h3>
            <button
              onClick={handleClaimAll}
              disabled={claimingMultiple || claimNFT.isPending}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed 
                         text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {claimingMultiple ? '认领中...' : `认领全部 (${snapshotIds.length})`}
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {snapshotIds.map((snapshotId) => (
              <ClaimableSnapshotCard
                key={snapshotId.toString()}
                snapshotId={snapshotId}
                onClaim={handleClaimSingle}
                isClaiming={claimingId === snapshotId}
                disabled={claimNFT.isPending || claimingMultiple}
              />
            ))}
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-500 mt-2">加载中...</p>
        </div>
      )}

      {/* 空状态 */}
      {!isLoading && snapshotIds.length === 0 && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🎨</div>
          <p className="text-gray-500 mb-2">暂无可认领的快照NFT</p>
          <p className="text-sm text-gray-400">参与像素绘制以获得快照NFT</p>
        </div>
      )}

      {/* 交易状态提示 */}
      {claimNFT.isPending && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="font-medium">请在钱包中确认交易</p>
              <p className="text-sm text-gray-500 mt-2">认领NFT中...</p>
            </div>
          </div>
        </div>
      )}

      {claimNFT.isConfirming && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <p className="text-blue-800 font-medium">交易已提交，等待确认...</p>
          <p className="text-blue-600 text-sm mt-1">这可能需要几秒钟到几分钟</p>
        </div>
      )}

      {claimNFT.isConfirmed && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
          <p className="text-green-800 font-medium">🎉 NFT认领成功！</p>
          <p className="text-green-600 text-sm mt-1">您的快照NFT已成功铸造到您的钱包</p>
        </div>
      )}

      {claimNFT.error && (
        <ErrorAlert
          error={claimNFT.error}
          onDismiss={() => {
            console.log('NFT claim error dismissed')
          }}
          autoHide={true}
          autoHideDelay={10000}
          className="mt-4"
        />
      )}
    </div>
  )
}

// 可认领快照卡片组件
interface ClaimableSnapshotCardProps {
  snapshotId: bigint
  onClaim: (id: bigint) => void
  isClaiming: boolean
  disabled: boolean
}

function ClaimableSnapshotCard({ snapshotId, onClaim, isClaiming, disabled }: ClaimableSnapshotCardProps) {
  const { snapshot, isLoading } = useSnapshot(snapshotId)

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (!snapshot || !snapshot.exists) {
    return (
      <div className="border border-red-200 rounded-lg p-4 bg-red-50">
        <p className="text-red-600 text-sm">快照数据不存在</p>
      </div>
    )
  }

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString('zh-CN')
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="mb-3">
        <h4 className="font-medium text-gray-800">快照 #{snapshotId.toString()}</h4>
        <p className="text-xs text-gray-500 mt-1">
          {formatDate(snapshot.timestamp)}
        </p>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">总变更:</span>
          <span className="font-medium">{snapshot.totalChanges.toString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">参与者:</span>
          <span className="font-medium">{snapshot.participantCount.toString()}</span>
        </div>
      </div>

      <button
        onClick={() => onClaim(snapshotId)}
        disabled={disabled || isClaiming}
        className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 
                   disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm 
                   font-medium transition-colors"
      >
        {isClaiming ? '认领中...' : '认领NFT'}
      </button>
    </div>
  )
}

// 简化版NFT显示组件
export function CompactNFTDisplay({ className = '' }: { className?: string }) {
  const { address, isConnected } = useAccount()
  const { snapshotIds } = useClaimableSnapshots(address)
  const { balance } = useUserNFTBalance(address)

  if (!isConnected) {
    return null
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">我的NFT</p>
          <p className="font-medium">{balance ? balance.toString() : '0'} 个</p>
        </div>
        {snapshotIds.length > 0 && (
          <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
            {snapshotIds.length} 个可认领
          </div>
        )}
      </div>
    </div>
  )
}
