import { getCurrentProvider } from "./web3.module";
import { ethers } from "ethers";

const marketAbi = require(`../../contracts/abis/Market.json`);
const marketAddresses = require(`../../contracts/addresses/Market.json`);

const ERC721Abi = require(`../../contracts/abis/TestERC721.json`);
const ERC1155Abi = require(`../../contracts/abis/TestERC1155.json`);

let marketContract;
const contractModule = {
  namespaced: true,
  name: "contract",
  state: {
    contractDeployed: false,
    auctions: {},
    currentTokenDetails: null,
    currentTokenId: null,
    userCredit: 0,
  },
  mutations: {
    setContractDeployed(state, contractDeployed) {
      state.contractDeployed = contractDeployed;
    },
    setAuction(state, { id, data }) {
      const newValues = {};
      newValues[id] = data;

      state.auctions = Object.assign({}, state.auctions, newValues);
    },
    resetAuctions(state, auctions) {
      state.auctions = auctions;
    },
    setUserCredit(state, userCredit) {
      state.userCredit = userCredit;
    },
  },
  actions: {
    async initializeContract({ commit, rootGetters, dispatch }) {
      commit("setContractDeployed", false);
      const networkId = rootGetters["web3Module/networkId"];
      const provider = getCurrentProvider();
      if (provider === undefined) {
        throw new Error("Provider is undefined - Cannot initialize contract");
      } else {
        if (networkId in marketAddresses) {
          try {
            marketContract = new ethers.Contract(
              marketAddresses[networkId],
              marketAbi,
              provider
            );
            // Will throw an error if contract is not deployed on current network
            await marketContract.deployed();
            console.log(
              "Connected to contract at: ",
              marketAddresses[networkId]
            );
            commit("setContractDeployed", true);
            dispatch("updateUserCredit");
            dispatch("setErrorType", null, {
              root: true,
            });
          } catch (e) {
            dispatch("setErrorType", "failedContractConnection", {
              root: true,
            });
          }
        } else {
          console.error("Contract is not deployed on networkId ", networkId);
          dispatch("setErrorType", "failedContractConnection", {
            root: true,
          });
        }
      }
    },

    async approveToken({ rootGetters }, payload) {
      const provider = getCurrentProvider();
      const signer = rootGetters["web3Module/signer"];
      console.log("Signer: ", signer);

      const { tokenType, tokenId, tokenContractAddress } = payload;
      let approveTokenTx;
      if (tokenType == "ERC721") {
        const nftContract = new ethers.Contract(
          tokenContractAddress,
          ERC721Abi,
          provider
        );
        approveTokenTx = await nftContract
          .connect(signer)
          .approve(marketContract.address, tokenId);
      }
      if (tokenType == "ERC1155") {
        const nftContract = new ethers.Contract(
          tokenContractAddress,
          ERC1155Abi,
          provider
        );
        approveTokenTx = await nftContract
          .connect(signer)
          .setApprovalForAll(marketContract.address, true);
      }
      await approveTokenTx.wait();
    },
    async updateUserCredit({ rootGetters, commit }) {
      const account = rootGetters["web3Module/selectedAccount"];
      const userCredit = await marketContract.userCredits(account);
      commit("setUserCredit", parseFloat(ethers.utils.formatEther(userCredit)));
    },
    async settleAuction({ rootGetters }, { auctionId }) {
      const signer = rootGetters["web3Module/signer"];
      const settleAuctionTx = await marketContract
        .connect(signer)
        .settleAuction(auctionId);
      await settleAuctionTx.wait();
    },
    async cancelAuction({ rootGetters }, { auctionId }) {
      const signer = rootGetters["web3Module/signer"];
      const cancelAuctionTx = await marketContract
        .connect(signer)
        .cancelAuction(auctionId);
      await cancelAuctionTx.wait();
    },
    async withdrawCredit({ rootGetters }) {
      const signer = rootGetters["web3Module/signer"];
      const withdrawCreditTx = await marketContract
        .connect(signer)
        .withdrawCredit();
      await withdrawCreditTx.wait();
    },
    async placeBid({ rootGetters }, { auctionId, bidPrice }) {
      const signer = rootGetters["web3Module/signer"];
      const bidPriceProcessed = ethers.utils.parseUnits(bidPrice);
      const commission = await marketContract.callStatic.calculateCommission(
        bidPriceProcessed
      );
      const placeBidTx = await marketContract
        .connect(signer)
        .placeBid(auctionId, bidPriceProcessed, {
          value: bidPriceProcessed.add(commission),
        });
      await placeBidTx.wait();
    },
    async createAuction({ rootGetters }, payload) {
      const {
        tokenContractAddress,
        tokenId,
        startingPrice,
        expiryDate,
        tokenType,
        quantity,
      } = payload;
      const tokenTypeInts = { ERC721: 1, ERC1155: 2 };
      const processedExpiryDate = Math.floor(expiryDate.getTime() / 1000);
      const signer = rootGetters["web3Module/signer"];
      const processedStartingPrice = ethers.utils.parseUnits(startingPrice);
      console.log("Signer: ", signer);
      const createAuctionTx = await marketContract
        .connect(signer)
        .createAuction(
          tokenContractAddress,
          tokenId,
          processedStartingPrice,
          processedExpiryDate,
          tokenTypeInts[tokenType],
          quantity
        );
      await createAuctionTx.wait();
    },

    async loadAuctions({ commit }) {
      const auctionArray = await marketContract.getOpenAuctions();
      const auctionObject = auctionArray.reduce(
        (obj, cur) => ({
          ...obj,
          [cur.auctionId]: {
            contractAddress: cur[0],
            tokenId: cur[1].toNumber(),
            currentPrice: parseFloat(ethers.utils.formatEther(cur[2])),
            seller: cur[3],
            highestBidder: cur[4],
            status: cur[5],
            expiryDate: new Date(cur[6].toNumber() * 1000),
            auctionId: cur[7].toNumber(),
            tokenType: cur[8],
            quantity: cur[9].toNumber(),
          },
        }),
        {}
      );
      commit("resetAuctions", auctionObject);
    },
  },
  getters: {
    contractInstance() {
      return marketContract;
    },
    contractAddress() {
      return marketContract?.address;
    },
    contractDeployed(state) {
      return state.contractDeployed;
    },
    openAuctionMap(state) {
      return state.auctions;
    },
    openAuctionList(state) {
      return Object.values(state.auctions);
    },
    currentTokenDetails(state) {
      return state.currentTokenDetails;
    },
    userCredit(state) {
      return state.userCredit;
    },
  },
};
export default contractModule;
