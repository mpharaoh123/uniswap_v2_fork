require("dotenv").config();
const { ethers } = require("ethers");
const { abi } = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");
const { UNISWAP_ADDRESSES } = require("../constants/addresses");
// import { ethers } from "ethers";
// import { abi } from "@uniswap/v2-periphery/build/UniswapV2Router02.json";
// import { UNISWAP_ADDRESSES, ERC20_ABI } from "../constants/addresses";

const provider = new ethers.providers.JsonRpcProvider(
  `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Uniswap V2 Router地址
const routerContract = new ethers.Contract(routerAddress, abi, wallet);
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];
const WETHAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // WETH地址
const USDTAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // USDT地址

const approveToken = async (tokenAddress, amount) => {
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
  const tx = await tokenContract.approve(routerAddress, amount);
  await tx.wait();
  console.log("代币批准成功：", tx.hash);
};

const addLiquidity = async () => {
  const amountWETHDesired = ethers.utils.parseUnits("1", 18); // 1 WETH
  const amountUSDTDesired = ethers.utils.parseUnits("1000", 6); // 1000 USDT

  const amountWETHMin = ethers.utils.parseUnits("0.5", 18); // 0.5 WETH
  const amountUSDTMin = ethers.utils.parseUnits("500", 6); // 500 USDT

  const to = await wallet.getAddress();
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

  await approveToken(WETHAddress, amountWETHDesired);
  await approveToken(USDTAddress, amountUSDTDesired);

  const tx = await routerContract.addLiquidity(
    WETHAddress,
    USDTAddress,
    amountWETHDesired,
    amountUSDTDesired,
    amountWETHMin,
    amountUSDTMin,
    to,
    deadline,
    {
      gasLimit: 2000000, // 手动设置较高的 gas limit
    }
  );
  console.log("添加流动性交易已发送：", tx.hash);
};

/*
  npx hardhat run --network localhost scripts/addLiquidity.js
 */

addLiquidity().catch((error) => {
  console.error("添加流动性失败：", error);
});
