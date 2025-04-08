// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.7.0 <0.9.0;
pragma abicoder v2;

contract UserStorageData {
    // 调换 liquidityAmount 和 pairAddress 的存储顺序
    struct TranTransactionStruck {
        address pairAddress;    // 对应的 pair 地址
        uint256 liquidityAmount; // 流动性数量
    }

    // 使用mapping来存储交易，键是钱包地址，值是交易记录数组
    mapping(address => TranTransactionStruck[]) public transactions;

    // 添加交易到mapping
    function addBlockchain(
        address pairAddress,
        uint256 liquidityAmount
    ) public {
        require(liquidityAmount > 0, "Liquidity amount must be greater than 0");
        
        // 创建一个新的交易记录
        TranTransactionStruck memory newTransaction = TranTransactionStruck(
            pairAddress, // 先存储 pairAddress
            liquidityAmount // 再存储 liquidityAmount
        );

        // 将新的交易记录添加到指定用户的交易数组中
        transactions[msg.sender].push(newTransaction);
    }

    // 获取某个地址的所有交易记录
    function getTransactions(
        address userAddress
    ) public view returns (TranTransactionStruck[] memory) {
        return transactions[userAddress];
    }
}