const { ethers, network } = require("hardhat");
const oXCNAbi = require("./../abi/oXCN.json");
const XCNAbi = require("./../abi/XCN.json");
const ComptrollerAbi = require("./../abi/Comptroller.json");
require("dotenv").config();

async function liquidate() {
  const borrowerAddress = process.env.XCN_BORROWER_ADDRESS
  const signerAddress = process.env.XCN_ADDRESS
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

  const oXCN = await ethers.getContractAt(oXCNAbi, "0x1961AD247B47F4f2242E55a0E5578C6cf01F8D12", signer)
  const XCN = await ethers.getContractAt(XCNAbi, "0xA2cd3D43c775978A96BdBf12d733D5A1ED94fb18", signer)
  const Comptroller = await ethers.getContractAt(ComptrollerAbi, "0x7D61ed92a6778f5ABf5c94085739f1EDAbec2800", signer)

  await Comptroller.enterMarkets([oXCN.address])

  const bank = await XCN.balanceOf(signerAddress)
  const oXCNExchangeRate = await oXCN.callStatic.exchangeRateCurrent()
  console.log('1 oXCN = XCN:', oXCNExchangeRate / 1e28)
  console.log('1 XCN = oXCN:', (1 / (oXCNExchangeRate / 1e28)))

  await XCN.approve(oXCN.address, bank)
  await XCN.approve(Comptroller.address, bank)

  console.log('XCN balance:', await XCN.balanceOf(signerAddress))
  console.log('XCN balance locked for supply:', await oXCN.callStatic.balanceOfUnderlying(signerAddress))
  console.log('Borrower account liquidity:', await Comptroller.getAccountLiquidity(borrowerAddress))
  console.log('Borrower assets in (XCN):', await Comptroller.getAssetsIn(borrowerAddress))

  const borrowedBalance = await oXCN.callStatic.borrowBalanceCurrent(borrowerAddress)
  console.log('Borrower balance in XCN:', borrowedBalance)
  console.log('Borrower balance in oXCN:', borrowedBalance.mul(Math.floor((1 / (oXCNExchangeRate / 1e28)))))


  oXCN.liquidateBorrow(borrowerAddress, borrowedBalance.div(2), oXCN.address)

  await new Promise((resolve) => oXCN.on("LiquidateBorrow", async (...args) => {
    console.log("Event LiquidateBorrow:", args)
    console.log('Borrower account liquidity after liquidation:', await Comptroller.getAccountLiquidity(borrowerAddress))
    console.log('Borrower balance in XCN after liquidation:', borrowedBalance)
    console.log('XCN balance after liquidation:', await XCN.balanceOf(signerAddress))
    console.log('XCN balance locked for supply after liquidation:', await oXCN.callStatic.balanceOfUnderlying(signerAddress))
    resolve()
  }))
}

async function send() {
  await liquidate();
}

send()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
