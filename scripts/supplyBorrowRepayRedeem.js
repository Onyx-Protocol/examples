const { ethers, network } = require("hardhat");
const oUSDCAbi = require("./../abi/oUSDC.json");
const USDCAbi = require("./../abi/USDC.json");
const USDTAbi = require("./../abi/USDT.json");
const oUSDTAbi = require("./../abi/oUSDT.json");
const ComptrollerAbi = require("./../abi/Comptroller.json");
require("dotenv").config();

async function supply() {
  const signerAddress = process.env.USDC_ADDRESS
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [signerAddress],
  });
  const [owner] = await ethers.getSigners();
  const signer = ethers.provider.getSigner(signerAddress);
  await owner.sendTransaction({
    to: signerAddress,
    value: ethers.utils.parseEther("1000")
  })

  const oUSDC = await ethers.getContractAt(oUSDCAbi, "0x8f35113cFAba700Ed7a907D92B114B44421e412A", signer)
  const USDC = await ethers.getContractAt(USDCAbi, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", signer)
  const oUSDT = await ethers.getContractAt(oUSDTAbi, "0xbCed4e924f28f43a24ceEDec69eE21ed4D04D2DD", signer)
  const USDT = await ethers.getContractAt(USDTAbi, "0xdAC17F958D2ee523a2206206994597C13D831ec7", signer)
  const Comptroller = await ethers.getContractAt(ComptrollerAbi, "0x7D61ed92a6778f5ABf5c94085739f1EDAbec2800", signer)

  await Comptroller.enterMarkets([oUSDC.address, oUSDT.address])
  const bank = await USDC.balanceOf(signerAddress)

  await USDC.approve(oUSDC.address, bank)
  await USDT.approve(oUSDT.address, bank)


  // mint

  oUSDC.mint(bank)

  await new Promise((resolve) => oUSDC.on("Mint", async (...args) => {
    console.log("Event Mint:", args)
    console.log('USDC balance:', await USDC.balanceOf(signerAddress))
    console.log('USDC balance locked for supply:', await oUSDC.callStatic.balanceOfUnderlying(signerAddress))
    console.log('USDC collateral factor:', await Comptroller.callStatic.markets(oUSDC.address))
    console.log('Account liquidity USD:', await Comptroller.callStatic.getAccountLiquidity(signerAddress))
    resolve()
  }))

  // borrow

  console.log('USDT total supply:', await oUSDT.totalSupply())
  oUSDT.borrow(100_000000) // 100 USDT (6 decimals)

  await new Promise((resolve) => oUSDT.on("Borrow", async (...args) => {
    console.log("Event Borrow:", args)
    console.log('USDT balance:', await USDT.balanceOf(signerAddress))
    console.log('Account liquidity USD:', await Comptroller.callStatic.getAccountLiquidity(signerAddress))
    console.log('USDT borrow balance:', await oUSDT.callStatic.borrowBalanceCurrent(signerAddress))
    console.log('USDT borrow rate per block:', await oUSDT.callStatic.borrowRatePerBlock())
    resolve()
  }))

  for (let i = 0; i < 10000; i++) {
    // mine blocks to grow borrow balance by rate per block
    await network.provider.request({
      method: "evm_mine",
      params: [],
    });
  }

  const borrowBalance = await oUSDT.callStatic.borrowBalanceCurrent(signerAddress);
  console.log('USDT borrow balance:', borrowBalance)
  console.log('Account liquidity USD:', await Comptroller.callStatic.getAccountLiquidity(signerAddress))


  // repay

  oUSDT.repayBorrow(100_000000)

  await new Promise((resolve) => oUSDT.on("RepayBorrow", async (...args) => {
    console.log("Event RepayBorrow:", args)
    console.log('USDT balance:', await USDT.balanceOf(signerAddress))
    console.log('Account liquidity USD:', await Comptroller.callStatic.getAccountLiquidity(signerAddress))
    console.log('USDT borrow balance:', await oUSDT.callStatic.borrowBalanceCurrent(signerAddress))
    resolve()
  }))


  // redeem

  console.log('USDC balance:', await USDC.balanceOf(signerAddress))
  const USDCBalanceLocked = await oUSDC.callStatic.balanceOfUnderlying(signerAddress)
  console.log('USDC balance locked for supply:', USDCBalanceLocked)
  console.log('Account liquidity before redeem:', await Comptroller.callStatic.getAccountLiquidity(signerAddress))

  oUSDC.redeemUnderlying(USDCBalanceLocked - 1_000000)

  await new Promise(resolve => oUSDC.on("Redeem", async (...args) => {
    console.log("Event Redeem:", args)
    console.log('Account liquidity USD:', await Comptroller.callStatic.getAccountLiquidity(signerAddress))
    console.log('USDC balance:', await USDC.balanceOf(signerAddress))
    console.log('USDC balance locked for supply:', await oUSDC.callStatic.balanceOfUnderlying(signerAddress))
    resolve()
  }))
}

async function send() {
  await supply();
}

send()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
