require('dotenv').config();
const { ethers } = require("ethers");

// ✅ Load environment variables
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const gasSponsorWallet = new ethers.Wallet(process.env.GAS_SPONSOR_PRIVATE_KEY, provider);

async function claimAirdrop(wallet, airdropContractAddress, safeWallet) {
    try {
        console.log(`🚀 Attempting to claim airdrop for wallet: ${wallet.address}`);

        // ✅ Define the airdrop contract ABI (Modify based on the actual contract)
        const airdropABI = [
            "function claim() public",
            "function claimTokens() public",
            "function claimAirdrop(address beneficiary) public",
            "function transfer(address to, uint256 amount) public returns (bool)", // ERC-20 Transfer
            "function balanceOf(address owner) view returns (uint256)" // Balance check
        ];

        const airdropContract = new ethers.Contract(airdropContractAddress, airdropABI, wallet);

        // ✅ Claim the airdrop
        let tx;
        if (await airdropContract.claim) {
            tx = await airdropContract.populateTransaction.claim();
        } else if (await airdropContract.claimTokens) {
            tx = await airdropContract.populateTransaction.claimTokens();
        } else if (await airdropContract.claimAirdrop) {
            tx = await airdropContract.populateTransaction.claimAirdrop(wallet.address);
        } else {
            console.log("❌ No valid claim function found in contract.");
            return;
        }

        // ✅ Sponsor pays gas for the claim transaction
        tx.from = wallet.address;
        tx.gasLimit = await provider.estimateGas(tx);
        const signedTx = await gasSponsorWallet.sendTransaction(tx);
        await signedTx.wait();
        console.log("✅ Airdrop claimed successfully!");

        // ✅ Check airdrop token balance
        const balance = await airdropContract.balanceOf(wallet.address);
        console.log(`💰 Airdrop Balance: ${ethers.formatUnits(balance, 18)} tokens`);

        if (balance.gt(0)) {
            // ✅ Sponsor pays gas for transfer to Safe Wallet
            const transferTx = await airdropContract.populateTransaction.transfer(safeWallet, balance);
            transferTx.from = wallet.address;
            transferTx.gasLimit = await provider.estimateGas(transferTx);

            const signedTransferTx = await gasSponsorWallet.sendTransaction(transferTx);
            await signedTransferTx.wait();
            console.log(`✅ Airdrop successfully sent to safe wallet: ${safeWallet}`);
        } else {
            console.log("⚠️ No airdrop tokens to transfer.");
        }
    } catch (error) {
        console.error("❌ Error claiming or transferring airdrop:", error);
    }
}

module.exports = { claimAirdrop };
