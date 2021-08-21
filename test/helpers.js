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
  expiryDate
) {
  await nftContract.connect(signer).approve(marketContract.address, tokenId);
  // Create Auction
  await marketContract
    .connect(signer)
    .createAuction(nftContract.address, tokenId, startingPrice, expiryDate);
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

module.exports = {
  mintTestToken,
  createAuction,
  getBlocktime,
};
