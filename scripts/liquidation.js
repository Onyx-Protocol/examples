const { ethers, network } = require('hardhat');
const { formatNumber } = require('../helpers/utils');
const oXCNAbi = require('./../abi/oXCN.json');
const XCNAbi = require('./../abi/XCN.json');
const ComptrollerAbi = require('./../abi/Comptroller.json');
require('dotenv').config();

const borrowerAddress = process.env.XCN_BORROWER_ADDRESS;
const signerAddress = process.env.XCN_ADDRESS;

async function main() {
  const summary = {
    before: {
      xcnBalance: 0,
      xcnLockedForSupply: 0,
      borrowerLiquidity: 0,
      borrowerXcnLockedForSupply: 0,
      borrowerXcnBalance: 0,
    },
    after: {
      xcnBalance: 0,
      xcnLockedForSupply: 0,
      borrowerLiquidity: 0,
      borrowerXcnLockedForSupply: 0,
      borrowerXcnBalance: 0,
    }
  }

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
  const oXCN = await ethers.getContractAt(oXCNAbi, '0x1961AD247B47F4f2242E55a0E5578C6cf01F8D12', signer);
  const XCN = await ethers.getContractAt(XCNAbi, '0xA2cd3D43c775978A96BdBf12d733D5A1ED94fb18', signer);
  const Comptroller = await ethers.getContractAt(ComptrollerAbi, '0x7D61ed92a6778f5ABf5c94085739f1EDAbec2800', signer);

  // Enter markets with borrow-asset
  // https://docs.onyx.org/comptroller/enter-markets
  await Comptroller.enterMarkets([oXCN.address]);

  // Get exchange rates for oXCN and XCN
  const oXCNExchangeRate = await oXCN.callStatic.exchangeRateCurrent();
  console.log(`1 oXCN = XCN: ${formatNumber(oXCNExchangeRate / 1e28)}`);
  console.log(`1 XCN = oXCN: ${formatNumber((1 / (oXCNExchangeRate / 1e28)))}`);
  console.log('\n');

  // Amount of XCN tokens at signer account
  const bank = await XCN.balanceOf(signerAddress);

  // Allow oTokens contract and Comptroller to transfer tokens
  await XCN.approve(oXCN.address, bank);
  await XCN.approve(Comptroller.address, bank);

  const closeFactorPercentage = (await Comptroller.callStatic.closeFactorMantissa() / 1e16)
  console.log('Close factor: ', closeFactorPercentage, '%')
  console.log('Liquidation incentive: ', (await Comptroller.callStatic.liquidationIncentiveMantissa() / 1e16), '%')

  summary.before.xcnBalance = await XCN.balanceOf(signerAddress);
  summary.before.xcnLockedForSupply = await oXCN.callStatic.balanceOfUnderlying(signerAddress);
  summary.before.borrowerLiquidity = await Comptroller.getAccountLiquidity(borrowerAddress);
  summary.before.borrowerXcnLockedForSupply = await oXCN.callStatic.balanceOfUnderlying(borrowerAddress);
  summary.before.borrowerXcnBalance = await oXCN.callStatic.borrowBalanceCurrent(borrowerAddress)
  console.log(`XCN balance: ${formatNumber(summary.before.xcnBalance / 1e18)}`);
  console.log(`XCN balance locked for supply: ${formatNumber(summary.before.xcnLockedForSupply / 1e18)}`);
  console.log(`Borrower account liquidity in USD: ${formatNumber(summary.before.borrowerLiquidity[1] / 1e18)}`);
  console.log(`Borrower account negative liquidity in USD: ${formatNumber(summary.before.borrowerLiquidity[2] / 1e18)}`);
  console.log(`Borrower balance locked for supply in XCN: ${formatNumber(summary.before.borrowerXcnLockedForSupply / 1e18)}`);
  console.log(`Borrower assets in (XCN): ${await Comptroller.getAssetsIn(borrowerAddress)}`);
  console.log('\n');

  // Get borrow balance in underlying token (XCN)
  console.log(`Borrower balance in XCN: ${formatNumber(summary.before.borrowerXcnBalance / 1e18)}`);
  console.log(`Borrower balance in oXCN: ${formatNumber((summary.before.borrowerXcnBalance / 1e18) * (Math.floor((1 / (oXCNExchangeRate / 1e28)))))}`);
  console.log('\n');

  // Liquidate a half of borrowed balance
  // https://docs.onyx.org/otokens/liquidate-borrow
  // if borrower liquidity positive, will throw an error
  // 0 < repayAmount < borrowerBalance * closeFactor
  // await oXCN.liquidateBorrow(borrowerAddress, summary.before.borrowerXcnBalance.mul(closeFactorPercentage).div(100), oXCN.address);
  await oXCN.liquidateBorrow(borrowerAddress, summary.before.borrowerXcnBalance.mul(10).div(100), oXCN.address);

  await new Promise((resolve) => oXCN.on('LiquidateBorrow', async (liquidator, borrower, repayAmount, oTokenCollateral, seizeTokens) => {
    console.log(
      `Arguments received by LiquidateBorrow event:`,
      `LiquidatorAddress: ${liquidator};`,
      `BorrowerAddress: ${borrower};`,
      `RepayAmount: ${formatNumber(repayAmount / 1e18)};`,
      `oTokenCollateralAddress: ${oTokenCollateral};`,
      `seizeTokens: ${formatNumber(seizeTokens / 1e18)};`,
    );

    summary.after.xcnBalance = await XCN.balanceOf(signerAddress);
    summary.after.xcnLockedForSupply = await oXCN.callStatic.balanceOfUnderlying(signerAddress);
    summary.after.borrowerLiquidity = await Comptroller.getAccountLiquidity(borrowerAddress);
    summary.after.borrowerXcnLockedForSupply = await oXCN.callStatic.balanceOfUnderlying(borrowerAddress);
    summary.after.borrowerXcnBalance = await oXCN.callStatic.borrowBalanceCurrent(borrowerAddress)
    console.log(`Borrower account liquidity after liquidation: ${formatNumber(summary.after.borrowerLiquidity[1] / 1e18)}`);
    console.log(`Borrower account negative liquidity after liquidation: ${formatNumber(summary.after.borrowerLiquidity[2] / 1e18)}`);
    console.log(`Borrower balance in XCN after liquidation: ${formatNumber(summary.after.borrowerXcnBalance / 1e18)}`);
    console.log(`Borrower balance locked for supply in XCN: ${formatNumber(summary.after.borrowerXcnLockedForSupply / 1e18)}`);
    console.log(`XCN balance after liquidation: ${formatNumber(summary.after.xcnBalance / 1e18)}`);
    console.log(`XCN balance locked for supply after liquidation: ${formatNumber(summary.after.xcnLockedForSupply / 1e18)}`);
    console.log(`Liquidator profit (current XCN locked for supply - liquidation cost): ${formatNumber((summary.after.xcnLockedForSupply - summary.before.borrowerXcnBalance.div(2)) / 1e18)}`);
    resolve();
  }));

  console.log('\nDifferences:\n')
  console.log(`Borrower account liquidity difference: ${formatNumber(summary.after.borrowerLiquidity[1].sub(summary.before.borrowerLiquidity[1]) / 1e18)}`);
  console.log(`Borrower account negative liquidity difference: ${formatNumber(summary.after.borrowerLiquidity[2].mul(-1).sub(summary.before.borrowerLiquidity[2].mul(-1)) / 1e18)}`);
  console.log(`Borrower balance in XCN after liquidation difference: ${formatNumber((summary.after.borrowerXcnBalance - summary.before.borrowerXcnBalance) / 1e18)}`);
  console.log(`Borrower balance locked for supply in XCN difference: ${formatNumber((summary.after.borrowerXcnLockedForSupply - summary.before.borrowerXcnLockedForSupply) / 1e18)}`);
  console.log(`XCN balance after liquidation difference: ${formatNumber((summary.after.xcnBalance - summary.before.xcnBalance) / 1e18)}`);
  console.log(`Profit. XCN balance locked for supply after liquidation difference: ${formatNumber((summary.after.xcnLockedForSupply - summary.before.borrowerXcnBalance.mul(10).div(100)) / 1e18)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
