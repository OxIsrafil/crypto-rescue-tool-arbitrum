const { FlashbotsBundleProvider } = require('@flashbots/ethers-provider-bundle');
const { ethers } = require("ethers");

// ✅ Use correct Flashbots provider
async function sendBundle(wallet, provider, txBundle) {
    try {
        const flashbots = await FlashbotsBundleProvider.create(
            provider,
            ethers.Wallet.createRandom(), // Flashbots relay wallet (random signer)
            "https://relay.flashbots.net" // ✅ Use the correct relay URL
        );

        const blockNumber = await provider.getBlockNumber();
        const signedBundle = await flashbots.sendBundle(txBundle, blockNumber + 1);

        // ✅ Check for bundle simulation errors
        if ("error" in signedBundle) {
            console.error("❌ Flashbots Simulation Error:", signedBundle.error);
            return;
        }

        console.log("🚀 Flashbots bundle sent. Waiting for inclusion...");

        // ✅ Wait for bundle confirmation
        const receipt = await signedBundle.wait();
        if (receipt === 0) {
            console.log("⚠️ Flashbots transaction not included in the block. Retrying...");
        } else {
            console.log("✅ Transactions included successfully in block:", receipt);
        }
    } catch (error) {
        console.error("❌ Error in Flashbots bundle:", error);
    }
}

module.exports = { sendBundle };
