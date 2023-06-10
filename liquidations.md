### How to liquidate a borrow step-by-step  

In this example we will liquidate a borrow based on oXCN (XCN) asset underlying for ``0xb5Cd64ba87E6f7FBD356b517BB7a279040C8Ac2a`` address.  
We must have some XCN tokens to liquidate a borrow.  

### Preparations:  
Enter markets with borrow-asset:  
``await Comptroller.enterMarkets([oXCN.address])``  

Allow oTokens contract and Comptroller to transfer tokens:  
``await XCN.approve(oXCN.address, bank)``  
``await XCN.approve(Comptroller.address, bank)``  

Let's check our oXCN balance:  
``await oXCN.callStatic.balanceOfUnderlying(signerAddress)`` - 0 ($0)  

``await Comptroller.getAccountLiquidity(borrowerAddress)`` - check borrower account liquidity, it's negative, that's allows us to liquidate his borrow.  
``await Comptroller.getAssetsIn(borrowerAddress)`` - returns address of oXCN, it means borrow is supplied by oXCN tokens.  

### Liquidate borrow
Get borrow balance in underlying token (XCN):  
``const borrowedBalance = await oXCN.callStatic.borrowBalanceCurrent(borrowerAddress)``  

Liquidate a half of borrowed balance:  
```oXCN.liquidateBorrow(borrowerAddress, borrowedBalance.div(2), oXCN.address)```  


After emitted event ``LiquidateBorrow`` which means successful borrow liquidation we can check balances:  
Borrower account liquidity increased due to our liquidation  
``await XCN.balanceOf(signerAddress)`` - our XCN balance decreased due to spending XCN tokens to liquidate half of the borrow  
``await oXCN.callStatic.balanceOfUnderlying(signerAddress)`` - our oXCN balance increased (spent XCN tokens for liquidation + seized oXCN from borrower collateral)  
