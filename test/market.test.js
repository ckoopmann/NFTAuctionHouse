const { expect } = require("chai");

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
  const validExpiryDate = Math.floor(new Date().getTime() / 1000) + 60 * 60;

  // Addresses / roles
  let contractOwner;
  let seller;
  let firstBidder;
  let secondBidder;

  // Configuration for test NFTs
  const tokenURI = "TESTTOKEN";
  const baseURI = "BASERURI";

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
    await nftContract.connect(seller).approve(marketContract.address, tokenId);
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

  before(async function () {
    [contractOwner, seller, firstBidder, secondBidder] =
      await ethers.getSigners();
    const Market = await ethers.getContractFactory("Market");
    utils = ethers.utils;

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

  context("make bids", () => {
    let currentPrice;
    let startingBid;
    let highestBidder;
    let bidders;
    before(async () => {
      startingBid = startingPrice.add(minimumBidSize);
      currentPrice = startingPrice.add(minimumBidSize);
      bidders = [firstBidder, secondBidder];
    });
    it("Cannot bid on non existent auction", async function () {
      const invalidAuctionId = 9999;
      await expect(
        market.connect(firstBidder).placeBid(invalidAuctionId, startingBid)
      ).to.be.revertedWith("Transaction only permissible for open Auctions");
    });

    it("Cannot bid if price is below minimum threshold", async function () {
      const invalidPrice = startingPrice;
      await expect(
        market.connect(firstBidder).placeBid(auctionId, invalidPrice)
      ).to.be.revertedWith(
        "Bid has to exceed current price by the minimumBidSize or more"
      );
    });

    it("Cannot bid if transaction has too little eth attached", async function () {
      await expect(
        market
          .connect(firstBidder)
          .placeBid(auctionId, startingBid, { value: startingBid })
      ).to.be.revertedWith("Transaction value has to equal price + commission");
    });

    it("Cannot bid if transaction has too much eth attached", async function () {
      const commission = await market.calculateCommission(startingBid);
      const value = startingBid.add(commission).add(minimumBidSize);
      await expect(
        market.connect(firstBidder).placeBid(auctionId, startingBid, {
          value,
        })
      ).to.be.revertedWith("Transaction value has to equal price + commission");
    });

    // Simulate auction by placing multiple bids
    const numBids = 2;
    for (let i = 0; i < numBids; i++) {
      it(`Can place bid if all requirments are met bid number ${
        i + 1
      }`, async function () {
        // Cycle through bidding accounts
        const bidder = bidders[i % bidders.length];
        currentPrice = currentPrice.add(minimumBidSize);
        const commission = await market.calculateCommission(currentPrice);

        const value = currentPrice.add(commission);
        await market
          .connect(bidder)
          .placeBid(auctionId, currentPrice, { value });

        const auctionDetails = await market.auctions(auctionId);
        expect(auctionDetails.highestBidder).to.equal(bidder.address);
        expect(auctionDetails.currentPrice).to.equal(currentPrice);

        highestBidder = bidder;
        // Increase bid prize for next bid
      });
    }

    it("Auction is settled correctly", async function () {
      const tokenOwnerBefore = await testERC721Contract.ownerOf(tokenId);
      expect(tokenOwnerBefore).to.equal(market.address);

      // Fast forward time past the auction expiry date
      await ethers.provider.send("evm_setNextBlockTimestamp", [
        validExpiryDate + 1,
      ]);
      await ethers.provider.send("evm_mine", []);
      market.settleAuction(auctionId);

      // Check that NFT Token is transfered to highest bidder
      const tokenOwnerAfter = await testERC721Contract.ownerOf(tokenId);
      expect(tokenOwnerAfter).to.equal(highestBidder.address);

      // Check that seller can withdraw the sale price
      const sellerBalanceBefore = await seller.getBalance();
      // Trigger credit transaction and determine paid transaction fee
      const creditSellerTx = await market.connect(seller).withdrawCredit();
      const creditSellerTxReceipt = await creditSellerTx.wait();
      const creditSellerTxFee = creditSellerTxReceipt.gasUsed.mul(creditSellerTx.gasPrice)
      // Get balance after credit and check that seller got the final price minus transaction fee
      const sellerBalanceAfter = await seller.getBalance();
      expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.equal(currentPrice.sub(creditSellerTxFee));

      // Check that contract owner can withdraw the comission
      const contractOwnerBalanceBefore = await contractOwner.getBalance();
      const commission = await market.calculateCommission(currentPrice)
      // Trigger credit transaction and determine paid transaction fee
      const creditOwnerTx = await market.connect(contractOwner).withdrawCredit();
      const creditOwnerTxReceipt = await creditOwnerTx.wait();
      const creditOwnerTxFee = creditOwnerTxReceipt.gasUsed.mul(creditOwnerTx.gasPrice)
      // Get balance after credit and check that contractOwner got the commission minus transaction fee
      const contractOwnerBalanceAfter = await contractOwner.getBalance();
      expect(contractOwnerBalanceAfter.sub(contractOwnerBalanceBefore)).to.equal(commission.sub(creditOwnerTxFee));


    });
  });

  // context("cancel auction", () => {
  //   it("Cannot cancel auction that has bids already", async function () {
  //     await expect(
  //       market.connect(seller).cancelAuction(auctionId)
  //     ).to.be.revertedWith("Auction has bids already");
  //   });

  //   it("Seller can cancel auction", async function () {
  //     const newTokenId = await mintTestToken(
  //       testERC721Contract,
  //       tokenURI,
  //       seller
  //     );

  //     const newAuctionId = await createAuction(
  //       market,
  //       testERC721Contract,
  //       newTokenId,
  //       seller,
  //       startingPrice,
  //       validExpiryDate
  //     );

  //     const openAuctionsBefore = await market.getOpenAuctions();

  //     await market.connect(seller).cancelAuction(newAuctionId);

  //     // Wait for AuctionCanceled event
  //     const auctionCanceledPromise = new Promise((resolve) => {
  //       market.once(market.filters.AuctionCanceled(), (_auctionId, _) => {
  //         expect(_auctionId).to.equal(newAuctionId);
  //         resolve();
  //       });
  //     });
  //     await auctionCanceledPromise;

  //     const openAuctionsAfter = await market.getOpenAuctions();

  //     expect(openAuctionsBefore.length - 1).to.equal(openAuctionsAfter.length);
  //   });
  // });
});
