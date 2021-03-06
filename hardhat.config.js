require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
const fs = require("fs");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

function url(network) {
  try {
    const urls = require("./urls.json");
    return urls[network];
  } catch (e) {
    console.log("WARNING: No urls file");
  }
  return "";
}

function mnemonic() {
  try {
    return fs.readFileSync("./mnemonic.txt").toString().trim();
  } catch (e) {
    console.log("WARNING: No mnemonic file");
  }
  return "";
}

function etherscanKey() {
  try {
    return fs.readFileSync("./etherscanKey.txt").toString().trim();
  } catch (e) {
    console.log("WARNING: No etherscanKey file");
  }
  return "";
}




task("time", "Set time to given date")
  .addParam(
    "timestamp",
    "Timestamp that the blocktime should be set to"
  )
  .setAction(async ({ timestamp }, { ethers }) => {
      console.log("Traveling to timestamp: ", timestamp)
      const timeStamp = new Date(timestamp).getTime() / 1000
      await ethers.provider.send("evm_setNextBlockTimestamp", [timeStamp + 1])
      await ethers.provider.send("evm_mine", [])
  })

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    rinkeby: {
      url: url("rinkeby"),
      accounts: {
        mnemonic: mnemonic(),
      },
    },
    matic: {
      url: url("matic"),
      accounts: {
        mnemonic: mnemonic(),
      },
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: etherscanKey(),
  },
  solidity: "0.8.4",
};
