const { expect } = require("chai");

describe("Market", function () {
  let utils;
  let initialCommissionPercentage;
  let initialMinCommission;
  let market;

  before(async function () {
    const Market = await ethers.getContractFactory("Market");
    utils = ethers.utils;

    initialCommissionPercentage = utils.parseUnits("0.01");
    initialMinCommission = utils.parseUnits("0.001");

    market = await Market.deploy(
      initialCommissionPercentage,
      initialMinCommission
    );
    await market.deployed();
  });

  it("Should return correct minium Commission", async function () {
    const returnValue = await market.minimumCommission();
    expect(returnValue.toString()).to.equal(initialMinCommission.toString());
  });

  it("Should return correct commission percentage", async function () {
    const returnValue = await market.commissionPercentage();
    expect(returnValue.toString()).to.equal(initialCommissionPercentage.toString());
  });

});
