const { expect } = require("chai");
const {
  mintTestToken,
  createAuction,
  getBlocktime,
  deployMarketplaceContract,
  deployERC721Contract,
} = require("./helpers.js");

describe("Create Auction", function () {
  let utils;
  let market;
  let startingPrice;
  let testERC721Contract;
  let auctionId;
  let tokenId;
  let validExpiryDate;
  const tokenURI = "TESTTOKEN";
  const tokenType = 1;
  const quantity = 1;

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

  it("Fails if market contract is not approved for given token", async function () {
    await expect(
      market
        .connect(seller)
        .createAuction(
          testERC721Contract.address,
          tokenId,
          startingPrice,
          validExpiryDate,
          tokenType,
          quantity,
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
          tokenId,
          startingPrice,
          invalidExpiryDate,
          tokenType,
          quantity,
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
      validExpiryDate,
      tokenType,
      quantity,
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
