const hre = require("hardhat");

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    const relayer = accounts[1] || deployer; // Use deployer if no second account
    const broadcaster = accounts[2] || deployer; // Use deployer if no third account

    console.log(`Deploying with account: ${deployer.address}`);
    console.log(`Account balance: ${await deployer.getBalance()}`);
    console.log(`Relayer account: ${relayer.address}`);
    console.log(`Broadcaster account: ${broadcaster.address}`);

    // Deploy MockERC20 tokens
    console.log('\n====== Deploying Tokens ======');
    const ERC20Factory = await ethers.getContractFactory("MockERC20");

    const usdc = await ERC20Factory.deploy("USD Coin", "USDC", 6);
    await usdc.deployed();
    console.log(`USDC: ${usdc.address}`);

    const weth = await ERC20Factory.deploy("Wrapped Ether", "WETH", 18);
    await weth.deployed();
    console.log(`WETH: ${weth.address}`);

    // Deploy AmmContract
    console.log('\n====== Deploying AMM ======');
    const AmmFactory = await ethers.getContractFactory("AmmContract");
    const amm = await AmmFactory.deploy(usdc.address, weth.address);
    await amm.deployed();
    console.log(`AmmContract: ${amm.address}`);

    // Deploy SettlementContract
    console.log('\n====== Deploying Settlement ======');
    const SettlementFactory = await ethers.getContractFactory("SettlementContract");
    const settlement = await SettlementFactory.deploy(
        usdc.address,
        weth.address,
        amm.address,
        relayer.address,
        broadcaster.address
    );
    await settlement.deployed();
    console.log(`SettlementContract: ${settlement.address}`);

    // Deploy ARCFaucet
    console.log('\n====== Deploying ARC Faucet ======');
    const FaucetFactory = await ethers.getContractFactory("ARCFaucet");
    const arcFaucet = await FaucetFactory.deploy();
    await arcFaucet.deployed();
    console.log(`ARCFaucet: ${arcFaucet.address}`);

    // Fund AMM with initial liquidity
    console.log('\n====== Funding AMM ======');
    console.log('Minting tokens...');
    await (await usdc.mint(deployer.address, ethers.utils.parseUnits("50000", 6))).wait();
    await (await weth.mint(deployer.address, ethers.utils.parseEther("25"))).wait();

    console.log('Approving tokens...');
    await (await usdc.approve(amm.address, ethers.utils.parseUnits("20000", 6))).wait();
    await (await weth.approve(amm.address, ethers.utils.parseEther("10"))).wait();

    console.log('Adding liquidity...');
    const tx = await amm.addLiquidity(
        ethers.utils.parseUnits("20000", 6),
        ethers.utils.parseEther("10")
    );
    await tx.wait();
    console.log('Liquidity added successfully!');

    const reserves = await amm.getReserves();
    console.log(`AMM Liquidity: ${reserves[0]} USDC, ${ethers.utils.formatEther(reserves[1])} WETH`);
    console.log(`Initial Price: ${reserves[0] / ethers.utils.formatEther(reserves[1])} USDC per WETH`);

    // Fund ARC Faucet
    console.log('\n====== Funding ARC Faucet ======');
    const faucetFundAmount = ethers.utils.parseEther("1000"); // Fund with 1000 ARC
    const fundTx = await arcFaucet.fundFaucet({
        value: faucetFundAmount,
        gasLimit: 100000
    });
    console.log('Funding transaction sent...');
    await fundTx.wait();
    const faucetBalance = await ethers.provider.getBalance(arcFaucet.address);
    console.log(`Faucet funded with: ${ethers.utils.formatEther(faucetBalance)} ARC`);
    console.log(`This allows ${ethers.utils.formatEther(faucetBalance) / 10} users to claim 10 ARC each`);

    console.log('\n====== Deployment Complete ======');
    console.log(`Network: ${hre.network.name}`);
    console.log(`\nContract Addresses:`);
    console.log(`USDC: ${usdc.address}`);
    console.log(`WETH: ${weth.address}`);
    console.log(`AMM: ${amm.address}`);
    console.log(`Settlement: ${settlement.address}`);
    console.log(`ARCFaucet: ${arcFaucet.address}`);
    console.log(`\nRelayer: ${relayer.address}`);
    console.log(`Broadcaster: ${broadcaster.address}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
