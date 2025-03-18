require('dotenv').config();
const { ethers } = require("ethers");

// ✅ Load environment variables
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const gasSponsorWallet = new ethers.Wallet(process.env.GAS_SPONSOR_PRIVATE_KEY, provider);

// ✅ Recover ETH using sponsor wallet for gas
async function recoverETH(wallet, safeWallet) {
    try {
        const balance = await wallet.getBalance();
        if (balance.gt(ethers.parseEther("0.0001"))) { // Ensure enough ETH for gas fees
            console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH`);

            // ✅ Sponsor signs & pays for the transaction
            const tx = {
                to: safeWallet,
                value: balance,
                gasLimit: 21000
            };

            const signedTx = await gasSponsorWallet.sendTransaction({ ...tx, from: wallet.address });
            await signedTx.wait();

            console.log("✅ ETH successfully transferred using sponsor wallet for gas.");
        } else {
            console.log("⚠️ Wallet has insufficient ETH for recovery.");
        }
    } catch (error) {
        console.error("❌ Error recovering ETH:", error);
    }
}

// ✅ Recover ERC-20 using sponsor wallet for gas
async function recoverERC20(wallet, tokenAddress, safeWallet) {
    try {
        const tokenABI = [
            "function balanceOf(address) view returns (uint256)",
            "function transfer(address to, uint256 amount) public returns (bool)"
        ];
        const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
        const balance = await tokenContract.balanceOf(wallet.address);

        if (balance.gt(0)) {
            console.log(`💎 ERC-20 Token Balance: ${ethers.formatUnits(balance, 18)} Tokens`);

            // ✅ Sponsor pays gas, hacked wallet signs transaction
            const tx = await tokenContract.populateTransaction.transfer(safeWallet, balance);
            tx.from = wallet.address;
            tx.gasLimit = await provider.estimateGas(tx);

            const signedTx = await gasSponsorWallet.sendTransaction(tx);
            await signedTx.wait();

            console.log("✅ ERC-20 tokens successfully transferred using sponsor wallet for gas.");
        } else {
            console.log("⚠️ No ERC-20 tokens found for transfer.");
        }
    } catch (error) {
        console.error("❌ Error recovering ERC-20 tokens:", error);
    }
}

module.exports = { recoverETH, recoverERC20 };
