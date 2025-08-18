# 🎨 PixelCanvas - 临时像素画布与快照NFT

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Foundry](https://img.shields.io/badge/Foundry-latest-orange)](https://getfoundry.sh/)
[![Next.js](https://img.shields.io/badge/Next.js-15-blue)](https://nextjs.org/)

一个创新的去中心化协作像素艺术平台，用户可以共同创作临时像素画布，系统会定期生成快照并铸造为NFT奖励给参与者。

## ✨ 核心特点

- 🎨 **协作创作**: 多用户共同绘制16x16像素画布
- 📸 **定期快照**: 每10次更改自动生成艺术快照
- 🏆 **NFT奖励**: 参与者可认领限量快照NFT
- ⚡ **实时更新**: 实时显示其他用户的绘制操作
- 💰 **Web3经济**: 基于以太坊的去中心化激励机制
- 🔄 **周期重置**: 快照后画布重置，开启新的创作周期

## 🎯 项目概念

PixelCanvas 是一个去中心化的协作艺术平台，灵感来源于 Reddit r/place，但增加了Web3经济激励机制：

- **临时性**: 每个创作周期都是临时的，增加了紧迫感和珍贵性
- **协作性**: 多人共同创作，每个像素都承载着不同创作者的想法
- **奖励性**: 通过NFT奖励机制激励用户积极参与
- **去中心化**: 基于智能合约，无需中心化服务器管理

## 🚀 快速开始

### 前置要求

- Node.js 18+
- pnpm 8+
- Foundry
- MetaMask或其他Web3钱包

### 安装和运行

1. **克隆项目**
```bash
git clone <your-repo-url>
cd "Ephemeral Pixel Canvas & Snapshot"
```

2. **安装依赖**
```bash
pnpm install
```

3. **启动本地区块链**
```bash
# 在新终端窗口中运行
anvil --port 8545 --host 0.0.0.0
```

4. **部署智能合约**
```bash
cd packages/contracts
npm run deploy:pixel
```

5. **启动前端应用**
```bash
cd packages/frontend
npm run dev
```

6. **访问应用**
   - 打开浏览器访问: http://localhost:3000
   - 连接钱包并开始创作！

## 🏗️ 项目架构

```
PixelCanvas/
├── packages/
│   ├── contracts/              # 智能合约 (Foundry + Soldeer)
│   │   ├── src/
│   │   │   └── PixelCanvas.sol # 核心合约
│   │   ├── script/             # 部署和交互脚本
│   │   ├── test/               # 合约测试
│   │   └── foundry.toml        # Foundry配置
│   └── frontend/               # 前端应用 (Next.js)
│       ├── src/
│       │   ├── app/            # Next.js App Router
│       │   ├── components/     # React组件
│       │   ├── hooks/          # Web3 Hooks
│       │   └── lib/            # 工具和配置
│       └── package.json
├── docs/                       # 📚 项目文档
│   ├── INDEX.md               # 文档索引
│   ├── README.md              # 项目概述
│   ├── milestones/            # 里程碑报告
│   ├── development/           # 开发计划
│   ├── bug-fixes/             # Bug修复记录
│   └── architecture/          # 架构设计
└── package.json               # 根配置文件
```

## 🔧 技术栈

### 智能合约层
- **Solidity**: 智能合约编程语言  
- **Foundry**: 现代化合约开发框架
- **Soldeer**: 合约依赖管理 (替代git submodules)
- **OpenZeppelin**: 安全的智能合约库
- **Anvil**: 本地以太坊开发网络

### 前端层  
- **Next.js 15**: React全栈框架 (App Router)
- **TypeScript**: 类型安全的JavaScript
- **Wagmi**: React Hooks for Ethereum
- **RainbowKit**: 优雅的钱包连接UI
- **TailwindCSS**: 原子化CSS框架
- **HTML5 Canvas**: 像素画布渲染

### Web3集成
- **Viem**: 轻量级以太坊TypeScript库
- **MetaMask**: 主要支持的钱包
- **IPFS/Arweave**: 去中心化存储(NFT元数据)

## 🎮 使用指南

### 基本操作

1. **连接钱包**: 点击右上角的"连接钱包"按钮
2. **选择颜色**: 从8色调色板中选择想要的颜色
3. **绘制像素**: 点击画布上的格子进行绘制
4. **支付费用**: 每次绘制需要支付0.001 ETH
5. **查看进度**: 观察快照进度条 (每10次更改触发快照)

### NFT奖励机制

- **参与条件**: 在当前周期内绘制至少一个像素
- **快照触发**: 累计10次像素更改后自动生成快照
- **NFT认领**: 快照生成后，参与者可认领对应的NFT
- **周期重置**: 快照后画布重置，开启新的创作周期

### 实时功能

- **实时更新**: 其他用户的绘制会实时显示
- **参与统计**: 查看当前周期的参与人数和更改次数  
- **NFT画廊**: 浏览历史快照和已认领的NFT

## 📚 详细文档

我们提供了完整的项目文档，按功能模块组织：

### 📖 核心文档
- **[文档索引](docs/INDEX.md)** - 完整的文档导航
- **[项目概述](docs/README.md)** - 深入的技术概念和设计理念

### 📋 开发文档  
- **[开发里程碑](docs/development/MILESTONES.md)** - 10周开发计划
- **[快照阈值优化](docs/development/SNAPSHOT_THRESHOLD_UPDATE.md)** - 技术优化记录

### 🏆 进度报告
- **[里程碑1完成](docs/milestones/MILESTONE1_COMPLETED.md)** - 合约基础架构
- **[里程碑2完成](docs/milestones/MILESTONE2_COMPLETED.md)** - 前端界面实现

### 🛠️ 技术改进
- **[错误处理优化](docs/bug-fixes/ERROR_HANDLING_IMPROVED.md)** - Web3错误处理系统
- **[钱包连接改进](docs/bug-fixes/WALLET_CONNECTION_ADDED.md)** - 用户体验提升

## 🧪 开发指南

### 智能合约开发

```bash
cd packages/contracts

# 编译合约
forge build

# 运行测试  
forge test

# 部署到本地
npm run deploy:pixel

# 交互测试
npm run interact:pixel
```

### 前端开发

```bash
cd packages/frontend

# 启动开发服务器
npm run dev

# 类型检查
npm run type-check

# 代码检查
npm run lint

# 构建生产版本
npm run build
```

### 常用命令

```bash
# 项目根目录命令
pnpm install                    # 安装所有依赖
pnpm build                      # 构建所有包
pnpm test                       # 运行所有测试

# 合约相关命令 
pnpm contracts:build            # 编译合约
pnpm contracts:test             # 测试合约  
pnpm contracts:deploy           # 部署合约

# 前端相关命令
pnpm frontend:dev               # 启动前端开发
pnpm frontend:build             # 构建前端
```

## 📊 项目状态

### 当前进度 (里程碑完成情况)

- ✅ **里程碑1**: 合约依赖管理和基础架构 (已完成)
- ✅ **里程碑2**: 前端界面和用户交互 (已完成)  
- 🔄 **里程碑3**: 快照和NFT功能 (进行中)
- ⏳ **里程碑4**: 部署和优化 (计划中)
- ⏳ **里程碑5**: 高级功能 (计划中)

### 核心功能状态

| 功能模块 | 状态 | 说明 |
|---------|------|------|
| 智能合约 | ✅ 完成 | 像素绘制、快照、NFT功能 |
| 前端界面 | ✅ 完成 | 画布、调色板、状态面板 |
| 钱包集成 | ✅ 完成 | RainbowKit + Wagmi |
| 实时更新 | ✅ 完成 | 事件监听和状态同步 |
| 错误处理 | ✅ 完成 | 智能化错误提示 |
| IPFS集成 | 🔄 开发中 | NFT元数据存储 |
| 部署优化 | ⏳ 计划中 | Gas优化和性能提升 |

## 🌐 部署指南

### 测试网部署

1. **环境准备**
```bash
# 设置环境变量
export SEPOLIA_PRIVATE_KEY="your-private-key"
export SEPOLIA_RPC_URL="your-rpc-url"
```

2. **部署合约**
```bash
cd packages/contracts
npm run deploy:pixel:sepolia
```

3. **更新前端配置**
```bash
# 更新合约地址
export NEXT_PUBLIC_CONTRACT_ADDRESS="deployed-contract-address"
```

### 生产部署

- **前端**: 支持Vercel、Netlify等平台
- **合约**: 支持以太坊主网、Polygon等网络
- **存储**: IPFS/Arweave去中心化存储

## 🐛 故障排除

### 常见问题

1. **钱包连接失败**
   - 确保安装MetaMask
   - 检查网络配置 (Localhost 31337)
   - 导入测试账户私钥

2. **合约交互失败**  
   - 检查ETH余额 (需要Gas费用)
   - 确认合约地址正确
   - 查看浏览器控制台错误

3. **像素绘制失败**
   - 确保支付足够费用 (0.001 ETH)
   - 检查坐标范围 (0-15)
   - 验证颜色值 (0-7)

4. **快照不触发**
   - 确认当前周期更改次数
   - 检查智能合约事件日志
   - 验证阈值配置 (10次)

### 调试工具

```bash
# 查看合约状态
cast call $CONTRACT_ADDRESS "getCurrentCycleInfo()" --rpc-url $RPC_URL

# 查看画布状态  
cast call $CONTRACT_ADDRESS "getCurrentCanvasState()" --rpc-url $RPC_URL

# 监听合约事件
cast logs --from-block latest $CONTRACT_ADDRESS --rpc-url $RPC_URL
```

**PixelCanvas** - 让每个像素都有价值，让每次创作都被记录！
