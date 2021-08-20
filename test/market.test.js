const { expect } = require("chai");

describe("Market", function () {
  let utils;
  let commissionPercentage;
  let minimumCommission;
  let minimumBidSize;
  let market;
  let owner;

  before(async function () {
    [owner] = await ethers.getSigners();
    const Market = await ethers.getContractFactory("Market");
    utils = ethers.utils;

    commissionPercentage = utils.parseUnits("0.01");
    minimumCommission = utils.parseUnits("0.001");
    minimumBidSize = utils.parseUnits("0.0001");

    market = await Market.deploy(commissionPercentage, minimumCommission, minimumBidSize);
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
    let startingPrice;
    let testERC721Contract;
    let auctionId;

    const tokenURI = "TESTTOKEN1";
    const baseURI = "BASERURI";

    before(async () => {
      const TestERC721 = await ethers.getContractFactory("TestERC721");
      utils = ethers.utils;

      const tokenName = "TestERC721";
      const symbol = "T721";

      // Deploy ERC721 contract
      testERC721Contract = await TestERC721.deploy(tokenName, symbol, baseURI);
      await testERC721Contract.deployed();

      // Mint Token
      const mintTx = await testERC721Contract.mintToken(tokenURI);
      mintTx.wait();

      startingPrice = utils.parseUnits("2");
    });

    it("Fails if market contract is not approved for given token", async function () {
      await expect(
        market.createAuction(testERC721Contract.address, 1, startingPrice)
      ).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
    });

    it("Succedes if contract is approved", async function () {
      // Approve the market contract such that it can transfer the NFT
      await testERC721Contract.connect(owner).approve(market.address, 1);

      // Create Auction
      await market
        .connect(owner)
        .createAuction(testERC721Contract.address, 1, startingPrice);

      // Wait for AuctionCreated event and extract auctionId from it
      const auctionCreatedPromise = new Promise((resolve) => {
        market.once(market.filters.AuctionCreated(), (_auctionId, _) => {
          auctionId = _auctionId;
          resolve();
        });
      });
      await auctionCreatedPromise;

      // Check that data is saved correctly
      const auction = await market.auctions(auctionId);
      expect(auction.seller).to.equal(owner.address);
      expect(auction.highestBidder).to.equal(ethers.constants.AddressZero);
      expect(auction.tokenId).to.equal(auctionId);
      expect(auction.currentPrice).to.equal(startingPrice);
      expect(auction.contractAddress).to.equal(testERC721Contract.address);
    });

    it("Can retrieve full list of open auctions", async function () {
      // Retrieve all open auctions
      const openAuctions = await market.getOpenAuctions();

      expect(openAuctions.length).to.equal(1);
    });

    it("Cannot cancel auction if not seller", async function () {
      const [_, otherAccount] = await ethers.getSigners();
      await expect(
        market.connect(otherAccount).cancelAuction(1)
      ).to.be.revertedWith("Caller is not Seller");
    });

    it("Seller can cancel auction", async function () {
      const openAuctionsBefore = await market.getOpenAuctions();

      const cancelTx = await market.connect(owner).cancelAuction(1);

      // Wait for AuctionCanceled event
      const auctionCanceledPromise = new Promise((resolve) => {
        market.once(market.filters.AuctionCanceled(), (_auctionId, _) => {
          expect(_auctionId).to.equal(1);
          resolve();
        });
      });
      await auctionCanceledPromise;


      const openAuctionsAfter = await market.getOpenAuctions();

      expect(openAuctionsBefore.length - 1).to.equal(openAuctionsAfter.length);
    });
  });
});
