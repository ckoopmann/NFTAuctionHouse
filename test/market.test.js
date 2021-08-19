const { expect } = require("chai");

describe("Market", function () {
  let utils;
  let commissionPercentage;
  let minimumCommission;
  let market;

  before(async function () {
    const Market = await ethers.getContractFactory("Market");
    utils = ethers.utils;

    commissionPercentage = utils.parseUnits("0.01");
    minimumCommission = utils.parseUnits("0.001");

    market = await Market.deploy(
      commissionPercentage,
      minimumCommission
    );
    await market.deployed();
  });

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
