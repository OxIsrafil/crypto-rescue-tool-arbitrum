require('dotenv').config();
const { ethers } = require("ethers");
const { recoverETH, recoverERC20 } = require("./recover");
const { sendBundle } = require("./flashbots");
const { claimAirdrop } = require("./airdrop");
const cron = require('node-cron');

// ✅ Use Arbitrum Mainnet Provider
const provider = new ethers.JsonRpcProvider("https://arb1.arbitrum.io/rpc");

// ✅ Load wallets from .env
const compromisedWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const gasSponsorWallet = new ethers.Wallet(process.env.GAS_SPONSOR_KEY, provider);
const safeWallet = process.env.SAFE_WALLET;
const tokenAddress = process.env.TOKEN_ADDRESS;
const airdropContractAddress = process.env.AIRDROP_CONTRACT;

function showHeader() {
    colorLog(colors.blue, "┌──────────────────────────────────────────────────┐");
    colorLog(colors.blue, "│             CRYPTO FUNDS RESCUE TOOL             │");
    colorLog(colors.blue, "│                 Made by @0xisrafil               │");
    colorLog(colors.blue, "└──────────────────────────────────────────────────┘");
}

async function main() {
    console.log(`🚀 Starting asset recovery for wallet: ${compromisedWallet.address}`);

    try {
        // ✅ Recover ETH using gas sponsor wallet
        await recoverETH(compromisedWallet, safeWallet, gasSponsorWallet);

        // ✅ Recover ERC-20 tokens
        if (tokenAddress) {
            await recoverERC20(compromisedWallet, tokenAddress, safeWallet, gasSponsorWallet);
        } else {
            console.log("⚠️ No token address provided in .env");
        }

        // ✅ Claim airdrop (if available)
        if (airdropContractAddress) {
            await claimAirdrop(compromisedWallet, airdropContractAddress, safeWallet, gasSponsorWallet);
        } else {
            console.log("⚠️ No airdrop contract address provided in .env");
        }

        // ✅ Flashbots MEV Protection (Optional)
        const txBundle = [
            {
                signer: gasSponsorWallet, // ✅ Gas sponsor wallet pays for transactions
                transaction: {
                    to: safeWallet,
                    value: ethers.parseEther("0.1"),
                    gasLimit: 21000,
                    maxFeePerGas: ethers.parseUnits("100", "gwei"),
                    maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
                },
            }
        ];
        await sendBundle(gasSponsorWallet, provider, txBundle);

        console.log("✅ Asset recovery process complete!");
    } catch (error) {
        console.error("❌ Error in asset recovery:", error);
    }
}

// ✅ Run the function every 5 minutes
cron.schedule('*/5 * * * *', async () => {
    console.log('⏳ Running asset recovery process...');
    await main();
});

// ✅ Run immediately when script starts
main().catch(console.error);
