const {
  UNISWAP_ADDRESSES,
  UNISWAP_ROUTER_ABI,
  UNISWAP_FACTORY_ABI,
  UNISWAP_PAIR_ABI,
  ERC20_ABI,
  WETH_ABI,
  TOKENS,
} = require("./constants");

const COMMISSION_ADDRESS_ADMIN = process.env.COMMISSION_ADDRESS;
const COMMISSION_RATE_PRICE = process.env.COMMISSION_RATE;

/*
  npx hardhat run --network localhost scripts/swapToken.js
 */
async function main() {

  const [signer] = await ethers.getSigners();
  const provider = ethers.provider;
  const account = await signer.getAddress();

  // 获取余额（单位为 Wei）
  const balance = await signer.getBalance();
  // 将余额从 Wei 转换为 Ether（ETH）
  const balanceInEther = ethers.utils.formatEther(balance);
  console.log(`Wallet: ${account}`);
  console.log(`ETH balance: ${balanceInEther}`);

  const wethContract = new ethers.Contract(
    TOKENS.WETH.address,
    WETH_ABI,
    signer
  );

  const wethBalance = await wethContract.balanceOf(account);
  const wethBalanceNum = ethers.utils.formatUnits(
    wethBalance,
    TOKENS.WETH.decimals
  );
  console.log(`WETH balance: ${wethBalanceNum}`);

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
  let [firstTokenName, secondTokenName] = tokensNames.slice(0, 2);

  let amount = "10"; // amountIn数量
  [firstTokenName, secondTokenName] = ["USDT", secondTokenName];
  // 获取对应的代币对象
  const token0 = TOKENS[firstTokenName];
  const token1 = TOKENS[secondTokenName];

  console.log("Random Token 0:", token0.symbol);
  console.log("Random Token 1:", token1.symbol);
  await getReserves(token0, token1);

  const token0Contract = new ethers.Contract(token0.address, ERC20_ABI, signer);
  const token1Contract = new ethers.Contract(token1.address, ERC20_ABI, signer);

  let token0BalNum = ethers.utils.formatUnits(
    await token0Contract.balanceOf(account),
    token0.decimals
  );
  let token1BalNum = ethers.utils.formatUnits(
    await token1Contract.balanceOf(account),
    token1.decimals
  );

  console.log(`Before swap, token0 ${token0.symbol} balance: ${token0BalNum}`);
  console.log(`Before swap, token1 ${token1.symbol} balance: ${token1BalNum}`);

  let amountIn = ethers.utils.parseUnits(amount, token0.decimals);
  const COMMISSION_AMOUNT = ethers.utils.parseEther(
    COMMISSION_RATE_PRICE.toString()
  );
  const totalNeeded = amountIn.add(COMMISSION_AMOUNT);
  const gasPrice = await provider.getGasPrice();
  const uniswapRouter = new ethers.Contract(
    UNISWAP_ADDRESSES.V2_ROUTER,
    UNISWAP_ROUTER_ABI,
    signer
  );
  if (token0.symbol == "WETH") {
    const depositAmount = totalNeeded.sub(wethBalance);
    if (balance.lt(depositAmount)) {
      console.error("Insufficient ETH balance to complete the deposit.");
      return;
    }

    if (wethBalance.lt(totalNeeded)) {
      const tx = await wethContract.deposit({
        value: depositAmount,
        gasLimit: 100000,
        gasPrice: gasPrice,
      });
      await tx.wait(1);
    }
    const commissionTx = await wethContract.transfer(
      COMMISSION_ADDRESS_ADMIN,
      COMMISSION_AMOUNT
    );
    await commissionTx.wait(1);

    const allowance = await wethContract.allowance(
      account,
      uniswapRouter.address
    );
    if (allowance.lt(amountIn)) {
      const approveTx = await wethContract.approve(
        uniswapRouter.address,
        ethers.constants.MaxInt256
      );
      await approveTx.wait(1);
    }
  } else {
    // 如果 token0 不是 WETH，确保用户有足够的 token0 余额
    const token0Balance = await token0Contract.balanceOf(account);
    if (token0Balance.lt(amountIn)) {
      console.error(`Insufficient ${token0.symbol} balance.`);
      return;
    }
    // 检查用户是否已经授权足够的代币给 Uniswap 路由器
    const allowance = await token0Contract.allowance(
      account,
      uniswapRouter.address
    );
    if (allowance.lt(amountIn)) {
      const approveTx = await token0Contract.approve(
        uniswapRouter.address,
        ethers.constants.MaxInt256
      );
      await approveTx.wait(1);
    }
  }

  const [path, amountOut] = await getQuote(
    uniswapRouter,
    token0,
    token1,
    amountIn
  );

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const minOutput = amountOut.mul(995).div(1000);

  const swapTx = await uniswapRouter.swapExactTokensForTokens(
    amountIn,
    minOutput,
    path,
    account,
    deadline,
    {
      gasLimit: 300000,
      gasPrice: gasPrice,
      nonce: await provider.getTransactionCount(account),
    }
  );

  await swapTx.wait(1);

  token0BalNum = ethers.utils.formatUnits(
    await token0Contract.balanceOf(account),
    token0.decimals
  );
  token1BalNum = ethers.utils.formatUnits(
    await token1Contract.balanceOf(account),
    token1.decimals
  );

  console.log(`After swap, token0 ${token0.symbol} balance: ${token0BalNum}`);
  console.log(`After swap, token1 ${token1.symbol} balance: ${token1BalNum}`);
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
    UNISWAP_PAIR_ABI,
    ethers.provider
  );

  // 获取储备量
  const [reserve0, reserve1] = await pairContract.getReserves();

  // 格式化储备量
  const reserve0Formatted = Math.floor(
    ethers.utils.formatUnits(reserve0, token0.decimals)
  );
  const reserve1Formatted = Math.floor(
    ethers.utils.formatUnits(reserve1, token1.decimals)
  );

  console.log(
    `${token0.symbol}-${token1.symbol} pool: ${reserve0Formatted} ${token0.symbol} and ${reserve1Formatted} ${token1.symbol}.`
  );
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
    // amounts[1],
    token1.decimals
  );
  console.log(
    `uniswapV2Router中: ${inputAmountFormatted} ${token0.symbol} = ${outputAmountFormatted} ${token1.symbol}`
  );
  return [path, amounts[amounts.length - 1]];
}

main().catch(console.error);
