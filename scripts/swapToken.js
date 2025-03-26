const {
  UNISWAP_ROUTER_ABI,
  UNISWAP_ADDRESSES,
  ERC20_ABI,
  TOKENS,
} = require("./constants");

/*
  npx hardhat run --network localhost scripts/swapToken.js
 */
async function main() {
  const provider = ethers.provider;
  const [signer] = await ethers.getSigners();
  const address = await signer.getAddress();

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

  console.log("Random Token 0:", token0.symbol);
  console.log("Random Token 1:", token1.symbol);

  const router = new ethers.Contract(
    UNISWAP_ADDRESSES.V2_ROUTER,
    UNISWAP_ROUTER_ABI,
    signer
  );

  // 获取余额（单位为 Wei）
  const balance = await signer.getBalance();
  // 将余额从 Wei 转换为 Ether（ETH）
  const balanceInEther = ethers.utils.formatEther(balance);
  console.log(`地址: ${address}的余额: ${balanceInEther} ETH`);

  let token0Balance;
  let token1Balance;

  const token0Contract = new ethers.Contract(token0.address, ERC20_ABI, signer);
  const token1Contract = new ethers.Contract(token0.address, ERC20_ABI, signer);

  const token0BalWei = await token0Contract.balanceOf(address);
  const token0BalNum = ethers.utils.formatUnits(token0BalWei, token0.decimals);
  const token1BalWei = await token1Contract.balanceOf(address);
  const token1BalNum = ethers.utils.formatUnits(token1BalWei, token0.decimals);

  console.log(`token0 ${token0.symbol}的余额为：${token0BalNum}`);
  console.log(`token0 ${token1.symbol}的余额为：${token1BalNum}`);

  //todo 获取amountOut
}

async function getQuote(
  uniswapRouter,
  selectedTokenIn,
  selectedTokenOut,
  amountIn
) {
  const amountInWei = ethers.utils.parseUnits(
    amountIn.toString(),
    selectedTokenIn.decimals
  );
  const path = [selectedTokenIn.address, selectedTokenOut.address];

  if (
    selectedTokenIn.address !== TOKENS.WETH.address &&
    selectedTokenOut.address !== TOKENS.WETH.address
  ) {
    // If neither token is WETH, route through WETH
    path.splice(1, 0, TOKENS.WETH.address);
  }

  const amounts = await uniswapRouter.getAmountsOut(amountInWei, path);
  const outputAmountFormatted = ethers.utils.formatUnits(
    amounts[amounts.length - 1],
    selectedTokenOut.decimals
  );
}

main().catch(console.error);
