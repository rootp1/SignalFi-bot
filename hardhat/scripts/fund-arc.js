const hre = require("hardhat");

async function main() {
    const [funder] = await ethers.getSigners();

    console.log(`Funding from account: ${funder.address}`);
    console.log(`Account balance: ${ethers.utils.formatEther(await funder.getBalance())} ARC\n`);

    // Get recipient address from command line or use default
    const recipient = process.env.RECIPIENT || process.argv[2];

    if (!recipient) {
        console.error("Usage: npx hardhat run scripts/fund-arc.js --network TestnetInfo <recipient-address>");
        console.error("Or set RECIPIENT env variable");
        process.exit(1);
    }

    console.log(`Sending 10 ARC to: ${recipient}`);

    const tx = await funder.sendTransaction({
        to: recipient,
        value: ethers.utils.parseEther("10"),
        gasLimit: 21000
    });

    console.log(`Transaction hash: ${tx.hash}`);
    console.log(`Waiting for confirmation...`);

    await tx.wait();

    console.log(`✅ Successfully sent 10 ARC!`);

    const newBalance = await ethers.provider.getBalance(recipient);
    console.log(`Recipient new balance: ${ethers.utils.formatEther(newBalance)} ARC`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
