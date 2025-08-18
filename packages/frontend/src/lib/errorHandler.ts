/**
 * Web3错误处理工具函数
 */

export interface Web3Error extends Error {
  code?: string | number
  reason?: string
  shortMessage?: string
}

export interface ErrorInfo {
  title: string
  message: string
  suggestion: string
  type: 'user' | 'network' | 'contract' | 'unknown'
  icon: string
}

/**
 * 解析Web3错误信息，返回用户友好的错误提示
 */
export function parseWeb3Error(error: Web3Error): ErrorInfo {
  const errorMessage = error.message || error.shortMessage || error.reason || '未知错误'
  
  // 用户拒绝交易
  if (
    errorMessage.includes('User rejected') ||
    errorMessage.includes('user rejected') ||
    errorMessage.includes('User denied') ||
    errorMessage.includes('user denied') ||
    error.code === 4001 ||
    error.code === 'ACTION_REJECTED'
  ) {
    return {
      title: '交易已取消',
      message: '您取消了钱包中的交易确认',
      suggestion: '如需绘制像素，请重新点击并在钱包中确认交易',
      type: 'user',
      icon: '❌'
    }
  }

  // Gas费不足
  if (
    errorMessage.includes('insufficient funds') ||
    errorMessage.includes('insufficient balance') ||
    errorMessage.includes('out of gas') ||
    error.code === 'INSUFFICIENT_FUNDS'
  ) {
    return {
      title: 'ETH余额不足',
      message: '您的钱包ETH余额不足以支付交易费用',
      suggestion: '请确保钱包中有足够的ETH来支付gas费和绘制费用',
      type: 'user',
      icon: '💰'
    }
  }

  // 网络错误
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    error.code === 'NETWORK_ERROR'
  ) {
    return {
      title: '网络连接异常',
      message: '无法连接到区块链网络',
      suggestion: '请检查网络连接，确保连接到正确的网络（Localhost 或 Sepolia）',
      type: 'network',
      icon: '🌐'
    }
  }

  // 合约执行错误
  if (
    errorMessage.includes('execution reverted') ||
    errorMessage.includes('revert') ||
    errorMessage.includes('require') ||
    error.code === 'CALL_EXCEPTION'
  ) {
    // 具体的合约错误
    if (errorMessage.includes('X coordinate out of bounds')) {
      return {
        title: '坐标超出范围',
        message: 'X坐标超出了画布范围',
        suggestion: '请点击画布内的有效区域（0-15）',
        type: 'contract',
        icon: '📍'
      }
    }
    
    if (errorMessage.includes('Y coordinate out of bounds')) {
      return {
        title: '坐标超出范围',
        message: 'Y坐标超出了画布范围',
        suggestion: '请点击画布内的有效区域（0-15）',
        type: 'contract',
        icon: '📍'
      }
    }
    
    if (errorMessage.includes('Invalid color')) {
      return {
        title: '颜色值无效',
        message: '选择的颜色值不在有效范围内',
        suggestion: '请从调色板中选择有效的颜色（0-7）',
        type: 'contract',
        icon: '🎨'
      }
    }
    
    if (errorMessage.includes('Insufficient fee')) {
      return {
        title: '费用不足',
        message: '支付的费用低于要求的绘制费用',
        suggestion: '请确保支付足够的费用（0.001 ETH）',
        type: 'contract',
        icon: '💳'
      }
    }
    
    return {
      title: '合约执行失败',
      message: '智能合约执行过程中发生错误',
      suggestion: '请检查交易参数是否正确，稍后重试',
      type: 'contract',
      icon: '⚠️'
    }
  }

  // 钱包未连接
  if (
    errorMessage.includes('not connected') ||
    errorMessage.includes('no provider') ||
    errorMessage.includes('wallet not connected')
  ) {
    return {
      title: '钱包未连接',
      message: '请先连接您的Web3钱包',
      suggestion: '点击右上角的"连接钱包"按钮连接您的钱包',
      type: 'user',
      icon: '🔗'
    }
  }

  // 默认未知错误
  return {
    title: '操作失败',
    message: '发生了未知错误',
    suggestion: '请稍后重试，如果问题持续存在请联系支持',
    type: 'unknown',
    icon: '❓'
  }
}

/**
 * 获取错误类型对应的样式类名
 */
export function getErrorStyles(type: ErrorInfo['type']) {
  const baseClasses = 'border rounded-lg p-4 w-full max-w-md'
  
  switch (type) {
    case 'user':
      return `${baseClasses} bg-yellow-50 border-yellow-200`
    case 'network':
      return `${baseClasses} bg-blue-50 border-blue-200`
    case 'contract':
      return `${baseClasses} bg-red-50 border-red-200`
    default:
      return `${baseClasses} bg-gray-50 border-gray-200`
  }
}

/**
 * 获取错误类型对应的文本样式类名
 */
export function getErrorTextStyles(type: ErrorInfo['type']) {
  switch (type) {
    case 'user':
      return {
        title: 'text-yellow-800',
        message: 'text-yellow-700',
        suggestion: 'text-yellow-600'
      }
    case 'network':
      return {
        title: 'text-blue-800',
        message: 'text-blue-700',
        suggestion: 'text-blue-600'
      }
    case 'contract':
      return {
        title: 'text-red-800',
        message: 'text-red-700',
        suggestion: 'text-red-600'
      }
    default:
      return {
        title: 'text-gray-800',
        message: 'text-gray-700',
        suggestion: 'text-gray-600'
      }
  }
}
