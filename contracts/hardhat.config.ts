import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import type { HardhatUserConfig } from "hardhat/config";
import { vars } from "hardhat/config";
import "solidity-coverage";

const MNEMONIC = vars.get("MNEMONIC", "");
const INFURA_API_KEY = vars.get("INFURA_API_KEY", ""); // no default
const SEPOLIA_RPC_URL = vars.get("SEPOLIA_RPC_URL", "");
const PRIVATE_KEY_RAW = vars.get("PRIVATE_KEY", "");
const PRIVATE_KEY = PRIVATE_KEY_RAW
  ? (PRIVATE_KEY_RAW.startsWith("0x") ? PRIVATE_KEY_RAW : `0x${PRIVATE_KEY_RAW}`)
  : "";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
    organizer: 1,
    verifier: 2
  },
  solidity: {
    version: "0.8.27",
    settings: {
      metadata: {
        bytecodeHash: "ipfs"
      },
      optimizer: {
        enabled: true,
        runs: 800
      },
      evmVersion: "cancun"
    }
  },
  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: true,
      ...(MNEMONIC && MNEMONIC.length > 0 ? { accounts: { mnemonic: MNEMONIC } } : {})
    },
    localhost: {
      chainId: 31337,
      url: "http://127.0.0.1:8545",
      ...(MNEMONIC && MNEMONIC.length > 0 ? { accounts: { mnemonic: MNEMONIC } } : {})
    },
    sepolia: {
      chainId: 11155111,
      url:
        SEPOLIA_RPC_URL && SEPOLIA_RPC_URL.length > 0
          ? SEPOLIA_RPC_URL
          : (INFURA_API_KEY && INFURA_API_KEY.length > 0 ? `https://sepolia.infura.io/v3/${INFURA_API_KEY}` : ""),
      ...(PRIVATE_KEY && PRIVATE_KEY.length > 2
        ? { accounts: [PRIVATE_KEY] }
        : (MNEMONIC && MNEMONIC.length > 0 ? { accounts: { mnemonic: MNEMONIC } } : {}))
    }
  },
  etherscan: {
    apiKey: {
      sepolia: vars.get("ETHERSCAN_API_KEY", "")
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    deploy: "./deploy"
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v6"
  }
};

export default config;

