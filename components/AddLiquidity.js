import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import {
  ERC20_ABI,
  UNISWAP_ADDRESSES,
  UNISWAP_FACTORY_ABI,
  UNISWAP_PAIR_ABI,
  UNISWAP_ROUTER_ABI,
  WETH_ABI,
  STORAGE_ABI,
  storageAddress,
} from "../constants/addresses";

const AddLiquidity = ({
  signer,
  token0,
  token1,
  token0Amount,
  token1Amount,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addLiquidity = async () => {
    try {
      setLoading(true);
      setError(null);

      const account = await signer.getAddress();

      const factoryContract = new ethers.Contract(
        UNISWAP_ADDRESSES.FACTORY,
        UNISWAP_FACTORY_ABI,
        signer
      );

      const pairAddress = await factoryContract.getPair(
        token0.address,
        token1.address
      );
      if (pairAddress === ethers.constants.AddressZero) {
        const tx = await factoryContract.createPair(
          token0.address,
          token1.address
        );
        await tx.wait();
      }
      console.log("pairAddress", pairAddress);

      const token0Contract = new ethers.Contract(
        token0.address,
        token0.symbol === "WETH" ? WETH_ABI : ERC20_ABI,
        signer
      );
      const token1Contract = new ethers.Contract(
        token1.address,
        token1.symbol === "WETH" ? WETH_ABI : ERC20_ABI,
        signer
      );

      const gasPrice = await signer.provider.getGasPrice();

      if (token0.symbol === "WETH") {
        const wethBalance = await token0Contract.balanceOf(account);
        const token0AmountParsed = ethers.utils.parseEther(token0Amount);
        if (wethBalance.lt(token0AmountParsed)) {
          const tx = await token0Contract.deposit({
            value: token0AmountParsed,
            gasLimit: 100000,
            gasPrice: gasPrice,
          });
          await tx.wait();
        }
      }

      if (token1.symbol === "WETH") {
        const wethBalance = await token1Contract.balanceOf(account);
        const token1AmountParsed = ethers.utils.parseEther(token1Amount);
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
        token0.symbol === "WETH"
          ? ethers.utils.parseEther(token0Amount)
          : ethers.utils.parseUnits(token0Amount, token0.decimals);

      const token1AmountParsed =
        token1.symbol === "WETH"
          ? ethers.utils.parseEther(token1Amount)
          : ethers.utils.parseUnits(token1Amount, token1.decimals);

      const token0Balance = await token0Contract.balanceOf(account);
      console.log(`${token0.symbol} balance: ${token0Balance.toString()}`);

      const token1Balance = await token1Contract.balanceOf(account);
      console.log(`${token1.symbol} balance: ${token1Balance.toString()}`);

      if (token0Balance.lt(token0AmountParsed)) {
        throw new Error(`Insufficient ${token0.symbol} balance.`);
      }

      if (token1Balance.lt(token1AmountParsed)) {
        throw new Error(`Insufficient ${token1.symbol} balance.`);
      }

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

      // Estimate gas for the transaction
      const gasLimit = await routerContract.estimateGas.addLiquidity(
        token0.address,
        token1.address,
        token0AmountParsed,
        token1AmountParsed,
        0,
        0,
        account,
        deadline
      );

      
      console.log("=====");
      console.log("token0.address", token0.address);
      console.log("token1.address", token1.address);
      console.log("token0AmountParsed", token0AmountParsed.toString());
      console.log("token1AmountParsed", token1AmountParsed.toString());
      console.log("account", account);
      console.log("deadline", deadline);
      console.log("gasLimit", gasLimit.toString());

      const tx = await routerContract.addLiquidity(
        token0.address,
        token1.address,
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
        storageAddress,
        STORAGE_ABI,
        signer
      );
      const txStorage = await storageContract.addBlockchain(
        pairAddress,
        liquidityAdded
      );
      await txStorage.wait();

      setLoading(false);
      onClose();
    } catch (error) {
      setLoading(false);
      setError(error.message);
    }
  };

  useEffect(() => {
    if (signer && token0 && token1 && token0Amount && token1Amount) {
      addLiquidity();
    }
  }, [signer, token0, token1, token0Amount, token1Amount]);

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p>Error: {error}</p>
      ) : (
        <p>Liquidity added successfully!</p>
      )}
    </div>
  );
};

export default AddLiquidity;
