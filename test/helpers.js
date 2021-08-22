const { expect } = require("chai");
//Helper methods
// Mints test nft and returns tokenId once minting transaction has completed
async function mintTestToken(nftContract, tokenURI, signer) {
  // Mint Token
  await nftContract.connect(signer).mintToken(tokenURI);

  let tokenId;

  // Wait for AuctionCreated event and extract auctionId from it
  const transferPromise = new Promise((resolve) => {
    nftContract.once(nftContract.filters.Transfer(), (from, to, _tokenId) => {
      expect(to).to.equal(signer.address);
      tokenId = _tokenId;
      resolve();
    });
  });
  await transferPromise;

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
  await nftContract.connect(signer).approve(marketContract.address, tokenId);
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
};
