# Liquidation and supply-borrow-repay-redeem sample for Onyx protocol

## Installation and Usage

### Requirements

* Node.js v14+

### Setup

```
npm install
```

### Pre-launch tuning

Before running, copy ``.env.example`` file as ```.env```.
```
cp .env.example .env
```

Change the existing fields to run examples with your own parameters:  
``MAINNET_RPC_URL`` - Ethereum Mainnet RPC URL  
``XCN_ADDRESS`` - XCN holder address from mainnet with some huge amount of XCN tokens  
``XCN_BORROWER_ADDRESS`` - XCN borrower address from mainnet with XCN borrowed assets and negative account liquidity  
``USDC_ADDRESS`` - USDC holder address from mainnet with some huge amount of USDC tokens

### Running Liqudation sample:

```
npm run liquidation
```

### Running Supply Borrow Repay Redeem sample:

```
npm run supplyBorrowRepayRedeem
```

Check [Wiki page](https://github.com/Onyx-Protocol/examples/wiki) to see examples detailed step by step.
