# Liquidation and supply-borrow-repay-redeem sample for Onyx protocol

## Installation and Usage

```
npm install
```

Before running, create ``.env`` file and fill it with:  
``MAINNET_RPC_URL`` - Ethereum Mainnet RPC URL  
``XCN_ADDRESS`` - XCN holder address from mainnet with some huge amount of XCN tokens  
``XCN_BORROWER_ADDRESS`` - XCN borrower address from mainnet with XCN borrowed assets and negative account liquidity  
``USDC_ADDRESS`` - USDC holder address from mainnet with some huge amount of USDC tokens

### Running Liqudation sample:
```
npm run liquidate
```

### Running Supply Borrow Repay Redeem sample:
```
npm run supplyBorrowRepayRedeem
```

Check [Wiki](https://github.com/Onyx-Protocol/examples/wiki) to learn more.
