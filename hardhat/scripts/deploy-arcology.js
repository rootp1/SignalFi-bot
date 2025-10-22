const hre = require("hardhat");

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    const relayer = accounts[1] || deployer;
    const broadcaster = accounts[2] || deployer;

    console.log(`\n🚀 Deploying Arcology-Compatible Contracts`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance: ${ethers.utils.formatEther(await deployer.getBalance())} ARC`);
    console.log(`Relayer: ${relayer.address}`);
    console.log(`Broadcaster: ${broadcaster.address}\n`);

    // Deploy MockERC20 tokens
    console.log('====== Deploying Tokens ======');
    const ERC20Factory = await ethers.getContractFactory("MockERC20");

    console.log('Deploying USDC...');
    const usdc = await ERC20Factory.deploy("USD Coin", "USDC", 6);
    await usdc.deployed();
    console.log(`✅ USDC: ${usdc.address}`);

    console.log('Deploying WETH...');
    const weth = await ERC20Factory.deploy("Wrapped Ether", "WETH", 18);
    await weth.deployed();
    console.log(`✅ WETH: ${weth.address}`);

    // Deploy AmmContract
    console.log('\n====== Deploying AMM ======');
    const AmmFactory = await ethers.getContractFactory("AmmContract");
    const amm = await AmmFactory.deploy(usdc.address, weth.address);
    await amm.deployed();
    console.log(`✅ AmmContract: ${amm.address}`);

    // Deploy SettlementContract with Arcology support
    console.log('\n====== Deploying Arcology Settlement ======');
    const SettlementFactory = await ethers.getContractFactory("SettlementContractArcology");
    const settlement = await SettlementFactory.deploy(
        usdc.address,
        weth.address,
        amm.address,
        relayer.address,
        broadcaster.address
    );
    await settlement.deployed();
    console.log(`✅ SettlementContract: ${settlement.address}`);

    // Fund AMM with initial liquidity
    console.log('\n====== Funding AMM ======');
    console.log('Minting tokens...');
    await (await usdc.mint(deployer.address, ethers.utils.parseUnits("100000", 6))).wait();
    await (await weth.mint(deployer.address, ethers.utils.parseEther("50"))).wait();
    console.log('✅ Tokens minted');

    console.log('Approving tokens for AMM...');
    await (await usdc.approve(amm.address, ethers.utils.parseUnits("20000", 6))).wait();
    await (await weth.approve(amm.address, ethers.utils.parseEther("10"))).wait();
    console.log('✅ Tokens approved');

    console.log('Adding liquidity to AMM...');
    const tx = await amm.addLiquidity(
        ethers.utils.parseUnits("20000", 6),
        ethers.utils.parseEther("10")
    );
    await tx.wait();
    console.log('✅ Liquidity added');

    const reserves = await amm.getReserves();
    console.log(`   USDC Reserve: ${ethers.utils.formatUnits(reserves[0], 6)} USDC`);
    console.log(`   WETH Reserve: ${ethers.utils.formatEther(reserves[1])} WETH`);
    console.log(`   Price: ${ethers.utils.formatUnits(reserves[0], 6) / ethers.utils.formatEther(reserves[1])} USDC per WETH`);

    // Mint some test tokens for the deployer
    console.log('\n====== Minting Test Tokens ======');
    await (await usdc.mint(deployer.address, ethers.utils.parseUnits("10000", 6))).wait();
    await (await weth.mint(deployer.address, ethers.utils.parseEther("5"))).wait();
    console.log('✅ Test tokens minted for deployer');

    console.log('\n====== Deployment Complete ======');
    console.log(`\n📝 Contract Addresses (Arcology DevNet):\n`);
    console.log(`  USDC Token:     ${usdc.address}`);
    console.log(`  WETH Token:     ${weth.address}`);
    console.log(`  AMM Contract:   ${amm.address}`);
    console.log(`  Settlement:     ${settlement.address}`);
    console.log(`\n  Network Info\n`);
    console.log(`  Network:        Arcology Devnet`);
    console.log(`  Chain ID:       ${hre.network.config.chainId || 118} (0x76)`);
    console.log(`  RPC URL:        ${hre.network.config.url}`);
    console.log(`\n  Contract Status\n`);
    console.log(`  - ✅ USDC - Working (6 decimals)`);
    console.log(`  - ✅ WETH - Working (18 decimals)`);
    console.log(`  - ✅ AMM - Working with liquidity (20,000 USDC + 10 WETH)`);
    console.log(`  - ✅ Settlement - Deployed and ready (Arcology-compatible)`);
    console.log(`\n  All contracts are live and operational\n`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
