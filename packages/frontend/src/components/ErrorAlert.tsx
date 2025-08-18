'use client'

import React, { useState, useEffect } from 'react'
import { parseWeb3Error, getErrorStyles, getErrorTextStyles, type Web3Error } from '@/lib/errorHandler'

interface ErrorAlertProps {
  error: Web3Error | null
  onDismiss?: () => void
  autoHide?: boolean
  autoHideDelay?: number
  className?: string
}

export function ErrorAlert({ 
  error, 
  onDismiss, 
  autoHide = false, 
  autoHideDelay = 5000,
  className = '' 
}: ErrorAlertProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (error) {
      setIsVisible(true)
      
      if (autoHide) {
        const timer = setTimeout(() => {
          setIsVisible(false)
          setTimeout(() => onDismiss?.(), 300) // 等待动画完成
        }, autoHideDelay)
        
        return () => clearTimeout(timer)
      }
    } else {
      setIsVisible(false)
    }
  }, [error, autoHide, autoHideDelay, onDismiss])

  if (!error || !isVisible) {
    return null
  }

  const errorInfo = parseWeb3Error(error)
  const containerStyles = getErrorStyles(errorInfo.type)
  const textStyles = getErrorTextStyles(errorInfo.type)

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => onDismiss?.(), 300)
  }

  return (
    <div 
      className={`${containerStyles} ${className} transition-all duration-300 ${
        isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'
      }`}
    >
      <div className="flex items-start space-x-3">
        {/* 错误图标 */}
        <div className="flex-shrink-0">
          <span className="text-2xl" role="img" aria-label="错误图标">
            {errorInfo.icon}
          </span>
        </div>

        {/* 错误内容 */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${textStyles.title}`}>
            {errorInfo.title}
          </h3>
          <p className={`mt-1 ${textStyles.message}`}>
            {errorInfo.message}
          </p>
          <p className={`mt-2 text-sm ${textStyles.suggestion}`}>
            💡 {errorInfo.suggestion}
          </p>
        </div>

        {/* 关闭按钮 */}
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className={`flex-shrink-0 p-1 rounded-md transition-colors ${textStyles.title} hover:bg-black hover:bg-opacity-10`}
            aria-label="关闭错误提示"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 错误类型指示器 */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            errorInfo.type === 'user' ? 'bg-yellow-200 text-yellow-800' :
            errorInfo.type === 'network' ? 'bg-blue-200 text-blue-800' :
            errorInfo.type === 'contract' ? 'bg-red-200 text-red-800' :
            'bg-gray-200 text-gray-800'
          }`}>
            {errorInfo.type === 'user' ? '用户操作' :
             errorInfo.type === 'network' ? '网络错误' :
             errorInfo.type === 'contract' ? '合约错误' :
             '系统错误'}
          </span>
        </div>
        
        {/* 重试建议 */}
        {errorInfo.type !== 'user' && (
          <button
            onClick={handleDismiss}
            className={`text-xs ${textStyles.suggestion} hover:underline`}
          >
            重试操作
          </button>
        )}
      </div>
    </div>
  )
}

// 简化版错误提示组件
interface SimpleErrorAlertProps {
  error: Web3Error | null
  className?: string
}

export function SimpleErrorAlert({ error, className = '' }: SimpleErrorAlertProps) {
  if (!error) return null

  const errorInfo = parseWeb3Error(error)

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <span className="text-lg">{errorInfo.icon}</span>
        <div>
          <p className="text-red-800 font-medium text-sm">{errorInfo.title}</p>
          <p className="text-red-600 text-xs mt-1">{errorInfo.suggestion}</p>
        </div>
      </div>
    </div>
  )
}

// Toast风格的错误提示组件
interface ErrorToastProps {
  error: Web3Error | null
  onDismiss: () => void
  position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center'
}

export function ErrorToast({ 
  error, 
  onDismiss, 
  position = 'top-right' 
}: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (error) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onDismiss, 300)
      }, 6000) // 6秒后自动消失
      
      return () => clearTimeout(timer)
    }
  }, [error, onDismiss])

  if (!error) return null

  const errorInfo = parseWeb3Error(error)
  
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  }

  return (
    <div 
      className={`fixed z-50 max-w-sm w-full mx-4 ${positionClasses[position]} transition-all duration-300 ${
        isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'
      }`}
    >
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start space-x-3">
          <span className="text-xl flex-shrink-0">{errorInfo.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">{errorInfo.title}</p>
            <p className="text-sm text-gray-600 mt-1">{errorInfo.message}</p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false)
              setTimeout(onDismiss, 300)
            }}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
