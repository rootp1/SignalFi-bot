const hre = require("hardhat");
const { ethers } = require("hardhat");

// Deployed contract addresses
const USDC_ADDRESS = '0xfbC451FBd7E17a1e7B18347337657c1F2c52B631';
const WETH_ADDRESS = '0x2249977665260A63307Cf72a4D65385cC0817CB5';
const AMM_ADDRESS = '0x663536Ee9E60866DC936D2D65c535e795f4582D1';

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];

    console.log('\n====== Adding Liquidity to AMM ======');
    console.log(`Using account: ${deployer.address}`);
    console.log(`Account balance: ${ethers.utils.formatEther(await deployer.getBalance())} ARC\n`);

    // Get contract instances
    console.log('Connecting to contracts...');
    const usdc = await ethers.getContractAt("MockERC20", USDC_ADDRESS);
    const weth = await ethers.getContractAt("MockERC20", WETH_ADDRESS);
    const amm = await ethers.getContractAt("AmmContract", AMM_ADDRESS);
    console.log('✅ Connected to all contracts\n');

    // Check current reserves
    console.log('Current AMM status:');
    const [reserve0Before, reserve1Before] = await amm.getReserves();
    console.log(`USDC Reserve: ${ethers.utils.formatUnits(reserve0Before, 6)}`);
    console.log(`WETH Reserve: ${ethers.utils.formatEther(reserve1Before)}\n`);

    // Define liquidity amounts
    const USDC_AMOUNT = ethers.utils.parseUnits("20000", 6);  // 20,000 USDC
    const WETH_AMOUNT = ethers.utils.parseEther("10");        // 10 WETH

    console.log('Liquidity to add:');
    console.log(`USDC: ${ethers.utils.formatUnits(USDC_AMOUNT, 6)}`);
    console.log(`WETH: ${ethers.utils.formatEther(WETH_AMOUNT)}\n`);

    // Check current balances
    const usdcBalance = await usdc.balanceOf(deployer.address);
    const wethBalance = await weth.balanceOf(deployer.address);
    console.log('Current deployer balances:');
    console.log(`USDC: ${ethers.utils.formatUnits(usdcBalance, 6)}`);
    console.log(`WETH: ${ethers.utils.formatEther(wethBalance)}\n`);

    // Mint tokens if needed
    if (usdcBalance.lt(USDC_AMOUNT)) {
        console.log('Minting USDC...');
        const mintTx = await usdc.mint(deployer.address, USDC_AMOUNT);
        await mintTx.wait();
        console.log('✅ USDC minted\n');
    } else {
        console.log('✅ Sufficient USDC balance\n');
    }

    if (wethBalance.lt(WETH_AMOUNT)) {
        console.log('Minting WETH...');
        const mintTx = await weth.mint(deployer.address, WETH_AMOUNT);
        await mintTx.wait();
        console.log('✅ WETH minted\n');
    } else {
        console.log('✅ Sufficient WETH balance\n');
    }

    // Approve AMM to spend tokens
    console.log('Approving tokens...');

    const usdcApproval = await usdc.approve(AMM_ADDRESS, USDC_AMOUNT);
    await usdcApproval.wait();
    console.log('✅ USDC approved');

    const wethApproval = await weth.approve(AMM_ADDRESS, WETH_AMOUNT);
    await wethApproval.wait();
    console.log('✅ WETH approved\n');

    // Add liquidity
    console.log('Adding liquidity to AMM...');
    const addLiquidityTx = await amm.addLiquidity(USDC_AMOUNT, WETH_AMOUNT, {
        gasLimit: 500000
    });
    console.log(`Transaction sent: ${addLiquidityTx.hash}`);

    const receipt = await addLiquidityTx.wait();
    console.log(`✅ Liquidity added! Block: ${receipt.blockNumber}\n`);

    // Check new reserves
    console.log('New AMM status:');
    const [reserve0After, reserve1After] = await amm.getReserves();
    console.log(`USDC Reserve: ${ethers.utils.formatUnits(reserve0After, 6)} USDC`);
    console.log(`WETH Reserve: ${ethers.utils.formatEther(reserve1After)} WETH`);

    // Calculate price
    const price = parseFloat(ethers.utils.formatUnits(reserve0After, 6)) / parseFloat(ethers.utils.formatEther(reserve1After));
    console.log(`Price: ${price.toFixed(2)} USDC per WETH\n`);

    console.log('====== Liquidity Addition Complete ======');
    console.log('✅ AMM is now ready for trading!');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
