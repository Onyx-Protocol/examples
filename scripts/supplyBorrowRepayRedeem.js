const { ethers, network } = require('hardhat');
const { formatNumber } = require('../helpers/utils');
const oUSDCAbi = require('./../abi/oUSDC.json');
const USDCAbi = require('./../abi/USDC.json');
const USDTAbi = require('./../abi/USDT.json');
const oUSDTAbi = require('./../abi/oUSDT.json');
const ComptrollerAbi = require('./../abi/Comptroller.json');
require('dotenv').config();

const signerAddress = process.env.USDC_ADDRESS;

async function main() {
  // We will send transactions using impersonating signerAddress account

  await network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [signerAddress],
  });
  const [owner] = await ethers.getSigners();
  const signer = ethers.provider.getSigner(signerAddress);
  await owner.sendTransaction({
    to: signerAddress,
    value: ethers.utils.parseEther("1000")
  });

  // Get contracts
  const oUSDC = await ethers.getContractAt(oUSDCAbi, '0x8f35113cFAba700Ed7a907D92B114B44421e412A', signer);
  const USDC = await ethers.getContractAt(USDCAbi, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', signer);
  const oUSDT = await ethers.getContractAt(oUSDTAbi, '0xbCed4e924f28f43a24ceEDec69eE21ed4D04D2DD', signer);
  const USDT = await ethers.getContractAt(USDTAbi, '0xdAC17F958D2ee523a2206206994597C13D831ec7', signer);
  const Comptroller = await ethers.getContractAt(ComptrollerAbi, '0x7D61ed92a6778f5ABf5c94085739f1EDAbec2800', signer);

  // Enter oTokens markets to supply and borrow
  // https://docs.onyx.org/comptroller/enter-markets
  await Comptroller.enterMarkets([oUSDC.address, oUSDT.address]);

  console.log('\n');
  console.log('*** Starting Supply-Borrow-Repay-Redeem scenario ***\n');

  // Amount of USDC tokens in the signer's account
  const bank = await USDC.balanceOf(signerAddress);
  console.log(`USDC initial balance: ${formatNumber(bank / 1e6)}`);
  console.log(`USDT initial balance: ${formatNumber((await USDT.balanceOf(signerAddress)) / 1e6)}`);

  // Allow oTokens contracts to transfer all the tokens on balance
  await USDC.approve(oUSDC.address, bank);
  await USDT.approve(oUSDT.address, bank);

  console.log('\n');
  console.log('*** Supply ***\n');

  // To supply USDC we mint oTokens in return
  // 100_000000 - amount in underlying for oUSDC asset (USDC) equals $100 (USDC has 6 decimals)
  // https://docs.onyx.org/otokens/mint
  oUSDC.mint(100_000001);

  // Emitted upon a successful Mint
  // https://docs.onyx.org/otokens/key-events
  await new Promise((resolve) => oUSDC.on('Mint', async (minter, mintAmount, mintTokens) => {
    console.log(
      `Arguments received by Mint event:`,
      `MinterAddress: ${minter};`,
      `MintAmount: ${mintAmount};`,
      `mintTokens: ${mintTokens};`,
    );
    console.log(`USDC balance after supplying: ${formatNumber(await USDC.balanceOf(signerAddress) / 1e6)}`);
    console.log(`USDC balance locked for supply (redeemable): ${formatNumber(await oUSDC.callStatic.balanceOfUnderlying(signerAddress) / 1e6)}`);
    console.log(`USDC supply rate per block: ${formatNumber(await oUSDC.callStatic.supplyRatePerBlock() / 1e18)}`);
    console.log(`USDC collateral factor: ${(await Comptroller.callStatic.markets(oUSDC.address))[1] / 1e18}`);
    console.log(`Account liquidity in USD: ${formatNumber((await Comptroller.getAccountLiquidity(signerAddress))[1] / 1e18)}`);
    console.log('\n');
    resolve();
  }));

  // Mine 8640 blocks to grow supply balance: get the interest
  for (let i = 0; i < 8640; i++) {
    await network.provider.request({
      method: 'evm_mine',
      params: [],
    });
  }

  console.log('Mined 8640 blocks ~ 1 day..');  
  console.log(`USDC balance in a day: ${formatNumber(await USDC.balanceOf(signerAddress) / 1e6)}`);
  console.log(`USDC balance locked for supply in a day (redeemable): ${formatNumber(await oUSDC.callStatic.balanceOfUnderlying(signerAddress) / 1e6)}`);

  console.log('\n');
  console.log('*** Borrow ***\n');

  console.log(`USDT total supply in the Onyx Protocol: ${formatNumber(await oUSDT.totalSupply() / 1e8)}`);
  console.log(`USDT total liquidity in the Onyx Protocol: ${formatNumber(await oUSDT.getCash() / 1e8)}`);
  console.log('\n');

  // 50_000000 - amount in underlying for oUSDT asset (USDT) equals $50 (USDT has 6 decimals)
  // https://docs.onyx.org/otokens/borrow
  oUSDT.borrow(50_000000);

  // Emitted upon a successful Borrow
  // https://docs.onyx.org/otokens/key-events
  await new Promise((resolve) => oUSDT.on('Borrow', async (borrower, borrowAmount, accountBorrows, totalBorrows) => {
    console.log(
      `Arguments received by Borrow event:`,
      `BorrowerAddress: ${borrower};`,
      `BorrowAmount: ${borrowAmount};`,
      `AccountBorrows: ${accountBorrows};`,
      `TotalBorrows: ${totalBorrows};`,
    );
    console.log(`USDT balance after borrowing: ${formatNumber(await USDT.balanceOf(signerAddress) / 1e6)}`);
    console.log(`Account liquidity in USD: ${formatNumber((await Comptroller.getAccountLiquidity(signerAddress))[1] / 1e18)}`);
    console.log(`USDT borrow balance: ${formatNumber(await oUSDT.callStatic.borrowBalanceCurrent(signerAddress) / 1e6)}`);
    console.log(`USDT borrow rate per block: ${formatNumber(await oUSDT.callStatic.borrowRatePerBlock() / 1e18)}`);
    console.log('\n');
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
  console.log(`USDT borrow balance: ${formatNumber(borrowBalance / 1e6)}`);
  console.log('\n');


  // Repay

  // 50_000000 - amount in underlying asset (USDT) equals $50 (USDT has 6 decimals)
  // https://docs.onyx.org/otokens/repay-borrow
  oUSDT.repayBorrow(50_000000);

  await new Promise((resolve) => oUSDT.on('RepayBorrow', async (payer, borrower, repayAmount, accountBorrows, totalBorrows) => {
    console.log(
      `Arguments received by RepayBorrow event:`,
      `PayerAddress: ${payer};`,
      `BorrowerAddress: ${borrower};`,
      `RepayAmount: ${repayAmount};`,
      `AccountBorrows: ${accountBorrows};`,
      `TotalBorrows: ${totalBorrows};`,
    );
    console.log(`USDT balance: ${formatNumber(await USDT.balanceOf(signerAddress) / 1e6)}`);
    console.log(`Account liquidity in USD: ${formatNumber((await Comptroller.getAccountLiquidity(signerAddress))[1] / 1e18)}`);
    console.log(`USDT borrow balance: ${formatNumber(await oUSDT.callStatic.borrowBalanceCurrent(signerAddress) / 1e6)}`);
    console.log('\n');
    resolve();
  }));


  // Redeem

  console.log(`USDC balance: ${formatNumber(await USDC.balanceOf(signerAddress) / 1e6)}`);
  const USDCBalanceLocked = await oUSDC.callStatic.balanceOfUnderlying(signerAddress);
  console.log(`USDC balance locked for supply: ${formatNumber(USDCBalanceLocked / 1e6)}`);
  console.log(`Account liquidity before redeem in USD: ${formatNumber((await Comptroller.getAccountLiquidity(signerAddress))[1] / 1e18)}`);

  // Leaving 1 USDC unredeemed
  // https://docs.onyx.org/otokens/redeem-underlying
  oUSDC.redeemUnderlying(USDCBalanceLocked - 1_000000);

  await new Promise(resolve => oUSDC.on('Redeem', async (redeemer, redeemAmount, redeemTokens) => {
    console.log(
      `Arguments received by Redeem event:`,
      `RedeemerAddress: ${redeemer};`,
      `RedeemAmount: ${redeemAmount};`,
      `RedeemTokens: ${redeemTokens};`,
    );
    console.log(`Account liquidity in USD: ${formatNumber((await Comptroller.getAccountLiquidity(signerAddress))[1] / 1e18)}`);
    console.log(`USDC balance: ${formatNumber(await USDC.balanceOf(signerAddress) / 1e6)}`);
    console.log(`USDC balance locked for supply: ${formatNumber(await oUSDC.callStatic.balanceOfUnderlying(signerAddress) / 1e6)}`);
    resolve();
  }));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
