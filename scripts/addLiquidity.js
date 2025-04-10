require("dotenv").config();
const {
  UNISWAP_ADDRESSES,
  UNISWAP_ROUTER_ABI,
  UNISWAP_FACTORY_ABI,
  UNISWAP_PAIR_ABI,
  ERC20_ABI,
  WETH_ABI,
  TOKENS,
} = require("./constants");
const storageAddress = process.env.NEXT_PUBLIC_STORAGE_ADDRESS;
const storageAbi =
  require("../artifacts/contracts/UserStorageData.sol/UserStorageData.json").abi;

/*
  npx hardhat run --network localhost scripts/addLiquidity.js
*/

async function addLiquidity() {
  const [signer] = await ethers.getSigners();
  const provider = ethers.provider;
  const account = await signer.getAddress();

  const token0 = TOKENS["UNI"];
  const token1 = TOKENS["WETH"];

  const token0Addr = token0.address;
  const token1Addr = token1.address;

  const routerContract = new ethers.Contract(
    UNISWAP_ADDRESSES.V2_ROUTER,
    UNISWAP_ROUTER_ABI,
    signer
  );

  const factoryContract = new ethers.Contract(
    UNISWAP_ADDRESSES.FACTORY,
    UNISWAP_FACTORY_ABI,
    signer
  );

  let tx;
  const pairAddress = await factoryContract.getPair(token0Addr, token1Addr);
  if (pairAddress == ethers.constants.AddressZero) {
    //createPair 函数会自动对 token0Addr 和 token1Addr 进行排序
    tx = await uniswapFactory.createPair(token0Addr, token1Addr);
    await tx.wait();
  }
  console.log("pairAddress", pairAddress);

  // const token0Contract = new ethers.Contract(token0Addr, WETH_ABI, signer);
  // const token1Contract = new ethers.Contract(token1Addr, ERC20_ABI, signer);

  const token0Contract = new ethers.Contract(
    token0Addr,
    token0.symbol === "WETH" ? WETH_ABI : ERC20_ABI,
    signer
  );
  const token1Contract = new ethers.Contract(
    token1Addr,
    token1.symbol === "WETH" ? WETH_ABI : ERC20_ABI,
    signer
  );

  const token0Balance = await token0Contract.balanceOf(account);
  console.log(`${token0.symbol} balance: ${token0Balance.toString()}`);

  const token1Balance = await token1Contract.balanceOf(account);
  console.log(`${token1.symbol} balance: ${token1Balance.toString()}`);

  // 铸造 WETH 和 USDT 代币
  const token0Amount = token0.symbol === "WETH" ? "10" : "100";
  const token1Amount = token1.symbol === "WETH" ? "10" : "100";

  const gasPrice = await provider.getGasPrice();
  // Handle WETH deposit if token0 is WETH
  if (token0.symbol === "WETH") {
    tx = await token0Contract.deposit({
      value: ethers.utils.parseEther(token0Amount),
      gasLimit: 100000,
      gasPrice: gasPrice,
    });
    await tx.wait();
  }

  // Handle WETH deposit if token1 is WETH
  if (token1.symbol === "WETH") {
    tx = await token1Contract.deposit({
      value: ethers.utils.parseEther(token1Amount),
      gasLimit: 100000,
      gasPrice: gasPrice,
    });
    await tx.wait();
  }

  // Parse amounts
  const token0AmountParsed =
    token0.symbol === "WETH"
      ? ethers.utils.parseEther(token0Amount)
      : ethers.utils.parseUnits(token0Amount, token0.decimals);
  const token1AmountParsed =
    token1.symbol === "WETH"
      ? ethers.utils.parseEther(token1Amount)
      : ethers.utils.parseUnits(token1Amount, token1.decimals);

  // 检查余额是否足够
  if (token0Balance.lt(token0AmountParsed)) {
    console.error(`Insufficient ${token0.symbol} balance.`);
    return;
  }

  if (token1Balance.lt(token1AmountParsed)) {
    console.error(`Insufficient ${token1.symbol} balance.`);
    return;
  }

  // Check and approve token0 if necessary
  if (token0.symbol !== "WETH") {
    const allowance0 = await token0Contract.allowance(
      account,
      UNISWAP_ADDRESSES.V2_ROUTER
    );
    if (allowance0.lt(token0AmountParsed)) {
      const tx = await token0Contract.approve(
        UNISWAP_ADDRESSES.V2_ROUTER,
        ethers.constants.MaxUint256
      );
      await tx.wait();
    }
  }

  // Check and approve token1 if necessary
  if (token1.symbol !== "WETH") {
    const allowance1 = await token1Contract.allowance(
      account,
      UNISWAP_ADDRESSES.V2_ROUTER
    );
    if (allowance1.lt(token1AmountParsed)) {
      const tx = await token1Contract.approve(
        UNISWAP_ADDRESSES.V2_ROUTER,
        ethers.constants.MaxUint256
      );
      await tx.wait();
    }
  }

  const deadline = Math.floor(Date.now() / 1000) + 10 * 60; // 当前时间加10

  const lpTokenContract = new ethers.Contract(
    pairAddress,
    UNISWAP_PAIR_ABI,
    signer
  );
  const lpBalanceBefore = await lpTokenContract.balanceOf(account);
  console.log(
    "LP balance before adding liquidity:",
    lpBalanceBefore.toString()
  );

  tx = await routerContract.addLiquidity(
    token0Addr,
    token1Addr,
    token0AmountParsed,
    token1AmountParsed,
    0,
    0,
    account,
    deadline,
    {
      gasLimit: 2000000,
      gasPrice: gasPrice,
    }
  );
  await tx.wait();
  // console.log("添加流动性交易已发送：", tx.hash);

  // 查询添加流动性之后的LP Tokens余额
  const lpBalanceAfter = await lpTokenContract.balanceOf(account);
  console.log("LP balance after adding liquidity:", lpBalanceAfter.toString());

  // 计算本次添加的流动性数量
  const liquidityAdded = lpBalanceAfter.sub(lpBalanceBefore);
  console.log(
    `Liquidity added: ${ethers.utils.formatUnits(
      liquidityAdded,
      await lpTokenContract.decimals()
    )}`
  );

  // 记录用户添加的流动性
  const storageContract = new ethers.Contract(
    storageAddress,
    storageAbi,
    signer
  );

  tx = await storageContract.addBlockchain(pairAddress, liquidityAdded);
  await tx.wait();

  const transactions = await storageContract.getTransactions(account);
  console.log(`account: ${account}`);
  transactions.forEach((transaction, index) => {
    console.log(`Transaction ${index + 1}:`);
    console.log(`  pairAddress: ${transaction.pairAddress}`);
    console.log(`  liquidityAmount: ${transaction.liquidityAmount}`);
  });
}

addLiquidity().catch((error) => {
  console.error("添加流动性失败：", error);
});
