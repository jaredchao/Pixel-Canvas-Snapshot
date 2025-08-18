'use client'

import React, { useState } from 'react'
import { ErrorAlert, SimpleErrorAlert, ErrorToast } from './ErrorAlert'
import { type Web3Error } from '@/lib/errorHandler'

// 示例错误数据
const sampleErrors: { [key: string]: Web3Error } = {
  userRejected: {
    name: 'UserRejectedError',
    message: 'User rejected the request. Request Arguments: from: 0xdCaba37F87Ceb795A0C6B8145C4068C2322A6435 to: 0x5FbDB2315678afecb367f032d93F642f64180aa3 value: 0.001 ETH data: 0xf853af69000000000000000000000000000000000000000000000000000000000000000700000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000001 Contract Call: address: 0x5FbDB2315678afecb367f032d93F642f64180aa3 function: changePixel(uint8 x, uint8 y, uint8 color) args: (7, 4, 1) sender: 0xdCaba37F87Ceb795A0C6B8145C4068C2322A6435 Docs: https://viem.sh/docs/contract/writeContract Details: MetaMask Tx Signature: User denied transaction signature. Version: viem@2.33.3',
    code: 4001
  },
  insufficientFunds: {
    name: 'InsufficientFundsError',
    message: 'insufficient funds for gas * price + value',
    code: 'INSUFFICIENT_FUNDS'
  },
  networkError: {
    name: 'NetworkError',
    message: 'network connection timeout',
    code: 'NETWORK_ERROR'
  },
  contractError: {
    name: 'ContractError',
    message: 'execution reverted: X coordinate out of bounds',
    code: 'CALL_EXCEPTION'
  },
  invalidColor: {
    name: 'ContractError',
    message: 'execution reverted: Invalid color',
    code: 'CALL_EXCEPTION'
  },
  unknownError: {
    name: 'UnknownError',
    message: 'Something went wrong',
    code: 'UNKNOWN'
  }
}

export function ErrorDemo() {
  const [currentError, setCurrentError] = useState<Web3Error | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastError, setToastError] = useState<Web3Error | null>(null)

  const handleShowError = (errorKey: string) => {
    setCurrentError(sampleErrors[errorKey])
  }

  const handleShowToast = (errorKey: string) => {
    setToastError(sampleErrors[errorKey])
    setShowToast(true)
  }

  const clearError = () => {
    setCurrentError(null)
  }

  const clearToast = () => {
    setShowToast(false)
    setToastError(null)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">错误处理演示</h1>
        <p className="text-gray-600">展示不同类型的Web3错误处理效果</p>
      </div>

      {/* 错误按钮 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <button
          onClick={() => handleShowError('userRejected')}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          用户拒绝交易
        </button>
        <button
          onClick={() => handleShowError('insufficientFunds')}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          余额不足
        </button>
        <button
          onClick={() => handleShowError('networkError')}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          网络错误
        </button>
        <button
          onClick={() => handleShowError('contractError')}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          合约错误
        </button>
        <button
          onClick={() => handleShowError('invalidColor')}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          颜色无效
        </button>
        <button
          onClick={() => handleShowError('unknownError')}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          未知错误
        </button>
      </div>

      {/* Toast按钮 */}
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">Toast提示演示</h3>
        <div className="space-x-4">
          <button
            onClick={() => handleShowToast('userRejected')}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            显示Toast (用户拒绝)
          </button>
          <button
            onClick={() => handleShowToast('networkError')}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            显示Toast (网络错误)
          </button>
        </div>
      </div>

      {/* 错误显示区域 */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">完整错误提示</h3>
          <div className="min-h-[100px] flex items-center justify-center">
            {currentError ? (
              <ErrorAlert
                error={currentError}
                onDismiss={clearError}
                className="w-full max-w-lg"
              />
            ) : (
              <p className="text-gray-500">点击上方按钮查看错误提示效果</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">简化错误提示</h3>
          <div className="min-h-[80px] flex items-center justify-center">
            {currentError ? (
              <SimpleErrorAlert
                error={currentError}
                className="w-full max-w-lg"
              />
            ) : (
              <p className="text-gray-500">点击上方按钮查看简化错误提示效果</p>
            )}
          </div>
        </div>
      </div>

      {/* 清除按钮 */}
      {currentError && (
        <div className="text-center">
          <button
            onClick={clearError}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            清除错误
          </button>
        </div>
      )}

      {/* Toast组件 */}
      {showToast && (
        <ErrorToast
          error={toastError}
          onDismiss={clearToast}
          position="top-right"
        />
      )}

      {/* 说明文档 */}
      <div className="bg-gray-50 rounded-lg p-6 mt-8">
        <h3 className="text-lg font-semibold mb-4">错误类型说明</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-yellow-800">用户操作错误</h4>
            <p className="text-gray-600">用户拒绝交易、钱包未连接等</p>
          </div>
          <div>
            <h4 className="font-medium text-blue-800">网络错误</h4>
            <p className="text-gray-600">连接超时、网络不可用等</p>
          </div>
          <div>
            <h4 className="font-medium text-red-800">合约错误</h4>
            <p className="text-gray-600">参数错误、执行失败等</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-800">系统错误</h4>
            <p className="text-gray-600">未知错误、系统异常等</p>
          </div>
        </div>
      </div>
    </div>
  )
}
