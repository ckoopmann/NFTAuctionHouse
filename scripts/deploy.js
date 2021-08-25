// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const fs = require("fs");
const { mintTestToken } = require("../test/helpers");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function deployContract(contractName, constructorArgs) {
  const abiPath = `dapp/src/contracts/abis/${contractName}.json`;
  const addressPath = `dapp/src/contracts/addresses/${contractName}.json`;

  const factory = await ethers.getContractFactory(contractName);
  console.log(`Deploying contract ${contractName}`);
  if (constructorArgs != null) {
    contract = await factory.deploy(...constructorArgs);
  } else {
    contract = await factory.deploy();
  }
  await contract.deployed();
  const { chainId } = await ethers.provider.getNetwork();

  let addresses = {};
  if (fs.existsSync(addressPath))
    addresses = JSON.parse(fs.readFileSync(addressPath, "utf8"));

  addresses[chainId] = contract.address;

  fs.writeFileSync(addressPath, JSON.stringify(addresses, null, 2));

  const readableAbi = contract.interface.format(ethers.utils.FormatTypes.full);
  fs.writeFileSync(abiPath, JSON.stringify(readableAbi, null, 2));

  console.log(
    `${contractName} on network ${chainId} deployed to:`,
    contract.address
  );

  await sleep(60 * 1000);
  // Verify on etherscan
  await hre.run("verify:verify", {
    address: contract.address,
    constructorArguments: constructorArgs,
  });
  console.log(`${contractName} on network ${chainId} verified`);
  return contract;
}
async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy

  commissionPercentage = ethers.utils.parseUnits("0.01");
  minimumCommission = ethers.utils.parseUnits("0.001");
  minimumBidSize = ethers.utils.parseUnits("0.0001");
  minimumAuctionLiveness = 10 * 60;

  const marketContract = await deployContract("Market", [
    commissionPercentage,
    minimumCommission,
    minimumBidSize,
    minimumAuctionLiveness,
  ]);

  const baseURI = "BASEURI";
  const tokenName = "TestERC721";
  const symbol = "T721";
  const testERC721Contract = await deployContract("TestERC721", [
    tokenName,
    symbol,
    baseURI,
  ]);

  const testERC1155Contract = await deployContract("TestERC1155", [baseURI]);

  const { chainId } = await ethers.provider.getNetwork();
  if (chainId == 31337) {
    const [owner] = await ethers.getSigners();
    mintTestToken(testERC721Contract, owner, "ERC721");
    console.log(`Minted ERC721 TestToken for ${owner.address}`);
    mintTestToken(testERC1155Contract, owner, "ERC1155");
    console.log(`Minted ERC1155 TestToken for ${owner.address}`);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
