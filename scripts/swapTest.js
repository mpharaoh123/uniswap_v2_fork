const {
  UNISWAP_ROUTER_ABI,
  UNISWAP_ADDRESSES,
  TOKENS,
} = require("./constants");

/*
  npx hardhat run --network localhost scripts/swapTest.js
 */
async function main() {
  const [web3Signer] = await ethers.getSigners();

  const router = new ethers.Contract(
    UNISWAP_ADDRESSES.V2_ROUTER,
    UNISWAP_ROUTER_ABI,
    web3Signer
  );

  // 获取所有代币的名称数组
  const tokensNames = Object.keys(TOKENS);

  // 确保数组长度至少为2，否则无法选择两个不同的代币
  if (tokensNames.length < 2) {
    console.error("Not enough tokens available to pick two different ones.");
    return;
  }

  // 使用 Fisher-Yates 洗牌算法打乱数组顺序
  for (let i = tokensNames.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tokensNames[i], tokensNames[j]] = [tokensNames[j], tokensNames[i]];
  }

  // 选择前两个元素作为随机选取的代币名称
  const [firstTokenName, secondTokenName] = tokensNames.slice(0, 2);

  // 获取对应的代币对象
  const token0 = TOKENS[firstTokenName];
  const token1 = TOKENS[secondTokenName];

  console.log("Random Token 0:", token0);
  console.log("Random Token 1:", token1);
}

main().catch(console.error);
