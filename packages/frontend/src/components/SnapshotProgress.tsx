/**
 * 快照进度指示器组件
 */
'use client'

import React, { useState, useEffect } from 'react'
import { useCurrentCycleInfo } from '@/hooks/usePixelCanvas'

interface SnapshotProgressProps {
  className?: string
  compact?: boolean
}

export function SnapshotProgress({ className = '', compact = false }: SnapshotProgressProps) {
  const { data: cycleInfo, isLoading, error } = useCurrentCycleInfo()
  const [animationClass, setAnimationClass] = useState('')

  // 计算进度
  const currentChanges = Number(cycleInfo?.changes || 0)
  const threshold = Number(cycleInfo?.threshold || 10)
  const progress = Math.min((currentChanges / threshold) * 100, 100)
  const remaining = Math.max(threshold - currentChanges, 0)

  // 进度条颜色
  const getProgressColor = () => {
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 80) return 'bg-yellow-500'
    if (progress >= 60) return 'bg-orange-500'
    return 'bg-blue-500'
  }

  // 状态文本
  const getStatusText = () => {
    if (progress >= 100) return '快照准备就绪！'
    if (progress >= 80) return '即将触发快照'
    if (progress >= 60) return '快照进度良好'
    if (progress >= 30) return '正在积累更改'
    return '等待像素更改'
  }

  // 动画效果
  useEffect(() => {
    if (progress >= 100) {
      setAnimationClass('animate-pulse')
    } else {
      setAnimationClass('')
    }
  }, [progress])

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-2 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg p-4 border border-red-200 ${className}`}>
        <div className="text-red-600 text-sm">
          无法加载快照进度信息
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className={`bg-white rounded-lg p-3 shadow-sm ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">快照进度</span>
          <span className="text-xs text-gray-500">{progress.toFixed(0)}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${getProgressColor()} ${animationClass}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-xs text-gray-600">
          <span>{currentChanges}/{threshold}</span>
          <span>{remaining > 0 ? `还需${remaining}次` : '已完成'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {/* 标题栏 */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">快照进度</h3>
              <p className="text-sm text-gray-600">{getStatusText()}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{progress.toFixed(0)}%</div>
            <div className="text-sm text-gray-500">周期 #{cycleInfo?.cycle || 1}</div>
          </div>
        </div>
      </div>

      {/* 进度详情 */}
      <div className="p-6">
        {/* 主进度条 */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>像素更改进度</span>
            <span>{currentChanges} / {threshold}</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
            <div 
              className={`h-4 rounded-full transition-all duration-700 ease-out ${getProgressColor()} ${animationClass}`}
              style={{ width: `${progress}%` }}
            >
              <div className="h-full bg-white rounded-full opacity-30 w-1/3 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">{currentChanges}</div>
            <div className="text-sm text-gray-600">总更改</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">{cycleInfo?.participants || 0}</div>
            <div className="text-sm text-gray-600">参与者</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">{remaining}</div>
            <div className="text-sm text-gray-600">还需要</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">{threshold}</div>
            <div className="text-sm text-gray-600">触发阈值</div>
          </div>
        </div>

        {/* 状态指示 */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${
              progress >= 100 ? 'bg-green-500 animate-pulse' :
              progress >= 80 ? 'bg-yellow-500' :
              progress >= 40 ? 'bg-blue-500' : 'bg-gray-400'
            }`}></div>
            <span className="text-sm font-medium text-gray-700">
              {getStatusText()}
            </span>
          </div>
          
          {progress >= 100 && (
            <div className="flex items-center text-green-600">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">准备生成</span>
            </div>
          )}
        </div>

        {/* 下一步提示 */}
        {progress >= 100 ? (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-green-800">快照已准备就绪</h4>
                <p className="text-sm text-green-700 mt-1">
                  达到 {threshold} 次更改！快照将在下次像素更改时自动触发，或者管理员可以手动触发。
                </p>
              </div>
            </div>
          </div>
        ) : remaining <= 3 ? (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">即将触发快照</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  还差 {remaining} 次像素更改就会触发快照生成！
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">继续创作</h4>
                <p className="text-sm text-blue-700 mt-1">
                  继续绘制像素来推进快照进度。每次更改都会让我们更接近下一个快照！
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SnapshotProgress
