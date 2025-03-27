const {
  UNISWAP_ADDRESSES,
  UNISWAP_ROUTER_ABI,
  UNISWAP_FACTORY_ABI,
  UNISWAP_POOL_ABI,
  ERC20_ABI,
  TOKENS,
} = require("./constants");

/*
  npx hardhat run --network localhost scripts/swapToken.js
 */
async function main() {
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
  // const [firstTokenName, secondTokenName] = tokensNames.slice(0, 2);

  [firstTokenName, secondTokenName] = ["USDT", "BUSD"];
  // 获取对应的代币对象
  const token0 = TOKENS[firstTokenName];
  const token1 = TOKENS[secondTokenName];

  console.log("Random Token 0:", token0.symbol);
  console.log("Random Token 1:", token1.symbol);

  const uniswapRouter = new ethers.Contract(
    UNISWAP_ADDRESSES.V2_ROUTER,
    UNISWAP_ROUTER_ABI,
    signer
  );

  // 获取余额（单位为 Wei）
  const balance = await signer.getBalance();
  // 将余额从 Wei 转换为 Ether（ETH）
  const balanceInEther = ethers.utils.formatEther(balance);
  console.log(`地址: ${address}的余额: ${balanceInEther} ETH`);

  const token0Contract = new ethers.Contract(token0.address, ERC20_ABI, signer);
  const token1Contract = new ethers.Contract(token0.address, ERC20_ABI, signer);

  const token0BalWei = await token0Contract.balanceOf(address);
  const token0BalNum = ethers.utils.formatUnits(token0BalWei, token0.decimals);
  const token1BalWei = await token1Contract.balanceOf(address);
  const token1BalNum = ethers.utils.formatUnits(token1BalWei, token0.decimals);

  console.log(`token0 ${token0.symbol}的余额为：${token0BalNum}`);
  console.log(`token0 ${token1.symbol}的余额为：${token1BalNum}`);

  const amountIn = ethers.utils.parseUnits("1000", token0.decimals);
  const amountOut = await getQuote(uniswapRouter, token0, token1, amountIn);
  await getReserves(token0, token1);
}

//获取uniswap factory中指定池子的代币储量
async function getReserves(token0, token1) {
  // 获取 Uniswap V2 Factory 合约地址
  const factoryAddress = UNISWAP_ADDRESSES.FACTORY;

  // 创建 Factory 合约实例
  const factoryContract = new ethers.Contract(
    factoryAddress,
    UNISWAP_FACTORY_ABI,
    ethers.provider
  );

  // 获取流动性池地址
  const pairAddress = await factoryContract.getPair(
    token0.address,
    token1.address
  );

  // 创建流动性池合约实例
  const pairContract = new ethers.Contract(
    pairAddress,
    UNISWAP_POOL_ABI,
    ethers.provider
  );

  // 获取储备量
  const [reserve0, reserve1] = await pairContract.getReserves();

  // 格式化储备量
  const reserve0Formatted = ethers.utils.formatUnits(reserve0, token0.decimals);
  const reserve1Formatted = ethers.utils.formatUnits(reserve1, token1.decimals);

  console.log(
    `uniswapV2中 ${token0.symbol}的储备量为${reserve0Formatted} ${token1.symbol}的储备量为${reserve1Formatted}`
  );
  return { reserve0: reserve0Formatted, reserve1: reserve1Formatted };
}

async function getQuote(uniswapRouter, token0, token1, amountIn) {
  const path = [token0.address, token1.address];

  if (
    token0.address !== TOKENS.WETH.address &&
    token1.address !== TOKENS.WETH.address
  ) {
    // If neither token is WETH, route through WETH
    path.splice(1, 0, TOKENS.WETH.address);
  }

  const amounts = await uniswapRouter.getAmountsOut(amountIn, path);

  const inputAmountFormatted = ethers.utils.formatUnits(
    amountIn,
    token0.decimals
  );
  const outputAmountFormatted = ethers.utils.formatUnits(
    amounts[amounts.length - 1],
    token1.decimals
  );
  console.log(
    `${inputAmountFormatted}数量的${token0.symbol} 可以swap ${outputAmountFormatted}数量的${token1.symbol}`
  );
  return outputAmountFormatted;
}

main().catch(console.error);
