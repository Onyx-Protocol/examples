const { ethers, network } = require('hardhat');
const oUSDCAbi = require('./../abi/oUSDC.json');
const USDCAbi = require('./../abi/USDC.json');
const USDTAbi = require('./../abi/USDT.json');
const oUSDTAbi = require('./../abi/oUSDT.json');
const ComptrollerAbi = require('./../abi/Comptroller.json');
require('dotenv').config();

const signerAddress = process.env.USDC_ADDRESS;

async function main() {
  // We will send transactions impersonating account with signerAddress
  await network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [signerAddress],
  });
  const signer = ethers.provider.getSigner(signerAddress);

  // Get contracts
  const oUSDC = await ethers.getContractAt(oUSDCAbi, '0x8f35113cFAba700Ed7a907D92B114B44421e412A', signer);
  const USDC = await ethers.getContractAt(USDCAbi, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', signer);
  const oUSDT = await ethers.getContractAt(oUSDTAbi, '0xbCed4e924f28f43a24ceEDec69eE21ed4D04D2DD', signer);
  const USDT = await ethers.getContractAt(USDTAbi, '0xdAC17F958D2ee523a2206206994597C13D831ec7', signer);
  const Comptroller = await ethers.getContractAt(ComptrollerAbi, '0x7D61ed92a6778f5ABf5c94085739f1EDAbec2800', signer);

  // Enter markets supply, borrow oTokens
  await Comptroller.enterMarkets([oUSDC.address, oUSDT.address]);

  // Amount of USDC tokens at signer account
  const bank = await USDC.balanceOf(signerAddress);
  console.log(`USDC Initial balance: ${bank / 1e6}`);

  // Allow oTokens contracts to transfer all the tokens on balance
  await USDC.approve(oUSDC.address, bank);
  await USDT.approve(oUSDT.address, bank);


  // Supply

  // To supply USDC we need to mint oTokens
  // 100_000000 - amount in underlying asset (USDC) equals $100 (USDC has 6 decimals)
  oUSDC.mint(100_000001);

  await new Promise((resolve) => oUSDC.on('Mint', async (...args) => {
    console.log(`Event Mint: ${args}`);
    console.log(`USDC balance: ${await USDC.balanceOf(signerAddress)}`);
    console.log(`USDC balance locked for supply: ${await oUSDC.callStatic.balanceOfUnderlying(signerAddress)}`);
    console.log(`USDC supply rate per block: ${await oUSDC.callStatic.supplyRatePerBlock()}`);
    console.log(`USDC balance: ${await USDC.balanceOf(signerAddress) / 1e6}`);
    console.log(`USDC balance locked for supply: ${await oUSDC.callStatic.balanceOfUnderlying(signerAddress) / 1e6}`);
    console.log(`USDC supply rate per block: ${await oUSDC.callStatic.supplyRatePerBlock() / 1e18}`);
    console.log(`USDC collateral factor: ${await Comptroller.callStatic.markets(oUSDC.address)}`);
    console.log(`Account liquidity USD: ${await Comptroller.callStatic.getAccountLiquidity(signerAddress)}`);
    console.log('\n');
    resolve();
  }));


  // Borrow

  console.log(`USDT total supply: ${await oUSDT.totalSupply() / 1e8}`);

  // 50_000000 - amount in underlying asset (USDT) equals $50 (USDT has 6 decimals)
  oUSDT.borrow(50_000000);

  await new Promise((resolve) => oUSDT.on('Borrow', async (...args) => {
    console.log(`Event Borrow: ${args}`);
    console.log(`USDT balance: ${await USDT.balanceOf(signerAddress)}`);
    console.log(`USDT balance: ${await USDT.balanceOf(signerAddress) / 1e6}`);
    console.log(`Account liquidity USD: ${await Comptroller.callStatic.getAccountLiquidity(signerAddress)}`);
    console.log(`USDT borrow balance: ${await oUSDT.callStatic.borrowBalanceCurrent(signerAddress) / 1e6}`);
    console.log(`USDT borrow rate per block: ${await oUSDT.callStatic.borrowRatePerBlock() / 1e18}`);
    resolve();
  }));

  // Mine 1000 blocks to grow borrow balance by rate per block
  for (let i = 0; i < 999; i++) {
    await network.provider.request({
      method: 'evm_mine',
      params: [],
    });
  }
  console.log('Mined 1000 blocks');

  const borrowBalance = await oUSDT.callStatic.borrowBalanceCurrent(signerAddress);
  console.log(`USDT borrow balance: ${borrowBalance / 1e6}`);
  console.log('\n');


  // Repay

  // 50_000000 - amount in underlying asset (USDT) equals $50 (USDT has 6 decimals)
  oUSDT.repayBorrow(50_000000);

  await new Promise((resolve) => oUSDT.on('RepayBorrow', async (...args) => {
    console.log(`Event RepayBorrow: ${args}`);
    console.log(`USDT balance: ${await USDT.balanceOf(signerAddress)}`);
    console.log(`USDT balance: ${await USDT.balanceOf(signerAddress) / 1e6}`);
    console.log(`Account liquidity USD: ${await Comptroller.callStatic.getAccountLiquidity(signerAddress)}`);
    console.log(`USDT borrow balance: ${await oUSDT.callStatic.borrowBalanceCurrent(signerAddress) / 1e6}`);
    console.log('\n');
    resolve();
  }));


  // Redeem

  console.log(`USDC balance: ${await USDC.balanceOf(signerAddress) / 1e6}`);
  const USDCBalanceLocked = await oUSDC.callStatic.balanceOfUnderlying(signerAddress);
  console.log(`USDC balance locked for supply: ${USDCBalanceLocked / 1e6}`);
  console.log(`Account liquidity before redeem: ${await Comptroller.callStatic.getAccountLiquidity(signerAddress)}`);

  // Leaving 1 USDC unredeemed
  oUSDC.redeemUnderlying(USDCBalanceLocked - 1_000000);

  await new Promise(resolve => oUSDC.on('Redeem', async (...args) => {
    console.log(`Event Redeem: ${args}`);
    console.log(`Account liquidity USD: ${await Comptroller.callStatic.getAccountLiquidity(signerAddress)}`);
    console.log(`USDC balance: ${await USDC.balanceOf(signerAddress) / 1e6}`);
    console.log(`USDC balance locked for supply: ${await oUSDC.callStatic.balanceOfUnderlying(signerAddress) / 1e6}`);
    resolve();
  }));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
