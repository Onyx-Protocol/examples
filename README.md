# Liquidation and supply-borrow-repay-redeem sample for Onyx protocol

This guide helps to understand how DeFi blockchain contracts works on examples, and offers a step-by-step guide on how to run them by yourself.

## Installation and Usage

### Requirements

* Node.js v16+

### Setup

```
npm install
```

### Pre-launch tuning

Before running, copy `.env.example` file as `.env`.

```
cp .env.example .env
```

Change the existing fields to run examples with your own parameters:

* `MAINNET_RPC_URL` Ethereum Mainnet RPC URL. You can use any public or private Ethereum node, for example, Infura, Quicknode or Alchemy.
* `XCN_ADDRESS` Ethereum wallet from mainnet holding XCN tokens in quantity enough to repay a borrower’s debt. We call this account a signer or a liquidator.
* `XCN_BORROWER_ADDRESS` XCN borrower wallet from mainnet with XCN borrowed assets and negative account liquidity. It’s a borrower.
* `USDC_ADDRESS` USDC holder address from mainnet with USDC tokens to demonstrate Supply-Borrow-Repay-Redeem scenario

### Running Liquidation sample

```
npm run liquidation
```

### Running Supply Borrow Repay Redeem sample

```
npm run supplyBorrowRepayRedeem
```

Check [Wiki page](https://github.com/Onyx-Protocol/examples/wiki) to see examples detailed step by step.
