const fs = require("fs");
const { promisify } = require("util");

async function main() {
  const gasPrice = await ethers.provider.getGasPrice();
  const block = await ethers.provider.getBlock("latest");
  const baseFeePerGas = block.baseFeePerGas;

  // 确保maxFeePerGas大于或等于baseFeePerGas + maxPriorityFeePerGas
  const maxPriorityFeePerGas = gasPrice; // 设置为当前的gasPrice
  const maxFeePerGas = baseFeePerGas.add(maxPriorityFeePerGas); // 确保maxFeePerGas足够高

  // 部署合约
  const UserStorageData = await ethers.getContractFactory("UserStorageData");
  const userStorageData = await UserStorageData.deploy({
    maxFeePerGas,
    maxPriorityFeePerGas,
  });
  await userStorageData.deployed();
  console.log(`UserStorageData deployed to ${userStorageData.address}`);
  const data = `UserStorageData=${userStorageData.address}`;

  const writeFile = promisify(fs.appendFile);
  const filePath = ".env";
  return writeFile(filePath, "\n" + data)
    .then(() => {
      console.log("Addresses recorded.");
    })
    .catch((error) => {
      console.error("Error logging addresses:", error);
      throw error;
    });
}

/*
   npx hardhat run --network localhost scripts/deploy.js
  */
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});