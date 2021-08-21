const { expect } = require("chai");
const {
  mintTestToken,
  createAuction,
  getBlocktime,
  deployMarketplaceContract,
  deployERC721Contract,
} = require("./helpers.js");

describe("Cancel Auction", function () {
  let utils;
  let market;
  let startingPrice;
  let testERC721Contract;
  let auctionId;
  let validExpiryDate;
  const tokenURI = "TESTTOKEN2";

  // Addresses / roles
  let seller;

  before(async function () {
    [contractOwner, seller, firstBidder, secondBidder] =
      await ethers.getSigners();
    utils = ethers.utils;

    const currentBlocktime = await getBlocktime(ethers.provider);
    validExpiryDate = currentBlocktime + 60 * 60;

    [market] = await deployMarketplaceContract(ethers);
    [testERC721Contract] = await deployERC721Contract(ethers);

    tokenId = await mintTestToken(testERC721Contract, tokenURI, seller);
    startingPrice = utils.parseUnits("2");
  });

    it("Seller can cancel auction", async function () {
      const newTokenId = await mintTestToken(
        testERC721Contract,
        tokenURI,
        seller
      );

      const newAuctionId = await createAuction(
        market,
        testERC721Contract,
        newTokenId,
        seller,
        startingPrice,
        validExpiryDate
      );

      const openAuctionsBefore = await market.getOpenAuctions();

      await market.connect(seller).cancelAuction(newAuctionId);

      // Wait for AuctionCanceled event
      const auctionCanceledPromise = new Promise((resolve) => {
        market.once(market.filters.AuctionCanceled(), (_auctionId, _) => {
          expect(_auctionId).to.equal(newAuctionId);
          resolve();
        });
      });
      await auctionCanceledPromise;

      const openAuctionsAfter = await market.getOpenAuctions();

      expect(openAuctionsBefore.length - 1).to.equal(openAuctionsAfter.length);
    });
});
