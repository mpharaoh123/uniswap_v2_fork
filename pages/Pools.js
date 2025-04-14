import { ethers } from "ethers";
import Link from "next/link";
import { useEffect, useState } from "react";
import TokenModal from "../components/TokenModal";
import {
  ERC20_ABI,
  STORAGE_ABI,
  TOKENS,
  UNISWAP_ADDRESSES,
  UNISWAP_FACTORY_ABI,
  UNISWAP_PAIR_ABI,
  UNISWAP_ROUTER_ABI,
  WETH_ABI,
} from "../constants/addresses";
import { useWeb3 } from "../context/Web3Context";

const STORAGE_ADDRESS = process.env.NEXT_PUBLIC_STORAGE_ADDRESS;

export default function Pool() {
  const { provider, account, uniswapRouter, connectWallet, signer, network } =
    useWeb3();
  const [selectedTokenIn, setSelectedTokenIn] = useState(TOKENS.WETH); // 默认Token0
  const [selectedTokenOut, setSelectedTokenOut] = useState(TOKENS.USDT); // 默认Token1
  const [liquidityMap, setLiquidityMap] = useState(new Map()); // 该账户的所有交易对和流动性
  const [liquidityBalance, setLiquidityBalance] = useState("0"); // 当前交易对的流动性余额
  const [amountToken0, setAmountToken0] = useState(""); // 希望加入的Token0数量
  const [amountToken1, setAmountToken1] = useState(""); // 希望加入的Token1数量
  const [isMenuOpen, setIsMenuOpen] = useState(false); // 控制导航菜单的显示状态
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false); // 控制代币选择模态框的显示状态
  const [modalType, setModalType] = useState(""); // 当前模态框类型（"in" 或 "out"）
  const [isLoading, setIsLoading] = useState(false); // 添加流动性的加载状态
  const [error, setError] = useState(null); // 错误信息

  // 获取account全部流动性
  const fetchLiquidityBalance = async () => {
    try {
      const storageContract = new ethers.Contract(
        STORAGE_ADDRESS,
        STORAGE_ABI,
        signer
      );
      const transactions = await storageContract.getTransactions(account);

      if (transactions.length === 0) {
        console.log("No transactions found for this account.");
        setLiquidityMap(new Map());
        return;
      }

      const liquidityMap = new Map();
      for (const transaction of transactions) {
        const pairAddress = transaction.pairAddress.toLowerCase();
        const liquidityAmount = transaction.liquidityAmount;
        const pairContract = new ethers.Contract(
          pairAddress,
          UNISWAP_PAIR_ABI,
          signer
        );

        const token0Address = await pairContract.token0();
        const token1Address = await pairContract.token1();

        const token0Contract = new ethers.Contract(
          token0Address,
          ERC20_ABI,
          signer
        );
        const token1Contract = new ethers.Contract(
          token1Address,
          ERC20_ABI,
          signer
        );

        const token0Symbol = await token0Contract.symbol();
        const token1Symbol = await token1Contract.symbol();

        const pairInfo = {
          token0: { address: token0Address, symbol: token0Symbol },
          token1: { address: token1Address, symbol: token1Symbol },
          pairAddress,
          liquidityAmount,
        };

        if (liquidityMap.has(pairAddress)) {
          const existingPairInfo = liquidityMap.get(pairAddress);
          existingPairInfo.liquidityAmount =
            existingPairInfo.liquidityAmount.add(liquidityAmount);
          liquidityMap.set(pairAddress, existingPairInfo);
        } else {
          liquidityMap.set(pairAddress, pairInfo);
        }
      }

      setLiquidityMap(new Map(liquidityMap));
      console.log("Liquidity Map:", Array.from(liquidityMap.entries()));
    } catch (error) {
      if (
        error.code === "INVALID_ARGUMENT" ||
        error.code === "CALL_EXCEPTION"
      ) {
        console.error(
          "UserStorageData address is incorrect, please deploy UserStorageData contract first."
        );
      } else {
        console.error("Failed to fetch liquidity balance:", error);
      }
    }
  };

  // 获取account当前pair流动性
  const fetchPairLiquidity = async () => {
    if (!selectedTokenIn || !selectedTokenOut || !account) return;
    try {
      const factoryContract = new ethers.Contract(
        UNISWAP_ADDRESSES.FACTORY,
        UNISWAP_FACTORY_ABI,
        signer
      );
      const pairAddress = await factoryContract.getPair(
        selectedTokenIn.address,
        selectedTokenOut.address
      );

      const pairLiquiditySum = liquidityMap.get(pairAddress.toLowerCase());
      setLiquidityBalance(pairLiquiditySum ? pairLiquiditySum.toString() : "0");

      console.log(
        `Liquidity for pair ${pairAddress}: ${
          pairLiquiditySum ? pairLiquiditySum.toString() : "0"
        } Wei`
      );
    } catch (error) {
      console.error("Failed to get pair address:", error);
    }
  };

  const handleAddLiquidityClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const account = await signer.getAddress();

      const factoryContract = new ethers.Contract(
        UNISWAP_ADDRESSES.FACTORY,
        UNISWAP_FACTORY_ABI,
        signer
      );

      const pairAddress = await factoryContract.getPair(
        selectedTokenIn.address,
        selectedTokenOut.address
      );
      if (pairAddress === ethers.constants.AddressZero) {
        const tx = await factoryContract.createPair(
          selectedTokenIn.address,
          selectedTokenOut.address
        );
        await tx.wait();
      }
      console.log("pairAddress", pairAddress);

      const token0Contract = new ethers.Contract(
        selectedTokenIn.address,
        selectedTokenIn.symbol === "WETH" ? WETH_ABI : ERC20_ABI,
        signer
      );
      const token1Contract = new ethers.Contract(
        selectedTokenOut.address,
        selectedTokenOut.symbol === "WETH" ? WETH_ABI : ERC20_ABI,
        signer
      );

      const gasPrice = await signer.provider.getGasPrice();

      if (selectedTokenIn.symbol === "WETH") {
        const wethBalance = await token0Contract.balanceOf(account);
        const token0AmountParsed = ethers.utils.parseEther(amountToken0);
        if (wethBalance.lt(token0AmountParsed)) {
          const tx = await token0Contract.deposit({
            value: token0AmountParsed,
            gasLimit: 100000,
            gasPrice: gasPrice,
          });
          await tx.wait();
        }
      }

      if (selectedTokenOut.symbol === "WETH") {
        const wethBalance = await token1Contract.balanceOf(account);
        const token1AmountParsed = ethers.utils.parseEther(amountToken1);
        if (wethBalance.lt(token1AmountParsed)) {
          const tx = await token1Contract.deposit({
            value: token1AmountParsed,
            gasLimit: 100000,
            gasPrice: gasPrice,
          });
          await tx.wait();
        }
      }

      const token0AmountParsed =
        selectedTokenIn.symbol === "WETH"
          ? ethers.utils.parseEther(amountToken0)
          : ethers.utils.parseUnits(amountToken0, selectedTokenIn.decimals);

      const token1AmountParsed =
        selectedTokenOut.symbol === "WETH"
          ? ethers.utils.parseEther(amountToken1)
          : ethers.utils.parseUnits(amountToken1, selectedTokenOut.decimals);

      const token0Balance = await token0Contract.balanceOf(account);
      console.log(
        `${selectedTokenIn.symbol} balance: ${token0Balance.toString()}`
      );

      const token1Balance = await token1Contract.balanceOf(account);
      console.log(
        `${selectedTokenOut.symbol} balance: ${token1Balance.toString()}`
      );

      if (token0Balance.lt(token0AmountParsed)) {
        throw new Error(`Insufficient ${selectedTokenIn.symbol} balance.`);
      }

      if (token1Balance.lt(token1AmountParsed)) {
        throw new Error(`Insufficient ${selectedTokenOut.symbol} balance.`);
      }

      if (selectedTokenIn.symbol !== "WETH") {
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

      if (selectedTokenOut.symbol !== "WETH") {
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
      const deadline = Math.floor(Date.now() / 1000) + 10 * 60;

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

      const routerContract = new ethers.Contract(
        UNISWAP_ADDRESSES.V2_ROUTER,
        UNISWAP_ROUTER_ABI,
        signer
      );

      const gasLimit = await routerContract.estimateGas.addLiquidity(
        selectedTokenIn.address,
        selectedTokenOut.address,
        token0AmountParsed,
        token1AmountParsed,
        0,
        0,
        account,
        deadline
      );

      const tx = await routerContract.addLiquidity(
        selectedTokenIn.address,
        selectedTokenOut.address,
        token0AmountParsed,
        token1AmountParsed,
        0,
        0,
        account,
        deadline,
        {
          gasLimit: gasLimit.mul(120).div(100), // Add 20% buffer to the estimated gas
          gasPrice: gasPrice,
        }
      );
      await tx.wait();

      const lpBalanceAfter = await lpTokenContract.balanceOf(account);
      console.log(
        "LP balance after adding liquidity:",
        lpBalanceAfter.toString()
      );

      const liquidityAdded = lpBalanceAfter.sub(lpBalanceBefore);
      console.log(
        `Liquidity added: ${ethers.utils.formatUnits(
          liquidityAdded,
          await lpTokenContract.decimals()
        )}`
      );

      const storageContract = new ethers.Contract(
        STORAGE_ADDRESS,
        STORAGE_ABI,
        signer
      );
      const txStorage = await storageContract.addBlockchain(
        pairAddress,
        liquidityAdded
      );
      await txStorage.wait();
      setIsLoading(false);

      await fetchLiquidityBalance();
      await fetchPairLiquidity();
    } catch (error) {
      setIsLoading(false);
      setError(error.message);
    }
  };

  // 初始化时加载流动性信息
  useEffect(() => {
    if (account) {
      fetchLiquidityBalance();
    }
  }, [account]);

  useEffect(() => {
    if (account) {
      fetchPairLiquidity();
    }
  }, [selectedTokenIn, selectedTokenOut, account, liquidityMap]);

  const handleTokenSelect = (token) => {
    if (modalType === "in") {
      if (token.address === selectedTokenOut.address) {
        setSelectedTokenOut(selectedTokenIn);
      }
      setSelectedTokenIn(token);
    } else {
      if (token.address === selectedTokenIn.address) {
        setSelectedTokenIn(selectedTokenOut);
      }
      setSelectedTokenOut(token);
    }
    setIsTokenModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#191B1F] text-white">
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-6">
          <div className="flex items-center">
            <img src="/swap.jpg" alt="Uniswap Logo" className="h-8 w-8" />
            <span className="ml-2 text-xl font-medium">Uniswap</span>
          </div>
          <div className="flex space-x-6 text-gray-400 hidden md:flex">
            <Link href={{ pathname: "/" }}>
              <p className="hover:text-white">Trade</p>
            </Link>
            <Link href={{ pathname: "/Explore" }}>
              <p className="block hover:text-white mb-4">Explore</p>
            </Link>
            <Link href={{ pathname: "/Pools" }}>
              <p className="hover:text-white">Pools</p>
            </Link>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            className="px-4 py-2 rounded-full bg-[#191B1F] border border-gray-600 hover:border-gray-400 md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 10h.01M15 10h.01M9 14h6"
              />
            </svg>
          </button>
          {!account ? (
            <button
              onClick={connectWallet}
              className="px-4 py-2 bg-[#8A2BE2] rounded-full hover:bg-opacity-90 transition-colors"
            >
              Connect
            </button>
          ) : (
            <button className="px-4 py-2 bg-[#212429] rounded-full">
              {account.slice(0, 6)}...{account.slice(-4)}
            </button>
          )}
        </div>
      </nav>
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="bg-[#191B1F] p-4 md:hidden">
          <Link href={{ pathname: "/" }}>
            <p className="block hover:text-white mb-4">Trade</p>
          </Link>
          <Link href={{ pathname: "/Explore" }}>
            <p className="block hover:text-white mb-4">Explore</p>
          </Link>
          <Link href={{ pathname: "/Pools" }}>
            <p className="block hover:text-white mb-4">Pools</p>
          </Link>
        </div>
      )}
      {/* Main Content */}
      <main className="max-w-[480px] mx-auto mt-20">
        <div className="bg-[#212429] rounded-2xl p-4 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Your Pool Positions</h2>
          <div className="bg-[#2F3136] rounded-2xl p-4">
            {Array.from(liquidityMap.entries()).length === 0 ? (
              <p className="text-gray-400">No positions found.</p>
            ) : (
              <ul className="space-y-4">
                {Array.from(liquidityMap.entries()).map(
                  ([pairAddress, pairInfo], index) => (
                    <li
                      key={index}
                      className="flex justify-between items-center mb-2"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400 text-sm font-medium">
                          {pairInfo.token0.symbol} / {pairInfo.token1.symbol}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-400">
                        Liquidity:{" "}
                        <span className="text-sm font-medium text-gray-400">
                          {parseFloat(
                            ethers.utils.formatUnits(
                              pairInfo.liquidityAmount,
                              18
                            )
                          ).toFixed(6)}
                        </span>
                      </div>
                    </li>
                  )
                )}
              </ul>
            )}
          </div>
          <div className="flex justify-between mt-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setModalType("in");
                  setIsTokenModalOpen(true);
                }}
                className="flex items-center space-x-2 bg-[#191B1F] px-3 py-1 rounded-full hover:bg-opacity-80"
              >
                <img
                  src={`/tokens/${selectedTokenIn.symbol.toLowerCase()}.webp`}
                  alt={selectedTokenIn.symbol}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-white">{selectedTokenIn.symbol}</span>
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setModalType("out");
                  setIsTokenModalOpen(true);
                }}
                className="flex items-center space-x-2 bg-[#191B1F] px-3 py-1 rounded-full hover:bg-opacity-80"
              >
                <img
                  src={`/tokens/${selectedTokenOut.symbol.toLowerCase()}.svg`}
                  alt={selectedTokenOut.symbol}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-white">{selectedTokenOut.symbol}</span>
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <label
                  className="block text-sm font-medium text-gray-300 mb-1"
                  htmlFor="amountToken0"
                >
                  Amount of {selectedTokenIn.symbol}:
                </label>
                <input
                  type="text"
                  id="amountToken0"
                  value={amountToken0}
                  onChange={(e) => setAmountToken0(e.target.value)}
                  className="w-full mt-1 p-2 border border-gray-600 rounded-lg bg-[#191B1F] text-white"
                />
              </div>
              <div className="flex-1">
                <label
                  className="block text-sm font-medium text-gray-300 mb-1"
                  htmlFor="amountToken1"
                >
                  Amount of {selectedTokenOut.symbol}:
                </label>
                <input
                  type="text"
                  id="amountToken1"
                  value={amountToken1}
                  onChange={(e) => setAmountToken1(e.target.value)}
                  className="w-full mt-1 p-2 border border-gray-600 rounded-lg bg-[#191B1F] text-white"
                />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleAddLiquidityClick}
              disabled={!account || isLoading || !amountToken0 || !amountToken1}
              className={`w-full py-4 rounded-2xl text-lg font-medium ${
                !account || isLoading || !amountToken0 || !amountToken1
                  ? "bg-[#8A2BE2] opacity-60 cursor-not-allowed"
                  : "bg-[#8A2BE2] hover:bg-opacity-90"
              } text-white`}
            >
              {isLoading ? "Adding Liquidity..." : "Add Liquidity"}
            </button>
          </div>
        </div>
      </main>
      {/* Token Selection Modal */}
      {isTokenModalOpen && (
        <TokenModal
          isOpen={isTokenModalOpen}
          onClose={() => setIsTokenModalOpen(false)}
          onSelect={handleTokenSelect}
          excludeToken={modalType === "in" ? selectedTokenOut : selectedTokenIn}
        />
      )}
    </div>
  );
}
