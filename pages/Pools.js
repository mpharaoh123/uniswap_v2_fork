import { useState, useEffect } from "react";
import { useWeb3 } from "../context/Web3Context";
import { ethers } from "ethers";
import { ERC20_ABI } from "../constants/abis";
import { TOKENS } from "../constants/addresses";
import Link from "next/link";

export default function Pool() {
  const { provider, account, uniswapRouter, connectWallet, signer, network } =
    useWeb3();
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    // Fetch positions when account changes
    if (account) {
      fetchPositions();
    }
  }, [account]);

  const fetchPositions = async () => {
    try {
      // This is a placeholder function to simulate fetching positions
      // You would replace this with actual logic to fetch positions from your contract
      const positions = await fetchYourPositions();
      setPositions(positions);
    } catch (error) {
      console.error("Failed to fetch positions:", error);
    }
  };

  const handleNewPosition = async () => {
    if (!account) {
      connectWallet();
      return;
    }

    // Logic to add a new position
    try {
      // This is a placeholder function to simulate adding a new position
      // You would replace this with actual logic to interact with your contract
      await addNewPosition();
      // Update positions after adding a new one
      fetchPositions();
    } catch (error) {
      console.error("Failed to add new position:", error);
    }
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
          <div className="flex space-x-6 text-gray-400">
            <button className="hover:text-white">Trade</button>
            <button className="hover:text-white hidden md:block lg:block">
              Explore
            </button>
            <Link href={{ pathname: "/Pools" }}>
              <p className="hover:text-white hidden md:block lg:block">Pools</p>
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="px-4 py-2 rounded-full bg-[#191B1F] border border-gray-600 hover:border-gray-400">
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
          <button className="bg-yellow-500 text-black px-4 py-2 rounded-lg mt-4" onClick={handleNewPosition}>
            + New Position
          </button>
        </div>
      </main>
    </div>
  );
}

// Placeholder functions to simulate fetching and adding positions
const fetchYourPositions = async () => {
  // Simulate fetching positions from a contract
  return ["Position 1", "Position 2", "Position 3"];
};

const addNewPosition = async () => {
  // Simulate adding a new position
  console.log("Adding new position...");
};