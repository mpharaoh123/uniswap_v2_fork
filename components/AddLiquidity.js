// addLiquidity.js
require("dotenv").config();
import { ethers } from "ethers";
import {
  UNISWAP_ADDRESSES,
  UNISWAP_ROUTER_ABI,
  UNISWAP_FACTORY_ABI,
  UNISWAP_PAIR_ABI,
  ERC20_ABI,
  WETH_ABI,
  TOKENS,
  storageAbi,
} from "../constants/addresses";

export default async function AddLiquidity({
  signer,
  token0Addr,
  token1Addr,
  token0Amount,
  token1Amount,
}) {
  const provider = signer.provider;
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
  const pairAddress = await factoryContract.getPair(token0Addr, token1Addr);
  if (pairAddress == ethers.constants.AddressZero) {
    tx = await factoryContract.createPair(token0Addr, token1Addr);
    await tx.wait();
  }
  console.log("pairAddress", pairAddress);

  const token0Contract = new ethers.Contract(token0Addr, ERC20_ABI, signer);
  const token1Contract = new ethers.Contract(token1Addr, ERC20_ABI, signer);

  const token0Balance = await token0Contract.balanceOf(account);
  console.log(`${token0.symbol} balance: ${token0Balance.toString()}`);

  const token1Balance = await token1Contract.balanceOf(account);
  console.log(`${token1.symbol} balance: ${token1Balance.toString()}`);

  const token0AmountParsed = ethers.utils.parseUnits(
    token0Amount,
    await token0Contract.decimals()
  );
  const token1AmountParsed = ethers.utils.parseUnits(
    token1Amount,
    await token1Contract.decimals()
  );

  if (token0Balance.lt(token0AmountParsed)) {
    console.error(`Insufficient ${token0.symbol} balance.`);
    return;
  }

  if (token1Balance.lt(token1AmountParsed)) {
    console.error(`Insufficient ${token1.symbol} balance.`);
    return;
  }

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

  const deadline = Math.floor(Date.now() / 1000) + 10 * 60;

  const lpTokenContract = new ethers.Contract(
    pairAddress,
    UNISWAP_PAIR_ABI,
    signer
  );
  const lpBalanceBefore = await lpTokenContract.balanceOf(account);

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
    }
  );
  await tx.wait();

  const lpBalanceAfter = await lpTokenContract.balanceOf(account);
  const liquidityAdded = lpBalanceAfter.sub(lpBalanceBefore);
  console.log(
    `Liquidity added: ${ethers.utils.formatUnits(
      liquidityAdded,
      await lpTokenContract.decimals()
    )}`
  );

  const storageContract = new ethers.Contract(
    process.env.UserStorageData,
    storageAbi.abi,
    signer
  );
  tx = await storageContract.addBlockchain(pairAddress, liquidityAdded);
  await tx.wait();

  const transactions = await storageContract.getTransactions(
    account,
    pairAddress
  );
  console.log(
    `${account} ${pairAddress} liquidity records are ${transactions}`
  );
}
