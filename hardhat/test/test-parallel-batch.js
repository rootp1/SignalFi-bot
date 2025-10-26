const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("🧪 ParallelBatchExecutor Tests", function() {
    let pyusd, weth, amm, executor, registry;
    let deployer, relayer, broadcaster, user1, user2, user3, user4, user5;
    let users;

    beforeEach(async function() {
        // Get signers
        [deployer, relayer, broadcaster, user1, user2, user3, user4, user5] = await ethers.getSigners();
        users = [user1, user2, user3, user4, user5];

        console.log('\n📦 Deploying contracts...');

        // Deploy MockPYUSD
        const MockPYUSD = await ethers.getContractFactory("MockPYUSD");
        pyusd = await MockPYUSD.deploy();
        console.log(`   ✅ MockPYUSD: ${pyusd.address}`);

        // Deploy WETH
        const ERC20 = await ethers.getContractFactory("MockERC20");
        weth = await ERC20.deploy("Wrapped Ether", "WETH", 18);
        console.log(`   ✅ WETH: ${weth.address}`);

        // Deploy AMM
        const AMM = await ethers.getContractFactory("AmmContract");
        amm = await AMM.deploy(pyusd.address, weth.address);
        console.log(`   ✅ AMM: ${amm.address}`);

        // Fund AMM with liquidity
        await pyusd.mint(deployer.address, ethers.utils.parseUnits("100000", 6));
        await weth.mint(deployer.address, ethers.utils.parseEther("50"));
        await pyusd.approve(amm.address, ethers.utils.parseUnits("20000", 6));
        await weth.approve(amm.address, ethers.utils.parseEther("10"));
        await amm.addLiquidity(
            ethers.utils.parseUnits("20000", 6),
            ethers.utils.parseEther("10")
        );
        console.log(`   ✅ AMM funded with liquidity`);

        // Deploy ParallelBatchExecutor
        const Executor = await ethers.getContractFactory("ParallelBatchExecutor");
        executor = await Executor.deploy(
            pyusd.address,
            weth.address,
            amm.address,
            relayer.address
        );
        console.log(`   ✅ ParallelBatchExecutor: ${executor.address}`);

        // Deploy BroadcasterRegistry
        const Registry = await ethers.getContractFactory("BroadcasterRegistry");
        registry = await Registry.deploy();
        console.log(`   ✅ BroadcasterRegistry: ${registry.address}`);
    });

    describe("✅ Deployment", function() {
        it("Should set the correct token addresses", async function() {
            expect(await executor.pyusd()).to.equal(pyusd.address);
            expect(await executor.weth()).to.equal(weth.address);
            expect(await executor.amm()).to.equal(amm.address);
        });

        it("Should set the correct relayer", async function() {
            expect(await executor.relayerAddress()).to.equal(relayer.address);
        });
    });

    describe("💰 Deposits & Withdrawals", function() {
        it("Should allow users to deposit PYUSD", async function() {
            const depositAmount = ethers.utils.parseUnits("1000", 6);
            
            // Mint PYUSD to user1
            await pyusd.mint(user1.address, depositAmount);
            
            // Approve executor
            await pyusd.connect(user1).approve(executor.address, depositAmount);
            
            // Deposit
            await expect(executor.connect(user1).deposit(depositAmount))
                .to.emit(executor, "Deposit")
                .withArgs(user1.address, depositAmount, await ethers.provider.getBlockNumber() + 1);
            
            // Check balance
            const balance = await executor.getPYUSDBalance(user1.address);
            expect(balance).to.equal(depositAmount);
        });

        it("Should allow users to withdraw PYUSD", async function() {
            const depositAmount = ethers.utils.parseUnits("1000", 6);
            const withdrawAmount = ethers.utils.parseUnits("500", 6);
            
            // Setup: deposit first
            await pyusd.mint(user1.address, depositAmount);
            await pyusd.connect(user1).approve(executor.address, depositAmount);
            await executor.connect(user1).deposit(depositAmount);
            
            // Withdraw
            await expect(executor.connect(user1).withdraw(withdrawAmount))
                .to.emit(executor, "Withdraw");
            
            // Check remaining balance
            const balance = await executor.getPYUSDBalance(user1.address);
            expect(balance).to.equal(depositAmount.sub(withdrawAmount));
        });

        it("Should reject deposits below minimum", async function() {
            const tooSmall = ethers.utils.parseUnits("0.5", 6);
            await pyusd.mint(user1.address, tooSmall);
            await pyusd.connect(user1).approve(executor.address, tooSmall);
            
            await expect(
                executor.connect(user1).deposit(tooSmall)
            ).to.be.revertedWith("Amount too small");
        });
    });

    describe("⚡ Parallel Batch Execution - BUY", function() {
        beforeEach(async function() {
            // Fund all test users with PYUSD and deposit to executor
            for (let i = 0; i < users.length; i++) {
                const amount = ethers.utils.parseUnits("1000", 6);
                await pyusd.mint(users[i].address, amount);
                await pyusd.connect(users[i]).approve(executor.address, amount);
                await executor.connect(users[i]).deposit(amount);
            }
        });

        it("Should execute batch BUY for 5 users in parallel", async function() {
            console.log('\n🔥 Testing Parallel Batch BUY Execution...');
            
            const userAddresses = users.map(u => u.address);
            const amounts = users.map(() => ethers.utils.parseUnits("100", 6)); // Each user trades 100 PYUSD
            
            console.log(`   👥 Users: ${userAddresses.length}`);
            console.log(`   💵 Amount per user: 100 PYUSD`);
            console.log(`   💰 Total volume: 500 PYUSD`);
            
            // Execute batch
            const tx = await executor.connect(relayer).executeBatchBuy(userAddresses, amounts);
            const receipt = await tx.wait();
            
            console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);
            console.log(`   📊 Gas per user: ${receipt.gasUsed.div(users.length).toString()}`);
            
            // Verify all users received WETH
            for (let i = 0; i < users.length; i++) {
                const wethBalance = await executor.getWETHBalance(users[i].address);
                expect(wethBalance).to.be.gt(0);
                console.log(`   ✅ User ${i + 1} WETH balance: ${ethers.utils.formatEther(wethBalance)}`);
            }
            
            // Verify event emitted
            const batchEvent = receipt.events.find(e => e.event === "BatchExecuted");
            expect(batchEvent).to.not.be.undefined;
            expect(batchEvent.args.userCount).to.equal(users.length);
        });

        it("Should give all users the same execution price", async function() {
            const userAddresses = users.map(u => u.address);
            const amounts = users.map(() => ethers.utils.parseUnits("100", 6));
            
            await executor.connect(relayer).executeBatchBuy(userAddresses, amounts);
            
            // Get WETH balances for all users
            const wethBalances = await Promise.all(
                users.map(u => executor.getWETHBalance(u.address))
            );
            
            // All balances should be equal (same execution price!)
            for (let i = 1; i < wethBalances.length; i++) {
                expect(wethBalances[i]).to.equal(wethBalances[0]);
            }
            
            console.log(`   ✅ All users got same price: ${ethers.utils.formatEther(wethBalances[0])} WETH`);
        });

        it("Should reject batch with mismatched arrays", async function() {
            const userAddresses = [user1.address, user2.address];
            const amounts = [ethers.utils.parseUnits("100", 6)]; // Only 1 amount
            
            await expect(
                executor.connect(relayer).executeBatchBuy(userAddresses, amounts)
            ).to.be.revertedWith("Length mismatch");
        });

        it("Should reject batch from non-relayer", async function() {
            const userAddresses = [user1.address];
            const amounts = [ethers.utils.parseUnits("100", 6)];
            
            await expect(
                executor.connect(user1).executeBatchBuy(userAddresses, amounts)
            ).to.be.revertedWith("Only relayer");
        });
    });

    describe("⚡ Parallel Batch Execution - SELL", function() {
        beforeEach(async function() {
            // Fund users with PYUSD and execute a BUY first
            for (let i = 0; i < users.length; i++) {
                const amount = ethers.utils.parseUnits("1000", 6);
                await pyusd.mint(users[i].address, amount);
                await pyusd.connect(users[i]).approve(executor.address, amount);
                await executor.connect(users[i]).deposit(amount);
            }
            
            // Execute batch BUY to get WETH
            const userAddresses = users.map(u => u.address);
            const amounts = users.map(() => ethers.utils.parseUnits("500", 6));
            await executor.connect(relayer).executeBatchBuy(userAddresses, amounts);
        });

        it("Should execute batch SELL for 5 users in parallel", async function() {
            console.log('\n🔥 Testing Parallel Batch SELL Execution...');
            
            const userAddresses = users.map(u => u.address);
            
            // Get WETH balances
            const wethBalances = await Promise.all(
                users.map(u => executor.getWETHBalance(u.address))
            );
            
            console.log(`   👥 Users: ${userAddresses.length}`);
            console.log(`   💎 WETH per user: ${ethers.utils.formatEther(wethBalances[0])}`);
            
            // Sell all WETH
            const tx = await executor.connect(relayer).executeBatchSell(userAddresses, wethBalances);
            const receipt = await tx.wait();
            
            console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);
            
            // Verify all users received PYUSD
            for (let i = 0; i < users.length; i++) {
                const pyusdBalance = await executor.getPYUSDBalance(users[i].address);
                expect(pyusdBalance).to.be.gt(0);
                console.log(`   ✅ User ${i + 1} PYUSD balance: ${ethers.utils.formatUnits(pyusdBalance, 6)}`);
            }
        });
    });

    describe("📊 Portfolio Tracking", function() {
        it("Should calculate portfolio value correctly", async function() {
            const depositAmount = ethers.utils.parseUnits("1000", 6);
            
            // Deposit
            await pyusd.mint(user1.address, depositAmount);
            await pyusd.connect(user1).approve(executor.address, depositAmount);
            await executor.connect(user1).deposit(depositAmount);
            
            // Check portfolio (should be equal to PYUSD balance initially)
            let portfolio = await executor.getPortfolioValue(user1.address);
            expect(portfolio).to.equal(depositAmount);
            
            // Execute a trade
            await executor.connect(relayer).executeBatchBuy(
                [user1.address],
                [ethers.utils.parseUnits("500", 6)]
            );
            
            // Portfolio should still have value (PYUSD + WETH in PYUSD terms)
            portfolio = await executor.getPortfolioValue(user1.address);
            expect(portfolio).to.be.gt(0);
            
            console.log(`   📊 Portfolio value: ${ethers.utils.formatUnits(portfolio, 6)} PYUSD`);
        });
    });

    describe("🔐 Access Control", function() {
        it("Should allow owner to update relayer", async function() {
            const newRelayer = user1.address;
            await executor.updateRelayer(newRelayer);
            expect(await executor.relayerAddress()).to.equal(newRelayer);
        });

        it("Should reject relayer update from non-owner", async function() {
            await expect(
                executor.connect(user1).updateRelayer(user2.address)
            ).to.be.revertedWith("Only owner");
        });
    });
});
