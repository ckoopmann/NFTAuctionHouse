const { expect } = require("chai");
//Helper methods
// Mints test nft and returns tokenId once minting transaction has completed
async function mintTestToken(nftContract, signer, tokenTypeName) {
  let tokenId;
  let quantity = 1;
  // Mint Token
  if (tokenTypeName == "ERC721") {
    await nftContract.connect(signer).mintToken();

    // Wait for AuctionCreated event and extract auctionId from it
    const transferPromise = new Promise((resolve) => {
      nftContract.once(nftContract.filters.Transfer(), (from, to, _tokenId) => {
        expect(to).to.equal(signer.address);
        tokenId = _tokenId;
        resolve();
      });
    });
    await transferPromise;
  } else {
    tokenId = 1;
    await nftContract.connect(signer).mintToken(tokenId, quantity);
  }

  return tokenId;
}

// Creates new auction for given tokenId and returns auctionId
async function createAuction(
  marketContract,
  nftContract,
  tokenId,
  signer,
  startingPrice,
  expiryDate,
  tokenType = 1,
  quantity = 1
) {
  // Aprove token
  if (tokenType == 1) {
    await nftContract.connect(signer).approve(marketContract.address, tokenId);
  } else {
    await nftContract.connect(signer).setApprovalForAll(marketContract.address, true);
  }
  // Create Auction
  await marketContract
    .connect(signer)
    .createAuction(
      nftContract.address,
      tokenId,
      startingPrice,
      expiryDate,
      tokenType,
      quantity
    );
  let auctionId;

  // Wait for AuctionCreated event and extract auctionId from it
  const auctionCreatedPromise = new Promise((resolve) => {
    marketContract.once(
      marketContract.filters.AuctionCreated(),
      (_auctionId, _) => {
        auctionId = _auctionId;
        resolve();
      }
    );
  });
  await auctionCreatedPromise;
  return auctionId;
}

async function getBlocktime(provider) {
  const lastBlock = await provider.getBlock("latest");
  const currentBlockTime = lastBlock.timestamp;
  return currentBlockTime;
}

async function deployMarketplaceContract(ethers) {
  const Market = await ethers.getContractFactory("Market");
  // Constructor parameters
  commissionPercentage = ethers.utils.parseUnits("0.01");
  minimumCommission = ethers.utils.parseUnits("0.001");
  minimumBidSize = ethers.utils.parseUnits("0.0001");
  minimumAuctionLiveness = 10 * 60;

  market = await Market.deploy(
    commissionPercentage,
    minimumCommission,
    minimumBidSize,
    minimumAuctionLiveness
  );
  await market.deployed();
  return [
    market,
    {
      commissionPercentage,
      minimumCommission,
      minimumBidSize,
      minimumAuctionLiveness,
    },
  ];
}

async function deployTokenContract(ethers, tokenType = "ERC721") {
  if (tokenType == "ERC721") {
    return await deployERC721Contract(ethers);
  } else {
    return await deployERC1155Contract(ethers);
  }
}
async function deployERC1155Contract(ethers) {
  const TestERC1155 = await ethers.getContractFactory("TestERC1155");
  utils = ethers.utils;

  const baseURI = "https://example.domain/{id}.json";

  // Deploy ERC1155 contract
  testERC1155Contract = await TestERC1155.deploy(baseURI);
  await testERC1155Contract.deployed();

  return [testERC1155Contract, { baseURI }];
}

async function deployERC721Contract(ethers) {
  const TestERC721 = await ethers.getContractFactory("TestERC721");
  utils = ethers.utils;

  const baseURI = "BASEURI";
  const tokenName = "TestERC721";
  const symbol = "T721";

  // Deploy ERC721 contract
  testERC721Contract = await TestERC721.deploy(tokenName, symbol, baseURI);
  await testERC721Contract.deployed();

  return [testERC721Contract, { tokenName, symbol, baseURI }];
}

module.exports = {
  mintTestToken,
  createAuction,
  getBlocktime,
  deployMarketplaceContract,
  deployERC721Contract,
  deployTokenContract,
};
