# ReflexProof Frontend

ReflexProof 是一个结合 Fully Homomorphic Encryption (FHEVM) 的链上手速测试 DApp。本仓库提供 Next.js + Tailwind 的前端界面，
用于与 `action/contracts` 目录中的 `ReflexProof.sol` 智能合约交互，并支持：

- 本地 Hardhat 模式（通过 `@fhevm/mock-utils` 自动加载 MockFhevmInstance）
- Sepolia 测试网模式（通过 `@zama-fhe/relayer-sdk` 连接官方 Relayer）

This template also illustrates how to run your FHEVM-dApp on both Sepolia as well as a local Hardhat Node (much faster).

> [!IMPORTANT]
> Please follow the detailed installation instructions [below](#install).

## Features

- **@zama-fhe/relayer-sdk** 与 **@fhevm/mock-utils**：根据网络自动切换真实 Relayer 与本地 Mock FHEVM 实例
- **ReflexProof 合约集成**：支持链上成绩提交、密文解密申请、可见性模式切换
- **动态 UI**：基于 Next.js + Tailwind 的动感体验，内置反应速度小游戏与排行榜

## Requirements

- You need to have Metamask browser extension installed on your browser.

## Local Hardhat Network (to add in MetaMask)

Follow the step-by-step guide in the [Hardhat + MetaMask](https://docs.metamask.io/wallet/how-to/run-devnet/) documentation to set up your local devnet using Hardhat and MetaMask.

- Name: Hardhat
- RPC URL: http://127.0.0.1:8545
- Chain ID: 31337
- Currency symbol: ETH

## Install

```sh
cd action/frontend
npm install
```

## Setup

1. 在 `action/contracts` 中设置 Hardhat 环境变量（可选，部署到测试网时需要）：

```sh
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
```

2. 启动本地 Hardhat 节点：

```sh
cd action/contracts
npx hardhat node
```

3. 在新终端部署 ReflexProof 合约（本地网络）：

```sh
cd action/contracts
npx hardhat deploy --network localhost
```

4. 如需部署到 Sepolia：

```sh
cd action/contracts
npx hardhat deploy --network sepolia
```

## Run frontend in mock mode

1. Start a local Hardhat node (new terminal):

```sh
cd action/contracts
npx hardhat node --verbose
```

2. 在 `action/frontend` 运行开发服务器

```sh
npm run dev:mock
```

3. In your browser open `http://localhost:3000`

4. Open Metamask connect to local Hardhat node
   i. Select Add network.
   ii. Select Add a network manually.
   iii. Enter your Hardhat Network RPC URL, http://127.0.0.1:8545/ (or http://localhost:8545).
   iv. Enter your Hardhat Network chain ID, 31337 (or 0x539 in hexadecimal format).

## How to fix Hardhat Node + Metamask Errors ?

When using MetaMask as a wallet provider with a development node like Hardhat, you may encounter two common types of errors:

### 1. ⚠️ Nonce Mismatch ❌💥

MetaMask tracks wallet nonces (the number of transactions sent from a wallet). However, if you restart your Hardhat node, the nonce is reset on the dev node, but MetaMask does not update its internal nonce tracking. This discrepancy causes a nonce mismatch error.

### 2. ⚠️ View Function Call Result Mismatch ❌💥

MetaMask caches the results of view function calls. If you restart your Hardhat node, MetaMask may return outdated cached data corresponding to a previous instance of the node, leading to incorrect results.

### ✅ How to Fix Nonce Mismatch:

To fix the nonce mismatch error, simply clear the MetaMask cache:

1. Open the MetaMask browser extension.
2. Select the Hardhat network.
3. Go to Settings > Advanced.
4. Click the "Clear Activity Tab" red button to reset the nonce tracking.

The correct way to do this is also explained [here](https://docs.metamask.io/wallet/how-to/run-devnet/).

### ✅ How to Fix View Function Return Value Mismatch:

To fix the view function result mismatch:

1. Restart the entire browser. MetaMask stores its cache in the extension's memory, which cannot be cleared by simply clearing the browser cache or using MetaMask's built-in cache cleaning options.

By following these steps, you can ensure that MetaMask syncs correctly with your Hardhat node and avoid potential issues related to nonces and cached view function results.

## Project Structure Overview

### Key Files/Folders

- **`action/frontend/fhevm`**: FHEVM 交互核心代码，可复用到其他 React 项目。
- **`action/frontend/hooks/useReflexProof.tsx`**: ReflexProof 专用业务 Hook，负责成绩加密、上链、解密授权与排行榜刷新。

- **`action/frontend/hooks/metamask`**: MetaMask 封装，兼容 EIP-6963，也便于替换为其它钱包方案。

## Documentation

- [Hardhat + MetaMask](https://docs.metamask.io/wallet/how-to/run-devnet/): Set up your local devnet step by step using Hardhat and MetaMask.
- [FHEVM Documentation](https://docs.zama.ai/protocol/solidity-guides/)
- [FHEVM Hardhat](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)
- [@zama-fhe/relayer-sdk Documentation](https://docs.zama.ai/protocol/relayer-sdk-guides/)
- [Setting up MNEMONIC and INFURA_API_KEY](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup#set-up-the-hardhat-configuration-variables-optional)
- [React Documentation](https://reactjs.org/)
- [FHEVM Discord Community](https://discord.com/invite/zama)
- [GitHub Issues](https://github.com/zama-ai/fhevm-react-template/issues)

## License

This project is licensed under the BSD-3-Clause-Clear License - see the LICENSE file for details.
