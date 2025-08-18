'use client'

import React from 'react'
import { useAccount } from 'wagmi'
import { formatEther } from 'viem'
import { useCurrentCycleInfo, useUserParticipation, useCanvasConfig, useUserNFTBalance } from '@/hooks/usePixelCanvas'

interface StatusPanelProps {
  className?: string
}

export function StatusPanel({ className = '' }: StatusPanelProps) {
  const { address, isConnected } = useAccount()
  const { cycleInfo, isLoading: cycleLoading } = useCurrentCycleInfo()
  const { participation, isLoading: participationLoading } = useUserParticipation(address)
  const { pixelChangeFee, snapshotThreshold } = useCanvasConfig()
  const { balance: nftBalance } = useUserNFTBalance(address)

  if (!isConnected) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">状态面板</h2>
        <div className="text-center py-8">
          <p className="text-gray-500">请连接钱包查看状态信息</p>
        </div>
      </div>
    )
  }

  const progressPercentage = cycleInfo 
    ? Math.min((Number(cycleInfo.changes) / Number(cycleInfo.threshold)) * 100, 100)
    : 0

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h2 className="text-xl font-bold text-gray-800 mb-4">状态面板</h2>
      
      {/* 当前周期信息 */}
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-3">当前周期</h3>
          {cycleLoading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-blue-200 rounded mb-2"></div>
              <div className="h-4 bg-blue-200 rounded w-3/4"></div>
            </div>
          ) : cycleInfo ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-blue-700">周期编号:</span>
                <span className="font-medium">{cycleInfo.cycle.toString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">当前变更:</span>
                <span className="font-medium">{cycleInfo.changes.toString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">快照阈值:</span>
                <span className="font-medium">{cycleInfo.threshold.toString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">参与者:</span>
                <span className="font-medium">{cycleInfo.participants.toString()}</span>
              </div>
              
              {/* 进度条 */}
              <div className="mt-3">
                <div className="flex justify-between text-sm text-blue-700 mb-1">
                  <span>快照进度</span>
                  <span>{progressPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  还需要 {Number(cycleInfo.threshold) - Number(cycleInfo.changes)} 次变更触发快照
                </p>
              </div>
            </div>
          ) : (
            <p className="text-blue-700">加载失败</p>
          )}
        </div>

        {/* 用户参与信息 */}
        <div className="bg-green-50 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-3">我的参与</h3>
          {participationLoading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-green-200 rounded mb-2"></div>
              <div className="h-4 bg-green-200 rounded w-2/3"></div>
            </div>
          ) : participation ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-green-700">我的变更:</span>
                <span className="font-medium">{participation.changeCount.toString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">参与状态:</span>
                <span className={`font-medium ${participation.hasParticipated ? 'text-green-600' : 'text-gray-500'}`}>
                  {participation.hasParticipated ? '已参与' : '未参与'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">拥有NFT:</span>
                <span className="font-medium">{nftBalance ? nftBalance.toString() : '0'}</span>
              </div>
            </div>
          ) : (
            <p className="text-green-700">暂无参与记录</p>
          )}
        </div>

        {/* 费用信息 */}
        <div className="bg-yellow-50 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-3">费用信息</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-yellow-700">单次绘制费用:</span>
              <span className="font-medium">
                {pixelChangeFee ? `${formatEther(pixelChangeFee)} ETH` : '加载中...'}
              </span>
            </div>
            <div className="text-xs text-yellow-600">
              * 费用用于维护合约运行和奖励机制
            </div>
          </div>
        </div>

        {/* 钱包信息 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-3">钱包信息</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-700">连接状态:</span>
              <span className="font-medium text-green-600">已连接</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">地址:</span>
              <span className="font-mono text-sm">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 简化版状态显示组件，用于移动端或紧凑布局
export function CompactStatusPanel({ className = '' }: StatusPanelProps) {
  const { address, isConnected } = useAccount()
  const { cycleInfo } = useCurrentCycleInfo()
  const { participation } = useUserParticipation(address)

  if (!isConnected) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
        <p className="text-center text-gray-500 text-sm">请连接钱包</p>
      </div>
    )
  }

  const progressPercentage = cycleInfo 
    ? Math.min((Number(cycleInfo.changes) / Number(cycleInfo.threshold)) * 100, 100)
    : 0

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">周期 {cycleInfo?.cycle.toString() || '0'}</p>
          <p className="font-medium">{cycleInfo?.changes.toString() || '0'}/{cycleInfo?.threshold.toString() || '50'} 变更</p>
        </div>
        <div>
          <p className="text-gray-600">我的贡献</p>
          <p className="font-medium">{participation?.changeCount.toString() || '0'} 次绘制</p>
        </div>
      </div>
      
      {/* 紧凑进度条 */}
      <div className="mt-3">
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div 
            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 mt-1 text-center">
          {progressPercentage.toFixed(1)}% 完成
        </p>
      </div>
    </div>
  )
}
