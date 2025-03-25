require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        blockNumber: 18990000,
      },
      mining: {
        auto: true,
        interval: 0,
      },
<<<<<<< HEAD
      // chainId: 1, //设置为1的话会和主网的节点冲突
=======
      // chainId: 1,
>>>>>>> 499881ae695228c6c999d4ff6691fdbdd2e9db9e
      allowUnlimitedContractSize: true,
      accounts: {
        accountsBalance: "10000000000000000000000", // 10000 ETH
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
