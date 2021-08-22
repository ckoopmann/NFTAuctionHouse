const { expect } = require("chai");
const {
  mintTestToken,
  createAuction,
  getBlocktime,
  deployMarketplaceContract,
  deployTokenContract,
} = require("./helpers.js");

describe("Test a success full auction lifecycle", function () {
  let utils;
  let market;
  let marketParams;
  let startingPrice;
  let tokenContract;
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

  const tokenTypes = [1, 2];
  const tokenTypeNameMapping = {
    1: "ERC721",
    2: "ERC1155",
  };
  const quantity = 1;

  for (let tokenType of tokenTypes) {
    let tokenTypeName = tokenTypeNameMapping[tokenType];
    context(tokenTypeName, () => {
      before(async function () {
        [contractOwner, seller, firstBidder, secondBidder] =
          await ethers.getSigners();
        utils = ethers.utils;

        const currentBlocktime = await getBlocktime(ethers.provider);
        validExpiryDate = currentBlocktime + 60 * 60;

        [market, marketParams] = await deployMarketplaceContract(ethers);
        [tokenContract] = await deployTokenContract(ethers, tokenTypeName);

        tokenId = await mintTestToken(tokenContract, seller, tokenTypeName);
        startingPrice = utils.parseUnits("2");

        startingPrice = utils.parseUnits("2");
        startingBid = startingPrice.add(marketParams.minimumBidSize);
        currentPrice = startingPrice.add(marketParams.minimumBidSize);
        bidders = [firstBidder, secondBidder];

        const currentBlockTime = await getBlocktime(ethers.provider);
        expiryDate = currentBlockTime + 60 * 60;

        auctionId = await createAuction(
          market,
          tokenContract,
          tokenId,
          seller,
          startingPrice,
          expiryDate,
          tokenType,
          quantity
        );
      });

      // Simulate auction by placing multiple bids
      const numBids = 2;
      for (let i = 0; i < numBids; i++) {
        it(`Can place bid - bid number ${i + 1}`, async function () {
          // Cycle through bidding accounts
          const bidder = bidders[i % bidders.length];
          currentPrice = currentPrice.add(marketParams.minimumBidSize);
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
        // Fast forward time past the auction expiry date
        await ethers.provider.send("evm_setNextBlockTimestamp", [
          expiryDate + 1,
        ]);
        await ethers.provider.send("evm_mine", []);
        market.settleAuction(auctionId);
      });

      it("NFT is transferred to highest bidder", async function () {
        if (tokenType == 1) {
          const tokenOwnerAfter = await tokenContract.ownerOf(tokenId);
          expect(tokenOwnerAfter).to.equal(highestBidder.address);
        }
        else{
          const tokenBalanceBuyerAfter = await tokenContract.balanceOf(highestBidder.address, tokenId);
          expect(tokenBalanceBuyerAfter).to.equal(quantity);
        }
        // Check that NFT Token is transfered to highest bidder
      });

      it("Seller is credited with sale price", async function () {
        // Check that seller can withdraw the sale price
        const sellerBalanceBefore = await seller.getBalance();
        // Trigger credit transaction and determine paid transaction fee
        const creditSellerTx = await market.connect(seller).withdrawCredit();
        const creditSellerTxReceipt = await creditSellerTx.wait();
        const creditSellerTxFee = creditSellerTxReceipt.gasUsed.mul(
          creditSellerTx.gasPrice
        );
        // Get balance after credit and check that seller got the final price minus transaction fee
        const sellerBalanceAfter = await seller.getBalance();
        expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.equal(
          currentPrice.sub(creditSellerTxFee)
        );
      });

      it("Contract Owner is credited with commission", async function () {
        // Check that contract owner can withdraw the comission
        const contractOwnerBalanceBefore = await contractOwner.getBalance();
        const commission = await market.calculateCommission(currentPrice);
        // Trigger credit transaction and determine paid transaction fee
        const creditOwnerTx = await market
          .connect(contractOwner)
          .withdrawCredit();
        const creditOwnerTxReceipt = await creditOwnerTx.wait();
        const creditOwnerTxFee = creditOwnerTxReceipt.gasUsed.mul(
          creditOwnerTx.gasPrice
        );
        // Get balance after credit and check that contractOwner got the commission minus transaction fee
        const contractOwnerBalanceAfter = await contractOwner.getBalance();
        expect(
          contractOwnerBalanceAfter.sub(contractOwnerBalanceBefore)
        ).to.equal(commission.sub(creditOwnerTxFee));
      });
    });
  }
});
