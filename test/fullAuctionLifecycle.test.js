const { expect } = require("chai");
const { mintTestToken, createAuction, getBlocktime } = require("./helpers.js")

describe("Test a success full auction lifecycle", function () {
  let utils;
  let commissionPercentage;
  let minimumCommission;
  let minimumBidSize;
  let minimumAuctionLiveness;
  let market;
  let startingPrice;
  let testERC721Contract;
  let auctionId;
  let expiryDate;

  // Addresses / roles
  let contractOwner;
  let seller;
  let firstBidder;
  let secondBidder;

  // Variables to keep track of simulated auction
  let currentPrice;
  let highestBidder;
  let bidders;

  // Configuration for test NFTs
  const tokenURI = "TESTTOKEN";
  const baseURI = "BASERURI";
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


  context("ERC721 auction", () => {
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
      startingBid = startingPrice.add(minimumBidSize);
      currentPrice = startingPrice.add(minimumBidSize);
      bidders = [firstBidder, secondBidder];
    });

    it("Auction can be created", async function () {
      const currentBlockTime = await getBlocktime(ethers.provider)
      expiryDate = currentBlockTime + 60*60
      auctionId = await createAuction(
        market,
        testERC721Contract,
        tokenId,
        seller,
        startingPrice,
        expiryDate
      );

      // Check that data is saved correctly
      const auction = await market.auctions(auctionId);
      expect(auction.seller).to.equal(seller.address);
      expect(auction.highestBidder).to.equal(ethers.constants.AddressZero);
      expect(auction.tokenId).to.equal(tokenId);
      expect(auction.currentPrice).to.equal(startingPrice);
      expect(auction.contractAddress).to.equal(testERC721Contract.address);
    });


    // Simulate auction by placing multiple bids
    const numBids = 2;
    for (let i = 0; i < numBids; i++) {
      it(`Can place bid - bid number ${
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

    it("Auction can be settled", async function () {
      const tokenOwnerBefore = await testERC721Contract.ownerOf(tokenId);
      expect(tokenOwnerBefore).to.equal(market.address);

      // Fast forward time past the auction expiry date
      await ethers.provider.send("evm_setNextBlockTimestamp", [
        expiryDate + 1,
      ]);
      await ethers.provider.send("evm_mine", []);
      market.settleAuction(auctionId);
    })

    it("NFT is transferred to highest bidder", async function () {
      // Check that NFT Token is transfered to highest bidder
      const tokenOwnerAfter = await testERC721Contract.ownerOf(tokenId);
      expect(tokenOwnerAfter).to.equal(highestBidder.address);
    })

    it("Seller is credited with sale price", async function () {
      // Check that seller can withdraw the sale price
      const sellerBalanceBefore = await seller.getBalance();
      // Trigger credit transaction and determine paid transaction fee
      const creditSellerTx = await market.connect(seller).withdrawCredit();
      const creditSellerTxReceipt = await creditSellerTx.wait();
      const creditSellerTxFee = creditSellerTxReceipt.gasUsed.mul(creditSellerTx.gasPrice)
      // Get balance after credit and check that seller got the final price minus transaction fee
      const sellerBalanceAfter = await seller.getBalance();
      expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.equal(currentPrice.sub(creditSellerTxFee));
    })

    it("Contract Owner is credited with commission", async function () {
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

});
