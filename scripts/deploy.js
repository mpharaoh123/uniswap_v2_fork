const fs = require("fs");
const { promisify } = require("util");

/*
  npx hardhat run --network localhost scripts/deploy.js
*/

async function main() {
  const gasPrice = await ethers.provider.getGasPrice();
  const block = await ethers.provider.getBlock("latest");
  const baseFeePerGas = block.baseFeePerGas;

  // 确保maxFeePerGas大于或等于baseFeePerGas + maxPriorityFeePerGas
  const maxPriorityFeePerGas = gasPrice; // 设置为当前的gasPrice
  const maxFeePerGas = baseFeePerGas.add(maxPriorityFeePerGas); // 确保maxFeePerGas足够高

  const UserStorageData = await ethers.getContractFactory("UserStorageData");
  const userStorageData = await UserStorageData.deploy({
    maxFeePerGas,
    maxPriorityFeePerGas,
  });
  await userStorageData.deployed();
  console.log(`UserStorageData deployed to ${userStorageData.address}`);

  const data = `NEXT_PUBLIC_STORAGE_ADDRESS=${userStorageData.address}`;

  const filePath = ".env";
  let fileContent = "";
  try {
    fileContent = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    console.log(".env file not found, creating a new one.");
  }

  // 检查是否已经存在UserStorageData地址
  if (fileContent.includes("NEXT_PUBLIC_STORAGE_ADDRESS=")) {
    // 替换现有的UserStorageData地址
    const updatedContent = fileContent.replace(
      /NEXT_PUBLIC_STORAGE_ADDRESS=.*\n?/,
      `${data}`
    );
    fs.writeFileSync(filePath, updatedContent);
    console.log("Existing NEXT_PUBLIC_STORAGE_ADDRESS replaced.");
  } else {
    // 如果不存在，追加新的地址
    fs.appendFileSync(filePath, `\n${data}`);
    console.log("New NEXT_PUBLIC_STORAGE_ADDRESS added.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});