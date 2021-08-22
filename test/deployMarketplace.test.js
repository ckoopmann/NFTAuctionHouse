const { expect } = require("chai");
const {
  deployMarketplaceContract,
} = require("./helpers.js");

describe("Deploy Marketplace", function () {
  let utils;
  let market;
  let constructorArgs;


  before(async function () {
    utils = ethers.utils;

    [market, constructorArgs] = await deployMarketplaceContract(ethers);
  });

  it("Contract returns correct minimum Commission", async function () {
    const returnValue = await market.minimumCommission();
    expect(returnValue.toString()).to.equal(constructorArgs.minimumCommission.toString());
  });

  it("Contract returns correct commission percentage", async function () {
    const returnValue = await market.commissionPercentage();
    expect(returnValue.toString()).to.equal(constructorArgs.commissionPercentage.toString());
  });

  it("Contract returns correct commission for a sale price below the minimum commission threshold", async function () {
    const salePrice = utils.parseUnits("0.01");
    const returnValue = await market.calculateCommission(salePrice);
    expect(returnValue.toString()).to.equal(constructorArgs.minimumCommission.toString());
  });

  it("Contract returns correct commission for a sale price above the minimum commission threshold", async function () {
    const salePrice = utils.parseUnits("1");
    const returnValue = await market.calculateCommission(salePrice);
    expect(returnValue.toString()).to.equal(constructorArgs.commissionPercentage.toString());
  });
});
