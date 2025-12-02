const hre = require("hardhat");

async function main() {
    const [funder] = await ethers.getSigners();

    console.log(`Funding from account: ${funder.address}`);
    console.log(`Account balance: ${ethers.utils.formatEther(await funder.getBalance())} ARC\n`);

    // Recipients to fund
    const recipients = [
        "0xd58a87ce124cf81b2bf483879c59f5d91d67ece7",
        "0xB2D55A17F61AF0b6C40ed8D9F90a11C7cddb238E"
    ];

    const amountToSend = ethers.utils.parseEther("10");

    for (const recipient of recipients) {
        console.log(`\nSending 10 ARC to: ${recipient}`);

        // Check balance before
        const balanceBefore = await ethers.provider.getBalance(recipient);
        console.log(`Balance before: ${ethers.utils.formatEther(balanceBefore)} ARC`);

        const tx = await funder.sendTransaction({
            to: recipient,
            value: amountToSend,
            gasLimit: 21000
        });

        console.log(`Transaction hash: ${tx.hash}`);
        console.log(`Waiting for confirmation...`);

        await tx.wait();

        console.log(`✅ Successfully sent 10 ARC!`);

        // Check balance after
        const balanceAfter = await ethers.provider.getBalance(recipient);
        console.log(`Balance after: ${ethers.utils.formatEther(balanceAfter)} ARC`);
    }

    console.log(`\n✅ All transfers completed!`);
    
    // Show final funder balance
    const finalBalance = await funder.getBalance();
    console.log(`\nFunder final balance: ${ethers.utils.formatEther(finalBalance)} ARC`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
