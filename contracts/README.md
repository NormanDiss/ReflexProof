# ReflexProof Contracts

ReflexProof 智能合约基于 Zama FHEVM，提供手速测试成绩的链上存证、可控解密与证书铸造功能。

## 项目结构

```
contracts/
├── contracts/ReflexProof.sol       # 核心合约 + FHE 加密存储 + SBT 证书
├── deploy/00_deploy_reflexproof.ts # hardhat-deploy 部署脚本
├── hardhat.config.ts               # 启用了 @fhevm/hardhat-plugin
└── typechain/                      # 运行 `npm run compile` 后生成
```

## 快速开始

```bash
cd action/contracts
npm install
npx hardhat compile
```

### 本地 Mock 模式

```bash
npx hardhat node
# 另一个终端
npm run deploy:localhost
```

### Sepolia 部署

```bash
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
npm run deploy:sepolia
```

部署完成后，前端可通过 `npm run genabi` 自动生成 ABI 与地址映射文件。

## 主要函数

- `submitResult(SubmitParams)`：写入成绩密文、可见性、设备指纹等元数据，同时为提交者开启解密权限。
- `grantDecrypt` / `verifyResult` / `awardCertificate`：管理解密授权、审核与 SBT 证书。
- `getResult` / `getEncryptedValue`：前端通过 FHEVM 实例解密平均反应时间。

## 依赖

- `@fhevm/hardhat-plugin@^0.1.0`
- `@fhevm/solidity`
- `@fhevm/mock-utils`
- `@openzeppelin/contracts@^5`

若遇到 `kmsVerifierContractAddress` 相关错误，请确认 `fhevmTemp/precompiled-fhevm-core-contracts-addresses.json` 中存在 `KMSVerifierAddress` 字段。

