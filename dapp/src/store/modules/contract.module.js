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
      if (tokenType == "ERC721") {
        const nftContract = new ethers.Contract(
          tokenContractAddress,
          ERC721Abi,
          provider
        );
        await nftContract
          .connect(signer)
          .approve(marketContract.address, tokenId);
      }
      if (tokenType == "ERC1155") {
        const nftContract = new ethers.Contract(
          tokenContractAddress,
          ERC1155Abi,
          provider
        );
        await nftContract
          .connect(signer)
          .setApprovalForAll(marketContract.address, true);
      }
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
      await marketContract
        .connect(signer)
        .createAuction(
          tokenContractAddress,
          tokenId,
          processedStartingPrice,
          processedExpiryDate,
          tokenTypeInts[tokenType],
          quantity
        );
    },
    async registerListeners() {
      console.log("Registering contract listeners");

      // marketContract.on("Transfer", async (from, to, id) => {
      //   console.log("Detected transfer event", from, to, id);
      //   const activeAccount = rootGetters["web3Module/selectedAccount"];
      //   if (
      //     ethers.utils.getAddress(to) === ethers.utils.getAddress(activeAccount)
      //   ) {
      //     const [
      //       assetIdentifier,
      //       pictureURI,
      //       numDocuments,
      //     ] = await marketContract.callStatic.getAssetData(id);
      //     commit("setAuction", {
      //       id,
      //       data: {
      //         assetIdentifier,
      //         pictureURI,
      //         numDocuments: numDocuments.toNumber(),
      //       },
      //     });
      //   }
      // });
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
  },
};
export default contractModule;
