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

  // 构造要写入的数据
  const data = `UserStorageData=${userStorageData.address}`;

  // 读取.env文件内容
  const filePath = ".env";
  let fileContent = "";
  try {
    fileContent = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    // 如果文件不存在，直接写入新的地址
    console.log(".env file not found, creating a new one.");
  }

  // 检查是否已经存在UserStorageData地址
  if (fileContent.includes("UserStorageData=")) {
    // 替换现有的UserStorageData地址
    const updatedContent = fileContent.replace(
      /UserStorageData=.*\n?/,
      `${data}\n`
    );
    fs.writeFileSync(filePath, updatedContent);
    console.log("Existing UserStorageData address replaced.");
  } else {
    // 如果不存在，追加新的地址
    fs.appendFileSync(filePath, `\n${data}`);
    console.log("New UserStorageData address added.");
  }
}

/*
   npx hardhat run --network localhost scripts/deploy.js
  */
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});