import { getCurrentProvider } from "./web3.module";
import { ethers } from "ethers";

const contractName = "Market";
const abi = require(`../../contracts/abis/${contractName}.json`);
const addresses = require(`../../contracts/addresses/${contractName}.json`);

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
        if (networkId in addresses) {
          try {
            marketContract = new ethers.Contract(
              addresses[networkId],
              abi,
              provider
            );
            // Will throw an error if contract is not deployed on current network
            await marketContract.deployed();
            console.log("Connected to contract at: ", addresses[networkId]);
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
    async approveToken(context, payload){
      console.log("Store approveToken: ", payload);
    },
    async createAuction(context, payload){
      console.log("Store createAuction: ", payload);
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
        (obj, cur) => ({ ...obj, [cur.auctionId]: cur }),
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
    auctions(state) {
      return state.auctions;
    },
    currentTokenDetails(state) {
      return state.currentTokenDetails;
    },
  },
};
export default contractModule;
