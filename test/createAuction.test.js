const { expect } = require("chai");
const {
  mintTestToken,
  createAuction,
  getBlocktime,
  deployMarketplaceContract,
  deployTokenContract,
} = require("./helpers.js");

describe("Create Auction", function () {
  let utils;
  let market;
  let startingPrice;
  let tokenContract;
  let auctionId;
  let tokenId;
  let validExpiryDate;
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
      });

      it("Fails if market contract is not approved for given token", async function () {
        const revertReasons = {
          1: "ERC721: transfer caller is not owner nor approved",
          2: "ERC1155: caller is not owner nor approved",
        };
        await expect(
          market
            .connect(seller)
            .createAuction(
              tokenContract.address,
              tokenId,
              startingPrice,
              validExpiryDate,
              tokenType,
              quantity
            )
        ).to.be.revertedWith(revertReasons[tokenType]);
      });

      it("Fails if Expiry date is not far enough in the future", async function () {
        if (tokenType == 1) {
          await tokenContract.connect(seller).approve(market.address, tokenId);
        } else {
          await tokenContract
            .connect(seller)
            .setApprovalForAll(market.address, true);
        }

        const invalidExpiryDate = Math.floor(new Date().getTime() / 1000) + 60;
        await expect(
          market
            .connect(seller)
            .createAuction(
              tokenContract.address,
              tokenId,
              startingPrice,
              invalidExpiryDate,
              tokenType,
              quantity
            )
        ).to.be.revertedWith("Expiry date is not far enough in the future");
      });

      it("Succedes if conditions are met", async function () {
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

        // Check that data is saved correctly
        const auction = await market.auctions(auctionId);
        expect(auction.seller).to.equal(seller.address);
        expect(auction.highestBidder).to.equal(ethers.constants.AddressZero);
        expect(auction.tokenId).to.equal(tokenId);
        expect(auction.currentPrice).to.equal(startingPrice);
        expect(auction.contractAddress).to.equal(tokenContract.address);
        expect(auction.tokenType).to.equal(tokenType);
        expect(auction.quantity).to.equal(quantity);

        // Check that token was transfered
        if(tokenType ==1){
          const tokenOwner = await tokenContract.ownerOf(tokenId);
          expect(tokenOwner).to.equal(market.address);
        }
        else{
          const tokenBalance = await tokenContract.balanceOf(market.address, tokenId);
          expect(tokenBalance).to.equal(quantity);
        }
      });

      it("Can retrieve full list of open auctions", async function () {
        // Retrieve all open auctions
        const openAuctions = await market.getOpenAuctions();

        expect(openAuctions.length).to.equal(1);
      });
    });
  }
});
