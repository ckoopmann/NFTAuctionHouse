const { expect } = require("chai");
const { mintTestToken, createAuction, getBlocktime } = require("./helpers.js")

describe("Market", function () {
  let utils;
  let commissionPercentage;
  let minimumCommission;
  let minimumBidSize;
  let minimumAuctionLiveness;
  let market;
  let startingPrice;
  let testERC721Contract;
  let auctionId;
  let validExpiryDate

  // Addresses / roles
  let contractOwner;
  let seller;
  let firstBidder;
  let secondBidder;

  // Configuration for test NFTs
  const tokenURI = "TESTTOKEN";
  const baseURI = "BASERURI";

  before(async function () {
    [contractOwner, seller, firstBidder, secondBidder] =
      await ethers.getSigners();
    const Market = await ethers.getContractFactory("Market");
    utils = ethers.utils;

    const currentBlocktime = await getBlocktime(ethers.provider)
    validExpiryDate = currentBlocktime + 60 * 60;
    commissionPercentage = utils.parseUnits("0.01");
    minimumCommission = utils.parseUnits("0.001");
    minimumBidSize = utils.parseUnits("0.0001");
    // Auction has to be live for at least 10 minutes
    minimumAuctionLiveness = 10 * 60;

    market = await Market.deploy(
      commissionPercentage,
      minimumCommission,
      minimumBidSize,
      minimumAuctionLiveness
    );
    await market.deployed();
  });

  context("constructor", () => {
    it("Should return correct minium Commission", async function () {
      const returnValue = await market.minimumCommission();
      expect(returnValue.toString()).to.equal(minimumCommission.toString());
    });

    it("Should return correct commission percentage", async function () {
      const returnValue = await market.commissionPercentage();
      expect(returnValue.toString()).to.equal(commissionPercentage.toString());
    });

    it("Calculates correct commission for a sale price below the minimum commission threshold", async function () {
      const salePrice = utils.parseUnits("0.01");
      const returnValue = await market.calculateCommission(salePrice);
      expect(returnValue.toString()).to.equal(minimumCommission.toString());
    });

    it("Calculates correct commission for a sale price above the minimum commission threshold", async function () {
      const salePrice = utils.parseUnits("1");
      const returnValue = await market.calculateCommission(salePrice);
      expect(returnValue.toString()).to.equal(commissionPercentage.toString());
    });
  });

  context("create auction", () => {
    // Expiry date 1 hour in the future

    before(async () => {
      const TestERC721 = await ethers.getContractFactory("TestERC721");
      utils = ethers.utils;

      const tokenName = "TestERC721";
      const symbol = "T721";

      // Deploy ERC721 contract
      testERC721Contract = await TestERC721.deploy(tokenName, symbol, baseURI);
      await testERC721Contract.deployed();

      tokenId = await mintTestToken(testERC721Contract, tokenURI, seller);

      startingPrice = utils.parseUnits("2");
    });

    it("Fails if market contract is not approved for given token", async function () {
      await expect(
        market
          .connect(seller)
          .createAuction(
            testERC721Contract.address,
            1,
            startingPrice,
            validExpiryDate
          )
      ).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
    });

    it("Fails if Expiry date is not far enough in the future", async function () {
      await testERC721Contract.connect(seller).approve(market.address, 1);
      const invalidExpiryDate = Math.floor(new Date().getTime() / 1000) + 60;
      await expect(
        market
          .connect(seller)
          .createAuction(
            testERC721Contract.address,
            1,
            startingPrice,
            invalidExpiryDate
          )
      ).to.be.revertedWith("Expiry date is not far enough in the future");
    });

    it("Succedes if conditions are met", async function () {
      auctionId = await createAuction(
        market,
        testERC721Contract,
        tokenId,
        seller,
        startingPrice,
        validExpiryDate
      );

      // Check that data is saved correctly
      const auction = await market.auctions(auctionId);
      expect(auction.seller).to.equal(seller.address);
      expect(auction.highestBidder).to.equal(ethers.constants.AddressZero);
      expect(auction.tokenId).to.equal(tokenId);
      expect(auction.currentPrice).to.equal(startingPrice);
      expect(auction.contractAddress).to.equal(testERC721Contract.address);
    });

    it("Can retrieve full list of open auctions", async function () {
      // Retrieve all open auctions
      const openAuctions = await market.getOpenAuctions();

      expect(openAuctions.length).to.equal(1);
    });
  });


  context("cancel auction", () => {
    // it("Cannot cancel auction that has bids already", async function () {
    //   await expect(
    //     market.connect(seller).cancelAuction(auctionId)
    //   ).to.be.revertedWith("Auction has bids already");
    // });

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
});
