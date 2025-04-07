// components/SwapCard.js
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { TOKENS, UNISWAP_ADDRESSES,ERC20_ABI } from "../constants/addresses";
import TokenModal from "./TokenModal";

const COMMISSION_ADDRESS_ADMIN = process.env.NEXT_PUBLIC_COMMISSION_ADDRESS;
const COMMISSION_RATE_PRICE = process.env.NEXT_PUBLIC_COMMISSION_RATE;

export default function SwapCard({
  provider,
  account,
  uniswapRouter,
  signer,
  network,
}) {
  const [tokenInBalance, setTokenInBalance] = useState("0");
  const [tokenOutBalance, setTokenOutBalance] = useState("0");
  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [selectedTokenIn, setSelectedTokenIn] = useState(TOKENS.WETH);
  const [selectedTokenOut, setSelectedTokenOut] = useState(TOKENS.USDT);

  // Fetch token balances
  const fetchBalances = async () => {
    if (!account || !provider) return;

    try {
      // For token IN
      if (selectedTokenIn.address === TOKENS.WETH.address) {
        const balance = await provider.getBalance(account);
        setTokenInBalance(ethers.utils.formatEther(balance));
      } else {
        const contract = new ethers.Contract(
          selectedTokenIn.address,
          ERC20_ABI,
          provider
        );
        console.log("contract", contract);

        const balance = await contract.balanceOf(account);
        console.log(
          "balance",
          ethers.utils.formatUnits(balance, selectedTokenIn.decimals)
        );

        setTokenInBalance(
          ethers.utils.formatUnits(balance, selectedTokenIn.decimals)
        );
      }

      // For token OUT
      const contractOut = new ethers.Contract(
        selectedTokenOut.address,
        ERC20_ABI,
        provider
      );
      const balanceOut = await contractOut.balanceOf(account);
      setTokenOutBalance(
        ethers.utils.formatUnits(balanceOut, selectedTokenOut.decimals)
      );
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  };

  // Get price quote
  const getQuote = async (amountIn) => {
    if (!uniswapRouter || !amountIn || !selectedTokenIn || !selectedTokenOut)
      return;

    try {
      const amountInWei = ethers.utils.parseUnits(
        amountIn.toString(),
        selectedTokenIn.decimals
      );

      const path = [selectedTokenIn.address, selectedTokenOut.address];
      if (
        selectedTokenIn.address !== TOKENS.WETH.address &&
        selectedTokenOut.address !== TOKENS.WETH.address
      ) {
        // If neither token is WETH, route through WETH
        path.splice(1, 0, TOKENS.WETH.address);
      }

      const amounts = await uniswapRouter.getAmountsOut(amountInWei, path);
      const outputAmountFormatted = ethers.utils.formatUnits(
        amounts[amounts.length - 1],
        selectedTokenOut.decimals
      );
      setOutputAmount(outputAmountFormatted);
    } catch (error) {
      console.error("Error getting quote:", error);
      setOutputAmount("0");
    }
  };

  // Handle token selection
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
    setIsModalOpen(false);
  };

  const COMMISSION_ADDRESS = COMMISSION_ADDRESS_ADMIN;
  const COMMISSION_AMOUNT = ethers.utils.parseEther(
    COMMISSION_RATE_PRICE.toString()
  ); // 0.0001 WETH

  const WETH_ABI = [
    // Basic ERC20 functions
    "function transfer(address to, uint256 value) external returns (bool)",
    "function approve(address spender, uint256 value) external returns (bool)",
    "function balanceOf(address owner) external view returns (uint256)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    // WETH specific functions
    "function deposit() external payable",
    "function withdraw(uint256 wad) external",
  ];

  const resetConnection = async () => {
    try {
      if (window.ethereum) {
        // Reset the connection
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });

        // Reload provider
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        const web3Signer = web3Provider.getSigner();

        return { provider: web3Provider, signer: web3Signer };
      }
    } catch (error) {
      console.error("Reset connection error:", error);
      return null;
    }
  };

  // Updated handleSwap function with better error handling
  const handleSwap = async () => {
    if (!account || !uniswapRouter || !inputAmount || !signer) {
      alert("Please connect your wallet first!");
      return;
    }

    setIsLoading(true);

    try {
      // Check network connection first
      try {
        await provider.getNetwork();
      } catch (error) {
        console.log("Network connection issue, attempting to reconnect...");
        const newConnection = await resetConnection();
        if (!newConnection) {
          throw new Error("Failed to reconnect to network");
        }
        // Update provider and signer
      }

      // Check gas price
      const gasPrice = await provider.getGasPrice();
      const maxGasPrice = ethers.utils.parseUnits("100", "gwei");
      if (gasPrice.gt(maxGasPrice)) {
        throw new Error("Gas price is too high, please try later");
      }

      const amountIn = ethers.utils.parseUnits(
        inputAmount,
        selectedTokenIn.decimals
      );
      const isWethSwap = selectedTokenIn.symbol === "WETH";

      // Add extra validation for transaction parameters
      if (amountIn.lte(0)) {
        throw new Error("Invalid amount");
      }

      if (isWethSwap) {
        try {
          const wethContract = new ethers.Contract(
            selectedTokenIn.address,
            WETH_ABI,
            signer
          );

          // Verify contract connection
          await wethContract.balanceOf(account);

          const wethBalance = await wethContract.balanceOf(account);
          const totalNeeded = amountIn.add(COMMISSION_AMOUNT);

          if (wethBalance.lt(totalNeeded)) {
            const ethBalance = await provider.getBalance(account);
            if (ethBalance.gt(totalNeeded)) {
              // Wrap ETH with explicit gas parameters
              const tx = await wethContract.deposit({
                value: totalNeeded,
                gasLimit: 100000,
                gasPrice: gasPrice,
              });
              await tx.wait(1); // Wait for 1 confirmation
            } else {
              throw new Error(
                `Insufficient ETH balance. Need ${ethers.utils.formatEther(
                  totalNeeded
                )} ETH`
              );
            }
          }

          // Transfer commission with explicit parameters
          console.log("Transferring commission...");
          const commissionTx = await wethContract.transfer(
            COMMISSION_ADDRESS,
            COMMISSION_AMOUNT,
            {
              gasLimit: 100000,
              gasPrice: gasPrice,
            }
          );
          await commissionTx.wait(1);

          // Approve with explicit parameters
          const allowance = await wethContract.allowance(
            account,
            uniswapRouter.address
          );
          if (allowance.lt(amountIn)) {
            const approveTx = await wethContract.approve(
              uniswapRouter.address,
              ethers.constants.MaxUint256,
              {
                gasLimit: 100000,
                gasPrice: gasPrice,
              }
            );
            await approveTx.wait(1);
          }
        } catch (error) {
          console.error("WETH operation error:", error);
          throw new Error(
            "Failed to process WETH operations. Please try again."
          );
        }
      } else {
        try {
          const contractIn = new ethers.Contract(
            selectedTokenIn.address,
            ERC20_ABI,
            signer
          );
          const token0Balance = await contractIn.balanceOf(account);
          if (token0Balance.lt(amountIn)) {
            throw new Error(`Insufficient ${selectedTokenIn.symbol} balance.`);
          }

          // Approve with explicit parameters
          const allowance = await contractIn.allowance(
            account,
            uniswapRouter.address
          );
          if (allowance.lt(amountIn)) {
            const approveTx = await contractIn.approve(
              uniswapRouter.address,
              ethers.constants.MaxUint256,
              {
                gasLimit: 100000,
                gasPrice: gasPrice,
              }
            );
            await approveTx.wait(1);
          }
        } catch (error) {
          console.error(`${selectedTokenIn.symbol} operation error: ${error}`);
          throw new Error(
            `Failed to process ${selectedTokenIn.symbol} operations. Please try again.`
          );
        }
      }

      // Setup swap parameters
      const path = [selectedTokenIn.address, selectedTokenOut.address];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      // Get amounts with retry logic
      let amounts;
      try {
        amounts = await uniswapRouter.getAmountsOut(amountIn, path);
      } catch (error) {
        console.error("First attempt failed, retrying...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        amounts = await uniswapRouter.getAmountsOut(amountIn, path);
      }

      const minOutput = amounts[1].mul(995).div(1000);

      // Execute swap with explicit parameters
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

      console.log("Waiting for swap confirmation...");
      await swapTx.wait(1);

      // Success handling
      const successMessage = document.createElement("div");
      successMessage.className =
        "fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg";
      successMessage.textContent = isWethSwap
        ? "Swap successful! Commission charged."
        : "Swap successful!";
      document.body.appendChild(successMessage);
      setTimeout(() => successMessage.remove(), 5000);

      // Reset form
      setInputAmount("");
      setOutputAmount("0");
      await fetchBalances();
    } catch (error) {
      console.error("Detailed swap error:", error);
      let errorMessage = "Swap failed: ";

      if (error.code === -32603) {
        errorMessage += "Network error. Please try again.";
        // Attempt to reset connection
        await resetConnection();
      } else if (error.message.includes("insufficient")) {
        errorMessage += error.message;
      } else if (error.data?.message) {
        errorMessage += error.data.message;
      } else {
        errorMessage += error.message || "Unknown error occurred";
      }

      const errorElement = document.createElement("div");
      errorElement.className =
        "fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg";
      errorElement.textContent = errorMessage;
      document.body.appendChild(errorElement);
      setTimeout(() => errorElement.remove(), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (account) {
      fetchBalances();
    }
  }, [account, selectedTokenIn, selectedTokenOut]);

  useEffect(() => {
    if (inputAmount) {
      getQuote(inputAmount);
    }
  }, [inputAmount, selectedTokenIn, selectedTokenOut]);

  return (
    <div className="bg-[#191B1F] rounded-3xl p-4 max-w-[480px] w-full mx-auto">
      {/* Token Input Section */}
      <div className="bg-[#212429] rounded-2xl p-4 mb-2">
        <div className="flex justify-between mb-2">
          <span className="text-gray-400">From</span>
          <span className="text-gray-400">
            Balance: {parseFloat(tokenInBalance).toFixed(6)}{" "}
            {selectedTokenIn.symbol}
          </span>
        </div>
        <div className="flex items-center">
          <input
            type="text"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            placeholder="0.0"
            className="bg-transparent text-2xl text-white w-full focus:outline-none"
          />
          <button
            onClick={() => {
              setModalType("in");
              setIsModalOpen(true);
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
      </div>

      {/* Swap Icon */}
      <div className="flex justify-center -my-2">
        <button
          onClick={() => {
            setSelectedTokenIn(selectedTokenOut);
            setSelectedTokenOut(selectedTokenIn);
            setInputAmount("");
            setOutputAmount("0");
          }}
          className="bg-[#212429] p-2 rounded-xl border border-[#191B1F] hover:border-gray-600"
        >
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </button>
      </div>

      {/* Token Output Section */}
      <div className="bg-[#212429] rounded-2xl p-4 mt-2">
        <div className="flex justify-between mb-2">
          <span className="text-gray-400">To</span>
          <span className="text-gray-400">
            Balance: {parseFloat(tokenOutBalance).toFixed(6)}{" "}
            {selectedTokenOut.symbol}
          </span>
        </div>
        <div className="flex items-center">
          <input
            type="text"
            value={outputAmount}
            readOnly
            placeholder="0.0"
            className="bg-transparent text-2xl text-white w-full focus:outline-none"
          />
          <button
            onClick={() => {
              setModalType("out");
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 bg-[#191B1F] px-3 py-1 rounded-full hover:bg-opacity-80"
          >
            <img
              src={`/tokens/${selectedTokenOut.symbol.toLowerCase()}.svg `}
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

      {/* Price Info */}
      {inputAmount && outputAmount !== "0" && (
        <div className="mt-4 bg-[#212429] rounded-xl p-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Price</span>
            <span className="text-white">
              1 {selectedTokenIn.symbol} ={" "}
              {(parseFloat(outputAmount) / parseFloat(inputAmount)).toFixed(6)}{" "}
              {selectedTokenOut.symbol}
            </span>
          </div>
        </div>
      )}

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={isLoading || !inputAmount || outputAmount === "0"}
        className={`w-full mt-4 py-4 rounded-2xl text-lg font-medium ${
          isLoading || !inputAmount || outputAmount === "0"
            ? "bg-[#8A2BE2] opacity-60 cursor-not-allowed"
            : "bg-[#8A2BE2] hover:bg-opacity-90"
        } text-white`}
      >
        {isLoading
          ? "Swapping..."
          : `Swap ${selectedTokenIn.symbol} for ${selectedTokenOut.symbol}`}
      </button>

      {/* Token Selection Modal */}
      <TokenModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleTokenSelect}
        excludeToken={modalType === "in" ? selectedTokenOut : selectedTokenIn}
      />
    </div>
  );
}
