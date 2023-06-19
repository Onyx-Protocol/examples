const { ethers, network } = require('hardhat');
const { formatNumber } = require('../helpers/utils');
const oXCNAbi = require('./../abi/oXCN.json');
const XCNAbi = require('./../abi/XCN.json');
const ComptrollerAbi = require('./../abi/Comptroller.json');
require('dotenv').config();

const borrowerAddress = process.env.XCN_BORROWER_ADDRESS;
const signerAddress = process.env.XCN_ADDRESS;

async function main() {
  // We will send transactions impersonating account with signerAddress
  await network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [signerAddress],
  });
  const signer = ethers.provider.getSigner(signerAddress);

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

  console.log(`XCN balance: ${formatNumber(await XCN.balanceOf(signerAddress) / 1e18)}`);
  console.log(`XCN balance locked for supply: ${formatNumber(await oXCN.callStatic.balanceOfUnderlying(signerAddress) / 1e18)}`);
  console.log(`Borrower account liquidity shortfall in USD: ${formatNumber((await Comptroller.getAccountLiquidity(borrowerAddress))[2] / 1e18)}`);
  console.log(`Borrower balance locked for supply in XCN: ${formatNumber(await oXCN.callStatic.balanceOfUnderlying(borrowerAddress) / 1e18)}`);
  console.log(`Borrower assets in (XCN): ${await Comptroller.getAssetsIn(borrowerAddress)}`);
  console.log('\n');

  // Get borrow balance in underlying token (XCN)
  const borrowedBalance = await oXCN.callStatic.borrowBalanceCurrent(borrowerAddress);
  console.log(`Borrower balance in XCN: ${formatNumber(borrowedBalance / 1e18)}`);
  console.log(`Borrower balance in oXCN: ${formatNumber((borrowedBalance / 1e18) * (Math.floor((1 / (oXCNExchangeRate / 1e28)))))}`);
  console.log('\n');

  // Liquidate a half of borrowed balance
  // https://docs.onyx.org/otokens/liquidate-borrow
  oXCN.liquidateBorrow(borrowerAddress, borrowedBalance.div(2), oXCN.address);

  await new Promise((resolve) => oXCN.on('LiquidateBorrow', async (liquidator, borrower, repayAmount, oTokenCollateral, seizeTokens) => {
    console.log(
      `Arguments received by LiquidateBorrow event:`, 
      `LiquidatorAddress: ${liquidator};`, 
      `BorrowerAddress: ${borrower};`,
      `RepayAmount: ${repayAmount};`, 
      `oTokenCollateralAddress: ${oTokenCollateral};`, 
      `seizeTokens: ${seizeTokens};`,
    );
    console.log(`Borrower account liquidity after liquidation: ${formatNumber((await Comptroller.getAccountLiquidity(borrowerAddress))[1] / 1e18)}`);
    console.log(`Borrower balance in XCN after liquidation: ${formatNumber(await oXCN.callStatic.borrowBalanceCurrent(borrowerAddress) / 1e18)}`);
    console.log(`Borrower balance locked for supply in XCN: ${formatNumber(await oXCN.callStatic.balanceOfUnderlying(borrowerAddress) / 1e18)}`);
    console.log(`XCN balance after liquidation: ${formatNumber(await XCN.balanceOf(signerAddress) / 1e18)}`);
    console.log(`XCN balance locked for supply after liquidation: ${formatNumber(await oXCN.callStatic.balanceOfUnderlying(signerAddress) / 1e18)}`);
    console.log(`Liquidator profit (current XCN locked for supply - liquidation cost): ${formatNumber((await oXCN.callStatic.balanceOfUnderlying(signerAddress) - borrowedBalance.div(2)) / 1e18)}`);
    resolve();
  }));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
