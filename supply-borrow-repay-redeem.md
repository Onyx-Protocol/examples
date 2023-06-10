## Supply-Borrow-Repay-Redeem step by step  

### Preparations:  
Enter markets for supply, borrow oTokens:  
``await Comptroller.enterMarkets([oUSDC.address, oUSDT.address])``  

Allow oTokens contracts to transfer tokens:  
``await USDC.approve(oUSDC.address, bank)``  
``await USDT.approve(oUSDT.address, bank)``  

### Supply:  
To supply USDC we need to mint oTokens:  
``oUSDC.mint(100_000000)``  
Where ``100_000000`` - amount in underlying asset (USDC) equals $100 (USDC has 6 decimals)  

After emitted event ``Mint`` which means successful mint we can check balances:  
``await USDC.balanceOf(signerAddress)`` - balance $100 less (because of minting)  
``await oUSDC.callStatic.balanceOfUnderlying(signerAddress)`` - ``100_000000`` tokens ($100)  

Now every mined block we will receive additional oTokens due to supply rate:  
``await oUSDC.callStatic.supplyRatePerBlock()``  

Our account liquidity (how many tokens we can borrow in USD):  
``await Comptroller.callStatic.getAccountLiquidity(signerAddress)``  
Shows us $80 because of collateral factor. For USDC now it's 80%:  
``await Comptroller.callStatic.markets(oUSDC.address)``  

### Borrow:  
Now we need to borrow 50 USDT tokens:  
``oUSDT.borrow(50_000000)``  
Where ``50_000000`` - amount in underlying asset (USDT) equals $50 (USDT has 6 decimals)  

After emitted event ``Borrow`` which means successful borrow we can check balances:  
``await USDT.balanceOf(signerAddress)`` - ``50_000000`` tokens ($50)  
Account liquidity decreased to $30  
``await oUSDT.callStatic.borrowBalanceCurrent(signerAddress)`` - ``50_000000`` ($50), shows us borrow balance in underlying asset  

Now every mined block our borrow balance will increase due to borrow rate:  
``await oUSDC.callStatic.borrowRatePerBlock()``  

### Repay:  
Now we need to repay the borrow:  
``oUSDT.repayBorrow(ethers.constants.MaxUint256)`` where it could be amount in underlying asset or ``MaxUint256`` to repay borrow fully   

After emitted event ``RepayBorrow`` which means successful repay we can check balances:  
``await USDT.balanceOf(signerAddress)`` - 0 ($0)  
``await Comptroller.callStatic.getAccountLiquidity(signerAddress)`` - recovered to $80  
``await oUSDT.callStatic.borrowBalanceCurrent(signerAddress)`` - 0 ($0)  

### Redeem:  
Now we need to redeem supplied oUSDC:  
``oUSDC.redeemUnderlying(100_000000)``  

After emitted event ``Redeem`` which means successful redeem we can check balances:  
``await USDC.balanceOf(signerAddress)`` - 100_000000 ($100)  
``await oUSDC.callStatic.balanceOfUnderlying(signerAddress)`` - 0 ($0)  

Now we have zero-like account liquidity because of redeemed supplied oTokens, we can't borrow assets anymore  
