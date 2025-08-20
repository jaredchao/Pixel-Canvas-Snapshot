'use client'

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from 'wagmi'
import { pixelCanvasContract } from '@/lib/wagmi'
import { parseEther } from 'viem'
import { useEffect, useState } from 'react'

// 类型定义
export interface PixelChange {
  artist: string
  x: number
  y: number
  color: number
  timestamp: bigint
}

export interface CycleInfo {
  cycle: bigint
  changes: bigint
  threshold: bigint
  participants: bigint
}

export interface UserParticipation {
  changeCount: bigint
  hasParticipated: boolean
}

export interface Snapshot {
  id: bigint
  timestamp: bigint
  ipfsHash: string
  totalChanges: bigint
  participantCount: bigint
  exists: boolean
}

// 获取画布配置信息
export function useCanvasConfig() {
  const canvasSize = useReadContract({
    ...pixelCanvasContract,
    functionName: 'CANVAS_SIZE',
    query: {
      retry: 2, // 减少重试次数
      retryDelay: 1000,
    }
  })

  const maxColor = useReadContract({
    ...pixelCanvasContract,
    functionName: 'MAX_COLOR',
    query: {
      retry: 2,
      retryDelay: 1000,
    }
  })

  const snapshotThreshold = useReadContract({
    ...pixelCanvasContract,
    functionName: 'SNAPSHOT_THRESHOLD',
    query: {
      retry: 2,
      retryDelay: 1000,
    }
  })

  const pixelChangeFee = useReadContract({
    ...pixelCanvasContract,
    functionName: 'pixelChangeFee',
    query: {
      retry: 2,
      retryDelay: 1000,
    }
  })

  // 只在关键错误时返回错误（比如合约地址错误），忽略网络暂时性错误
  const criticalError = canvasSize.error || maxColor.error || snapshotThreshold.error || pixelChangeFee.error
  const hasAnyData = canvasSize.data || maxColor.data || snapshotThreshold.data || pixelChangeFee.data

  return {
    canvasSize: canvasSize.data as number | undefined,
    maxColor: maxColor.data as number | undefined,
    snapshotThreshold: snapshotThreshold.data as bigint | undefined,
    pixelChangeFee: pixelChangeFee.data as bigint | undefined,
    isLoading: canvasSize.isLoading || maxColor.isLoading || snapshotThreshold.isLoading || pixelChangeFee.isLoading,
    // 只有在完全没有数据且有错误时才报告错误
    error: !hasAnyData && criticalError ? criticalError : null,
  }
}

// 获取当前周期信息
export function useCurrentCycleInfo() {
  const { data, isLoading, error, refetch } = useReadContract({
    ...pixelCanvasContract,
    functionName: 'getCurrentCycleInfo',
  })

  const cycleInfo = data as [bigint, bigint, bigint, bigint] | undefined

  return {
    cycleInfo: cycleInfo ? {
      cycle: cycleInfo[0],
      changes: cycleInfo[1],
      threshold: cycleInfo[2],
      participants: cycleInfo[3],
    } as CycleInfo : undefined,
    isLoading,
    error,
    refetch,
  }
}

// 获取当前画布状态
export function useCurrentCanvasState() {
  const { data, isLoading, error, refetch } = useReadContract({
    ...pixelCanvasContract,
    functionName: 'getCurrentCanvasState',
  })
  return {
    pixelChanges: (data as PixelChange[]) || [],
    isLoading,
    error,
    refetch,
  }
}

// 获取用户参与信息
export function useUserParticipation(userAddress?: string) {
  const { data, isLoading, error, refetch } = useReadContract({
    ...pixelCanvasContract,
    functionName: 'getCurrentUserParticipation',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
  })

  const participation = data as [bigint, boolean] | undefined

  return {
    participation: participation ? {
      changeCount: participation[0],
      hasParticipated: participation[1],
    } as UserParticipation : undefined,
    isLoading,
    error,
    refetch,
  }
}

// 获取可认领的快照
export function useClaimableSnapshots(userAddress?: string) {
  const { data, isLoading, error, refetch } = useReadContract({
    ...pixelCanvasContract,
    functionName: 'getClaimableSnapshots',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
  })
  return {
    snapshotIds: (data as bigint[]) || [],
    isLoading,
    error,
    refetch,
  }
}

// 获取快照信息
export function useSnapshot(snapshotId?: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    ...pixelCanvasContract,
    functionName: 'getSnapshot',
    args: snapshotId !== undefined ? [snapshotId] : undefined,
  })

  return {
    snapshot: data as Snapshot | undefined,
    isLoading,
    error,
    refetch,
  }
}

// 更改像素
export function useChangePixel() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const changePixel = (x: number, y: number, color: number, fee: bigint) => {
    writeContract({
      ...pixelCanvasContract,
      functionName: 'changePixel',
      args: [x, y, color],
      value: fee,
    })
  }

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  return {
    changePixel,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  }
}

// 认领NFT
export function useClaimNFT() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const claimSnapshotNFT = (snapshotId: bigint) => {
    writeContract({
      ...pixelCanvasContract,
      functionName: 'claimSnapshotNFT',
      args: [snapshotId],
    })
  }

  const claimMultipleNFTs = (snapshotIds: bigint[]) => {
    writeContract({
      ...pixelCanvasContract,
      functionName: 'claimMultipleNFTs',
      args: [snapshotIds],
    })
  }

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  return {
    claimSnapshotNFT,
    claimMultipleNFTs,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  }
}

// 设置快照IPFS哈希
export function useSetSnapshotIPFS() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const setSnapshotIPFS = (snapshotId: bigint, ipfsHash: string) => {
    writeContract({
      ...pixelCanvasContract,
      functionName: 'setSnapshotIPFS',
      args: [snapshotId, ipfsHash],
    })
  }

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  return {
    setSnapshotIPFS,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  }
}

// 获取用户NFT余额
export function useUserNFTBalance(userAddress?: string) {
  const { data, isLoading, error, refetch } = useReadContract({
    ...pixelCanvasContract,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
  })

  return {
    balance: data as bigint | undefined,
    isLoading,
    error,
    refetch,
  }
}

// 实时事件监听hooks
export function usePixelChangedEvents() {
  const [recentChanges, setRecentChanges] = useState<any[]>([])
  useWatchContractEvent({
    ...pixelCanvasContract,
    eventName: 'PixelChanged',
    enabled: true,
    onLogs(logs) {
      console.log('🎨 New pixel changes:', logs)
      setRecentChanges(prev => [...logs, ...prev].slice(0, 20)) // 保留最近20条
    },
    onError(error) {
      console.error('❌ Pixel events monitoring error:', error)
    },
  })

  return { recentChanges }
}

export function useSnapshotEvents() {
  const [recentSnapshots, setRecentSnapshots] = useState<any[]>([])

  useWatchContractEvent({
    ...pixelCanvasContract,
    eventName: 'SnapshotTaken',
    onLogs(logs) {
      console.log('📸 New snapshots:', logs)
      console.log('📸 Contract address:', pixelCanvasContract.address)
      setRecentSnapshots(prev => [...logs, ...prev].slice(0, 10)) // 保留最近10条
      
      // 触发自动快照处理
      logs.forEach(log => {
        const { args } = log
        if (args && args.snapshotId) {
          console.log('🚀 检测到新快照，准备自动处理...', {
            snapshotId: args.snapshotId.toString(),
            timestamp: args.timestamp?.toString(),
            totalChanges: args.totalChanges?.toString()
          })
          
          // 通过自定义事件通知需要处理快照
          window.dispatchEvent(new CustomEvent('autoGenerateSnapshot', {
            detail: {
              snapshotId: Number(args.snapshotId),
              timestamp: args.timestamp,
              totalChanges: args.totalChanges
            }
          }))
        }
      })
    },
    onError(error) {
      console.error('❌ Snapshot events monitoring error:', error)
    },
  })

  return { recentSnapshots }
}

export function useNFTClaimedEvents(userAddress?: string) {
  const [userClaims, setUserClaims] = useState<any[]>([])

  useWatchContractEvent({
    ...pixelCanvasContract,
    eventName: 'NFTClaimed',
    args: userAddress ? { claimer: userAddress as `0x${string}` } : undefined,
    onLogs(logs) {
      console.log('🏆 NFT claimed:', logs)
      setUserClaims(prev => [...logs, ...prev].slice(0, 10))
    },
    onError(error) {
      console.error('❌ NFT claim events monitoring error:', error)
    },
  })

  return { userClaims }
}

// 调试工具：手动测试事件监听
export function useEventDebugger() {
  const [debugInfo, setDebugInfo] = useState<{
    contractAddress: string
    chainId?: number
    eventsEnabled: boolean
    lastEventTime?: number
  }>({
    contractAddress: pixelCanvasContract.address,
    eventsEnabled: false,
  })

  useEffect(() => {
    // 检查合约配置
    console.log('🔍 事件调试信息:')
    console.log('  合约地址:', pixelCanvasContract.address)
    console.log('  ABI包含的事件:', ['PixelChanged', 'SnapshotTaken', 'NFTClaimed'])
    
    setDebugInfo(prev => ({
      ...prev,
      eventsEnabled: true,
    }))
  }, [])

  const testEventListening = () => {
    console.log('🧪 开始测试事件监听...')
    console.log('如果您在绘制像素后看到 "🎨 New pixel changes:" 日志，说明事件监听正常工作')
    console.log('如果没有看到任何事件日志，可能的原因：')
    console.log('1. 合约地址不正确')
    console.log('2. 网络连接问题 (确保连接到 localhost:8545)')
    console.log('3. MetaMask网络设置问题')
    console.log('4. Anvil没有运行或合约未部署')
    console.log('')
    console.log('💡 快照认领问题解决方案：')
    console.log('如果快照无法认领，请确保：')
    console.log('1. 快照已生成 (10次像素更改)')
    console.log('2. IPFS哈希已设置 (需要合约owner权限)')
    console.log('3. 您参与了该快照周期的绘制')
    console.log('')
    console.log('🔧 使用Anvil默认账户设置IPFS哈希：')
    console.log('1. 确保MetaMask连接到Anvil的第一个账户 (0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)')
    console.log('2. 或使用命令行: cast send <CONTRACT> "setSnapshotIPFS(uint256,string)" 1 "QmYourIPFSHash"')
  }

  return { debugInfo, testEventListening }
}

// 实时数据更新hook
export function useRealtimeCanvasData() {
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(5000) // 5秒自动刷新

  const canvasState = useCurrentCanvasState()
  const cycleInfo = useCurrentCycleInfo()
  const { recentChanges } = usePixelChangedEvents()
  const { recentSnapshots } = useSnapshotEvents()

  // 当有新的像素变更或快照事件时，自动刷新数据
  useEffect(() => {
    if (recentChanges.length > 0) {
      console.log('🔍 有新的像素变更，刷新数据...')
      canvasState.refetch()
      cycleInfo.refetch()
    }
  }, [recentChanges.length, canvasState.refetch, cycleInfo.refetch])

  useEffect(() => {
    if (recentSnapshots.length > 0) {
      cycleInfo.refetch()
    }
  }, [recentSnapshots.length, cycleInfo.refetch])

  // 定时刷新作为备用机制
  useEffect(() => {
    if (!autoRefreshInterval) return

    const interval = setInterval(() => {
      canvasState.refetch()
      cycleInfo.refetch()
    }, autoRefreshInterval)

    return () => clearInterval(interval)
  }, [autoRefreshInterval, canvasState.refetch, cycleInfo.refetch])

  return {
    ...canvasState,
    cycleInfo: cycleInfo.cycleInfo,
    cycleInfoLoading: cycleInfo.isLoading,
    cycleInfoError: cycleInfo.error,
    setAutoRefreshInterval,
    autoRefreshInterval,
    recentChanges,
    recentSnapshots,
  }
}

// 像素绘制完整流程hook
export function usePixelDrawing() {
  const { pixelChangeFee, error: configError } = useCanvasConfig()
  const changePixel = useChangePixel()
  const canvasState = useCurrentCanvasState()
  const cycleInfo = useCurrentCycleInfo()

  const drawPixel = (x: number, y: number, color: number) => {
    if (!pixelChangeFee) {
      throw new Error('Pixel change fee not loaded')
    }
    changePixel.changePixel(x, y, color, pixelChangeFee)
  }

  // 当交易确认后刷新数据
  useEffect(() => {
    if (changePixel.isConfirmed) {
      canvasState.refetch()
      cycleInfo.refetch()
    }
  }, [changePixel.isConfirmed, canvasState.refetch, cycleInfo.refetch])

  return {
    drawPixel,
    hash: changePixel.hash,
    isPending: changePixel.isPending,
    isConfirming: changePixel.isConfirming,
    isConfirmed: changePixel.isConfirmed,
    error: changePixel.error, // 只返回交易相关的错误，不包括配置加载错误
    pixelChangeFee,
    configError, // 单独暴露配置错误，如果需要的话
    isDrawing: changePixel.isPending || changePixel.isConfirming,
  }
}
