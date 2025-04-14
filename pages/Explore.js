import { ethers } from "ethers";
import Link from "next/link";
import { useEffect, useState } from "react";
import poolDataList from "../constants/poolData.json";
import { useWeb3 } from "../context/Web3Context";

const poolData = poolDataList.tokens;

export default function Home() {
  const { provider, account, uniswapRouter, connectWallet, network } =
    useWeb3();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tokenPrices, setTokenPrices] = useState({});
  const [loading, setLoading] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const getQuote = async (token) => {
    if (!uniswapRouter) return;

    try {
      setLoading(true);
      const amountIn = "1"; // Assuming we want to get the price for 1 unit of the token
      const usdt = poolData[2].id; // USDT
      const amountInWei = ethers.utils.parseUnits(amountIn, token.decimals);

      let path = [token.id, usdt];

      if (token.id !== poolData[0].id) {
        path.splice(1, 0, poolData[0].id);
      }

      const amounts = await uniswapRouter.getAmountsOut(amountInWei, path);
      const price = ethers.utils.formatUnits(
        amounts[amounts.length - 1],
        poolData[2].decimals // 使用 USDT 的小数位数
      );
      return price;
    } catch (error) {
      console.error("Error getting quote:", error);
      return "0";
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchTokenPrices = async () => {
      const prices = {};
      for (const token of poolData) {
        prices[token.symbol] = await getQuote(token);
      }
      setTokenPrices(prices);
    };

    if (uniswapRouter) {
      fetchTokenPrices();
    }
  }, [uniswapRouter]);

  return (
    <div className="min-h-screen bg-[#191B1F] text-white">
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-6">
          <div className="flex items-center">
            <img src="/swap.jpg" alt="Uniswap Logo" className="h-8 w-8" />
            <span className="ml-2 text-xl font-medium">Uniswap</span>
          </div>
          <div className="flex space-x-6 text-gray-400 md:flex hidden">
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
      <main className="Tokens flex justify-center items-center h-screen pt-0">
        <div className="Tokens_box w-3/4 bg-[#212429] p-4 rounded-lg mt-8">
          <div className="Tokens_box_table">
            <table className="min-w-full">
              <thead>
                <tr className="bg-[#2F3136]">
                  <th className="py-6 px-4 text-center text-xl font-bold text-white">
                    #
                  </th>
                  <th className="py-6 px-4 text-center text-xl font-bold text-white">
                    Symbol
                  </th>
                  <th className="py-6 px-4 text-center text-xl font-bold text-white">
                    Price
                  </th>
                  <th className="py-6 px-4 text-center text-xl font-bold text-white">
                    Total Value Locked (TVL)
                  </th>
                  <th className="py-6 px-4 text-center text-xl font-bold text-white">
                    Volume (USD)
                  </th>
                </tr>
              </thead>
              <tbody>
                {poolData.map((token, index) => (
                  <tr key={token.id} className="border-b border-[#3A3B3F]">
                    <td className="py-4 px-4 text-center text-sm text-white">
                      {index + 1}
                    </td>
                    <td className="py-4 px-4 text-center text-sm text-white">
                      {token.symbol}
                    </td>
                    <td className="py-4 px-4 text-center text-sm text-white">
                      {loading
                        ? "Loading..."
                        : "$" + Number(tokenPrices[token.symbol]).toFixed(2) ||
                          "N/A"}
                    </td>
                    <td className="py-4 px-2 text-center text-sm text-white">
                      ${parseInt(token.totalValueLockedUSD, 10)}
                    </td>
                    <td className="py-4 px-2 text-center text-sm text-white">
                      ${parseInt(token.volumeUSD, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
