const hre = require("hardhat");
const frontendUtil = require('@arcologynetwork/frontend-util/utils/util');
const { expect } = require("chai");

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    const trader1 = accounts[1];
    const trader2 = accounts[2];
    const relayer = accounts[3];
    const broadcaster = accounts[4];

    console.log('====== Deploying Contracts ======');

    // Deploy MockERC20 tokens
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const usdc = await ERC20Factory.deploy("USD Coin", "USDC", 6);
    await usdc.deployed();
    console.log(`USDC deployed at ${usdc.address}`);

    const weth = await ERC20Factory.deploy("Wrapped Ether", "WETH", 18);
    await weth.deployed();
    console.log(`WETH deployed at ${weth.address}`);

    // Deploy AmmContract
    const AmmFactory = await ethers.getContractFactory("AmmContract");
    const amm = await AmmFactory.deploy(usdc.address, weth.address);
    await amm.deployed();
    console.log(`AMM deployed at ${amm.address}`);

    // Deploy SettlementContract
    const SettlementFactory = await ethers.getContractFactory("SettlementContract");
    const settlement = await SettlementFactory.deploy(
        usdc.address,
        weth.address,
        amm.address,
        relayer.address,
        broadcaster.address
    );
    await settlement.deployed();
    console.log(`Settlement deployed at ${settlement.address}`);

    console.log('====== Funding AMM ======');

    // Mint tokens to deployer
    await usdc.mint(deployer.address, ethers.utils.parseUnits("100000", 6));
    await weth.mint(deployer.address, ethers.utils.parseEther("50"));

    // Add liquidity to AMM (20,000 USDC : 10 WETH = 2000 USDC per WETH)
    await usdc.approve(amm.address, ethers.utils.parseUnits("20000", 6));
    await weth.approve(amm.address, ethers.utils.parseEther("10"));
    await amm.addLiquidity(ethers.utils.parseUnits("20000", 6), ethers.utils.parseEther("10"));

    const reserves = await amm.getReserves();
    console.log(`AMM Reserves: ${reserves[0]} USDC, ${ethers.utils.formatEther(reserves[1])} WETH`);

    console.log('====== Testing Deposits ======');

    // Mint and deposit for traders
    await usdc.mint(trader1.address, ethers.utils.parseUnits("5000", 6));
    await usdc.mint(trader2.address, ethers.utils.parseUnits("5000", 6));

    await usdc.connect(trader1).approve(settlement.address, ethers.utils.parseUnits("5000", 6));
    await usdc.connect(trader2).approve(settlement.address, ethers.utils.parseUnits("5000", 6));

    await settlement.connect(trader1).deposit(ethers.utils.parseUnits("5000", 6));
    await settlement.connect(trader2).deposit(ethers.utils.parseUnits("5000", 6));

    console.log(`Trader1 deposit: ${await settlement.getDeposit(trader1.address)}`);
    console.log(`Trader2 deposit: ${await settlement.getDeposit(trader2.address)}`);

    expect(await settlement.getDeposit(trader1.address)).to.equal(ethers.utils.parseUnits("5000", 6));
    expect(await settlement.getDeposit(trader2.address)).to.equal(ethers.utils.parseUnits("5000", 6));

    console.log('====== Testing Concurrent Deposits ======');

    // Mint more tokens for concurrent testing
    for (let i = 5; i <= 10; i++) {
        await usdc.mint(accounts[i].address, ethers.utils.parseUnits("1000", 6));
        await usdc.connect(accounts[i]).approve(settlement.address, ethers.utils.parseUnits("1000", 6));
    }

    // Create concurrent deposit transactions
    let depositTxs = [];
    for (let i = 5; i <= 10; i++) {
        depositTxs.push(frontendUtil.generateTx(function([settlement, account, amount]) {
            return settlement.connect(account).deposit(amount);
        }, settlement, accounts[i], ethers.utils.parseUnits("1000", 6)));
    }

    await frontendUtil.waitingTxs(depositTxs);

    console.log('====== Verifying Concurrent Deposits ======');
    for (let i = 5; i <= 10; i++) {
        const balance = await settlement.getDeposit(accounts[i].address);
        console.log(`Account ${i} deposit: ${balance}`);
        expect(balance).to.equal(ethers.utils.parseUnits("1000", 6));
    }

    console.log('====== Testing AMM Swap ======');

    // Test a simple swap
    const swapAmountIn = ethers.utils.parseUnits("1000", 6); // 1000 USDC
    const expectedOut = await amm.getAmountOut(swapAmountIn, usdc.address, weth.address);
    console.log(`Expected WETH output for 1000 USDC: ${ethers.utils.formatEther(expectedOut)}`);

    // Mint USDC for deployer to test swap
    await usdc.mint(deployer.address, swapAmountIn);
    await usdc.approve(amm.address, swapAmountIn);

    const wethBalanceBefore = await weth.balanceOf(deployer.address);
    await amm.swap(usdc.address, swapAmountIn, weth.address, 0);
    const wethBalanceAfter = await weth.balanceOf(deployer.address);

    const actualOut = wethBalanceAfter.sub(wethBalanceBefore);
    console.log(`Actual WETH received: ${ethers.utils.formatEther(actualOut)}`);
    expect(actualOut).to.equal(expectedOut);

    console.log('====== Testing Withdrawal ======');

    // Helper function to sign withdrawal message
    async function signWithdrawal(signer, user, amount) {
        const messageHash = ethers.utils.solidityKeccak256(
            ['address', 'uint256'],
            [user, amount]
        );
        const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));
        const sig = ethers.utils.splitSignature(signature);

        return ethers.utils.defaultAbiCoder.encode(
            ['address', 'uint256', 'uint8', 'bytes32', 'bytes32'],
            [user, amount, sig.v, sig.r, sig.s]
        );
    }

    const withdrawAmount = ethers.utils.parseUnits("100", 6);
    const trader1BalanceBefore = await usdc.balanceOf(trader1.address);

    const signedWithdrawal = await signWithdrawal(trader1, trader1.address, withdrawAmount);
    await settlement.forceWithdraw(signedWithdrawal);

    const trader1BalanceAfter = await usdc.balanceOf(trader1.address);
    console.log(`Trader1 withdrew: ${trader1BalanceAfter.sub(trader1BalanceBefore)}`);
    expect(trader1BalanceAfter.sub(trader1BalanceBefore)).to.equal(withdrawAmount);

    const trader1DepositAfter = await settlement.getDeposit(trader1.address);
    console.log(`Trader1 deposit after withdrawal: ${trader1DepositAfter}`);
    expect(trader1DepositAfter).to.equal(ethers.utils.parseUnits("4900", 6));

    console.log('====== All Tests Passed Successfully! ======');
    console.log('\nContract Addresses:');
    console.log(`USDC: ${usdc.address}`);
    console.log(`WETH: ${weth.address}`);
    console.log(`AMM: ${amm.address}`);
    console.log(`Settlement: ${settlement.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
