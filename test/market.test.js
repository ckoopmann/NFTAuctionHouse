const { expect } = require("chai");

describe("Market", function () {
  let utils;
  let commissionPercentage;
  let minimumCommission;
  let market;
  let owner;

  before(async function () {
    [owner] = await ethers.getSigners();
    const Market = await ethers.getContractFactory("Market");
    utils = ethers.utils;

    commissionPercentage = utils.parseUnits("0.01");
    minimumCommission = utils.parseUnits("0.001");

    market = await Market.deploy(commissionPercentage, minimumCommission);
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

  context("create listing", () => {
    let startingPrice;
    let testERC721Contract;

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
        market.createListing(testERC721Contract.address, 1, startingPrice)
      ).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
    });

    it("Succedes if contract is approved", async function () {
      await testERC721Contract.connect(owner).approve(
        market.address,
        1
      );

      const createListingTx = await market.connect(owner).createListing(
        testERC721Contract.address,
        1,
        startingPrice
      );
      createListingTx.wait();
    });
  });
});
