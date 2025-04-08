import { useState, useEffect } from "react";
import { useWeb3 } from "../context/Web3Context";
import { TOKENS } from "../constants/addresses";
import Link from "next/link";
import AddLiquidity from "../components/AddLiquidity";
import TokenModal from "../components/TokenModal";

export default function Pool() {
  const { provider, account, uniswapRouter, connectWallet, signer, network } =
    useWeb3();
  const [positions, setPositions] = useState([]);
  const [selectedTokenIn, setSelectedTokenIn] = useState(TOKENS.WETH); // 默认Token0
  const [selectedTokenOut, setSelectedTokenOut] = useState(TOKENS.USDT); // 默认Token1
  const [liquidityBalance, setLiquidityBalance] = useState("0"); // 当前交易对的流动性余额
  const [amountToken0, setAmountToken0] = useState(""); // 希望加入的Token0数量
  const [amountToken1, setAmountToken1] = useState(""); // 希望加入的Token1数量
  const [minAmountToken0, setMinAmountToken0] = useState(""); // Token0的最小值
  const [minAmountToken1, setMinAmountToken1] = useState(""); // Token1的最小值
  const [isMenuOpen, setIsMenuOpen] = useState(false); // 控制导航菜单的显示状态
  const [isAddLiquidityModalOpen, setIsAddLiquidityModalOpen] = useState(false); // 控制添加流动性模态框的显示状态
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false); // 控制代币选择模态框的显示状态
  const [modalType, setModalType] = useState(""); // 当前模态框类型（"in" 或 "out"）

  useEffect(() => {
    // 当选择的交易对发生变化时，更新流动性余额
    if (selectedTokenIn && selectedTokenOut && account) {
      fetchLiquidityBalance();
    }
  }, [selectedTokenIn, selectedTokenOut, account]);

  const fetchLiquidityBalance = async (userAddress, pairAddress) => {
    try {
      const storageContract = new ethers.Contract(
        process.env.UserStorageData,
        storageAbi.abi,
        signer
      );
      const transactions = await contract.getTransactions(
        userAddress,
        pairAddress
      );
      let totalLiquidity = transactions.reduce((sum, transaction) => {
        return sum + transaction.liquidityAmount;
      }, 0);

      totalLiquidity = ethers.utils.formatUnits(totalLiquidity, "ether");
      totalLiquidity = parseFloat(totalLiquidity).toFixed(2);
      setLiquidityBalance(totalLiquidity);
    } catch (error) {
      console.error("Failed to liquidity balance:", error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleAddLiquidityClick = () => {
    setIsAddLiquidityModalOpen(true);
  };

  const closeAddLiquidityModal = () => {
    setIsAddLiquidityModalOpen(false);
  };

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

  const openTokenModal = (type) => {
    setModalType(type);
    setIsTokenModalOpen(true);
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
            onClick={toggleMenu}
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
        <div className="bg-[#212429] rounded-3xl p-4 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Your Pool Positions</h2>
          {positions.length === 0 ? (
            <p>No positions found.</p>
          ) : (
            <ul>
              {positions.map((position, index) => (
                <li key={index}>{position}</li>
              ))}
            </ul>
          )}

          <div className="flex justify-between mt-2">
            <button
              onClick={() => {
                setModalType("in");
                setIsTokenModalOpen(true);
              }}
              className="flex items-center space-x-2 bg-[#191B1F] px-3 py-1 rounded-full hover:bg-opacity-80"
            >
              {/* todo webp文件和svg文件 */}
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

          <div className="mt-8">
            <p className="text-lg font-medium">Selected Pair:</p>
            <p>
              {selectedTokenIn.symbol} - {selectedTokenOut.symbol}
            </p>
            <p className="text-lg font-medium mt-2">Liquidity Balance:</p>
            <p>{liquidityBalance}</p>
          </div>
          <div className="mt-8">
            <div className="flex items-center">
              <label
                className="block text-sm font-medium text-gray-300"
                htmlFor="amountToken0"
              >
                Amount of {selectedTokenIn.symbol}:
              </label>
              <input
                type="text"
                id="amountToken0"
                value={amountToken0}
                onChange={(e) => setAmountToken0(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-600 rounded-lg bg-[#191B1F] text-white ml-2"
              />
              <label
                className="block text-sm font-medium text-gray-300 ml-2"
                htmlFor="minAmountToken0"
              >
                Min Amount of {selectedTokenIn.symbol}:
              </label>
              <input
                type="text"
                id="minAmountToken0"
                value={minAmountToken0}
                onChange={(e) => setMinAmountToken0(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-600 rounded-lg bg-[#191B1F] text-white ml-2"
              />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              <label
                className="block text-sm font-medium text-gray-300"
                htmlFor="amountToken1"
              >
                Amount of {selectedTokenOut.symbol}:
              </label>
              <input
                type="text"
                id="amountToken1"
                value={amountToken1}
                onChange={(e) => setAmountToken1(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-600 rounded-lg bg-[#191B1F] text-white ml-2"
              />
              <label
                className="block text-sm font-medium text-gray-300 ml-2"
                htmlFor="minAmountToken1"
              >
                Min Amount of {selectedTokenOut.symbol}:
              </label>
              <input
                type="text"
                id="minAmountToken1"
                value={minAmountToken1}
                onChange={(e) => setMinAmountToken1(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-600 rounded-lg bg-[#191B1F] text-white ml-2"
              />
            </div>
          </div>
          <div className="mt-8">
            <button
              className="w-full mt-4 py-4 rounded-2xl text-lg font-medium bg-[#8A2BE2] hover:bg-opacity-90 text-white"
              onClick={handleAddLiquidityClick}
            >
              Add Liquidity
            </button>
          </div>
        </div>
      </main>

      {/* Add Liquidity Modal */}
      {isAddLiquidityModalOpen && (
        <AddLiquidity
          signer={signer}
          token0Addr={selectedTokenIn.address}
          token1Addr={selectedTokenOut.address}
          token0Amount={amountToken0}
          token1Amount={amountToken1}
          onClose={closeAddLiquidityModal}
        />
      )}

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
