// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.7.0 <0.9.0;
pragma abicoder v2;

contract UserStorageData {
    struct TranTransactionStruck {
        uint256 liquidityAmount; // 流动性数量
    }

    // 使用mapping来存储交易，键是一个钱包地址和一个pair地址的组合
    mapping(address => mapping(address => TranTransactionStruck[]))
        public transactions;

    // 添加交易到mapping
    function addBlockchain(
        address pairAddress,
        uint256 liquidityAmount
    ) public {
        require(liquidityAmount > 0, "Liquidity amount must be greater than 0");
        
        // 创建一个新的交易记录
        TranTransactionStruck memory newTransaction = TranTransactionStruck(
            liquidityAmount
        );

        // 将新的交易记录添加到指定用户和pair的交易数组中
        transactions[msg.sender][pairAddress].push(newTransaction);
    }

    // 获取某个地址的所有交易记录
    function getTransactions(
        address userAddress,
        address pairAddress
    ) public view returns (TranTransactionStruck[] memory) {
        return transactions[userAddress][pairAddress];
    }
}
