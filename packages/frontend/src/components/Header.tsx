'use client'

import React from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'

export function Header() {
  const { isConnected } = useAccount()

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo和标题 */}
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              {/* 像素艺术风格的logo */}
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-sm flex items-center justify-center">
                <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                  <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-white/60 rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-white/60 rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                </div>
              </div>
              <h1 className="text-xl font-bold text-slate-900">
                PixelCanvas
              </h1>
              <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                Beta
              </span>
            </div>
          </div>

          {/* 导航和钱包连接 */}
          <div className="flex items-center space-x-4">
            {/* 导航菜单 */}
            <nav className="hidden md:flex space-x-6">
              <a 
                href="#canvas" 
                className="text-slate-600 hover:text-slate-900 transition-colors font-medium"
              >
                画布
              </a>
              <a 
                href="#gallery" 
                className="text-slate-600 hover:text-slate-900 transition-colors font-medium"
              >
                NFT画廊
              </a>
              <a 
                href="#about" 
                className="text-slate-600 hover:text-slate-900 transition-colors font-medium"
              >
                关于
              </a>
            </nav>

            {/* 网络状态指示器 */}
            <div className="hidden sm:flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                <span className="text-xs text-slate-500">
                  {isConnected ? 'Localhost' : '未连接'}
                </span>
              </div>
            </div>

            {/* 钱包连接按钮 */}
            <div className="flex items-center">
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openAccountModal,
                  openChainModal,
                  openConnectModal,
                  authenticationStatus,
                  mounted,
                }) => {
                  // 注意：如果你的应用使用SSR，下面的代码防止hydration不匹配
                  const ready = mounted && authenticationStatus !== 'loading'
                  const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus ||
                      authenticationStatus === 'authenticated')

                  return (
                    <div
                      {...(!ready && {
                        'aria-hidden': true,
                        'style': {
                          opacity: 0,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        },
                      })}
                    >
                      {(() => {
                        if (!connected) {
                          return (
                            <button
                              onClick={openConnectModal}
                              type="button"
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                            >
                              连接钱包
                            </button>
                          )
                        }

                        if (chain.unsupported) {
                          return (
                            <button
                              onClick={openChainModal}
                              type="button"
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                            >
                              切换网络
                            </button>
                          )
                        }

                        return (
                          <div className="flex items-center space-x-2">
                            {/* 链信息按钮 */}
                            <button
                              onClick={openChainModal}
                              className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors"
                              type="button"
                            >
                              {chain.hasIcon && (
                                <div
                                  style={{
                                    background: chain.iconBackground,
                                    width: 16,
                                    height: 16,
                                    borderRadius: 999,
                                    overflow: 'hidden',
                                  }}
                                >
                                  {chain.iconUrl && (
                                    <img
                                      alt={chain.name ?? 'Chain icon'}
                                      src={chain.iconUrl}
                                      style={{ width: 16, height: 16 }}
                                    />
                                  )}
                                </div>
                              )}
                              <span className="text-sm font-medium text-gray-700">
                                {chain.name}
                              </span>
                            </button>

                            {/* 账户信息按钮 */}
                            <button
                              onClick={openAccountModal}
                              type="button"
                              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                            >
                              {account.ensAvatar && (
                                <img
                                  alt={account.ensName ?? account.address}
                                  src={account.ensAvatar}
                                  className="w-4 h-4 rounded-full"
                                />
                              )}
                              <span className="text-sm">
                                {account.ensName ?? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`}
                              </span>
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                            </button>
                          </div>
                        )
                      })()}
                    </div>
                  )
                }}
              </ConnectButton.Custom>
            </div>

            {/* 移动端菜单按钮 */}
            <div className="md:hidden">
              <button
                type="button"
                className="text-slate-600 hover:text-slate-900 transition-colors"
                aria-label="打开菜单"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
