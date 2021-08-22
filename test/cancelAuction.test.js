const { expect } = require("chai");
const {
  mintTestToken,
  createAuction,
  getBlocktime,
  deployMarketplaceContract,
  deployTokenContract,
} = require("./helpers.js");

describe("Cancel Auction", function () {
  let utils;
  let market;
  let startingPrice;
  let tokenContract;
  let validExpiryDate;
  let auctionId;
  const tokenTypes = [1, 2];
  const tokenTypeNameMapping = {
    1: "ERC721",
    2: "ERC1155",
  };
  const quantity = 1;

  // Addresses / roles
  let seller;

  for (let tokenType of tokenTypes) {
    let tokenTypeName = tokenTypeNameMapping[tokenType];
    context(tokenTypeName, () => {
      before(async function () {
        [contractOwner, seller, firstBidder, secondBidder] =
          await ethers.getSigners();
        utils = ethers.utils;

        const currentBlocktime = await getBlocktime(ethers.provider);
        validExpiryDate = currentBlocktime + 60 * 60;

        [market] = await deployMarketplaceContract(ethers);
        [tokenContract] = await deployTokenContract(ethers, tokenTypeName);

        tokenId = await mintTestToken(tokenContract, seller, tokenTypeName);
        startingPrice = utils.parseUnits("2");

        auctionId = await createAuction(
          market,
          tokenContract,
          tokenId,
          seller,
          startingPrice,
          validExpiryDate,
          tokenType,
          quantity
        );
      });

      it("Seller can cancel auction", async function () {
        const openAuctionsBefore = await market.getOpenAuctions();

        await market.connect(seller).cancelAuction(auctionId);

        // Wait for AuctionCanceled event
        const auctionCanceledPromise = new Promise((resolve) => {
          market.once(market.filters.AuctionCanceled(), (_auctionId, _) => {
            expect(_auctionId).to.equal(auctionId);
            resolve();
          });
        });
        await auctionCanceledPromise;

        const openAuctionsAfter = await market.getOpenAuctions();

        expect(openAuctionsBefore.length - 1).to.equal(
          openAuctionsAfter.length
        );

        // Check that token was transfered back to seller
        if (tokenType == 1) {
          const tokenOwner = await tokenContract.ownerOf(tokenId);
          expect(tokenOwner).to.equal(seller.address);
        } else {
          const tokenBalance = await tokenContract.balanceOf(
            seller.address,
            tokenId
          );
          expect(tokenBalance).to.equal(quantity);
        }
      });
    });
  }
});
