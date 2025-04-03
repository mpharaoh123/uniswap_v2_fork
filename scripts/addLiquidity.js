require("dotenv").config();
const { WETH } = require("@uniswap/sdk");
const {
  UNISWAP_ADDRESSES,
  UNISWAP_ROUTER_ABI,
  UNISWAP_FACTORY_ABI,
  UNISWAP_PAIR_ABI,
  ERC20_ABI,
  WETH_ABI,
  TOKENS,
} = require("./constants");

const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // WETH地址
const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // USDT地址

/*
  npx hardhat run --network localhost scripts/addLiquidity.js
*/

async function addLiquidity() {
  const [signer] = await ethers.getSigners();
  const provider = ethers.provider;
  const account = await signer.getAddress();

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
  const pairAddress = await factoryContract.getPair(WETH_ADDRESS, USDT_ADDRESS);
  if (pairAddress == ethers.constants.AddressZero) {
    tx = await uniswapFactory.createPair(WETH_ADDRESS, USDT_ADDRESS);
    await tx.wait();
  }
  console.log("pairAddress", pairAddress);

  const wethContract = new ethers.Contract(WETH_ADDRESS, WETH_ABI, signer);
  const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer);
  const gasPrice = await provider.getGasPrice();

  // 铸造 WETH 和 USDT 代币
  const wethAmount = ethers.utils.parseEther("10");
  const usdtAmount = ethers.utils.parseUnits("1000", 6);
  tx = await wethContract.deposit({
    value: wethAmount,
    gasLimit: 100000,
    gasPrice: gasPrice,
  });
  await tx.wait(1);
  const wethBalance = await wethContract.balanceOf(account);
  console.log("weth balance: ", wethBalance.toString());

  const usdtBalance = await usdtContract.balanceOf(account);
  console.log("usdt balance: ", usdtBalance.toString());

  if (usdtBalance.lt(usdtAmount)) {
    console.error(`Insufficient usdt balance.`);
    return;
  }

  tx = await wethContract.approve(
    UNISWAP_ADDRESSES.V2_ROUTER,
    ethers.constants.MaxUint256
  );
  await tx.wait(1);

  console.log(111);
  const allowance = await usdtContract.allowance(
    account,
    UNISWAP_ADDRESSES.V2_ROUTER
  );
  console.log("allowance", allowance.toString());

  //todo 只能approve一次
  // tx = await usdtContract.approve(
  //   UNISWAP_ADDRESSES.V2_ROUTER,
  //   ethers.constants.MaxUint256,
  // );
  // await tx.wait(1);
  console.log(222);
  const deadline = Math.floor(Date.now() / 1000) + 10 * 60; // 当前时间加10

  tx = await routerContract.addLiquidity(
    WETH_ADDRESS,
    USDT_ADDRESS,
    wethAmount,
    usdtAmount,
    0,
    0,
    account,
    deadline,
    {
      gasLimit: 2000000,
    }
  );
  await tx.wait(1);
  console.log("添加流动性交易已发送：", tx.hash);

  const lpTokenContract = new ethers.Contract(pairAddress, ERC20_ABI, signer);

  // 查询目标账户持有的 LP 代币余额
  const lpBalance = await lpTokenContract.balanceOf(account);
  console.log(
    `Account ${account} has ${ethers.utils.formatUnits(
      lpBalance,
      18
    )} LP tokens in the WETH-USDT pool`
  );
}

addLiquidity().catch((error) => {
  console.error("添加流动性失败：", error);
});
