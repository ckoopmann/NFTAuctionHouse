import Vue from "vue";
import Vuex from "vuex";
import web3Module from "./modules/web3.module";
import contractModule from "./modules/contract.module";

const errorMessages = {
  noWalletConnection: "Please connect your Metamask wallet to use the app",
  failedWalletConnection:
    "Could not connect to wallet. Make sure you have metamask installed and try again.",
  failedContractConnection:
    "Could not connect to NFTrail smart contract. Make sure your wallet is set to one of the supported networks (currently only Matic Mumbai Testnet) and try again.",
};

Vue.use(Vuex);
const store = new Vuex.Store({
  state: {
    errorType: "noWalletConnection",
  },
  mutations: {
    setErrorType(state, errorType) {
      state.errorType = errorType;
    },
  },
  getters: {
    errorType(state) {
      return state.errorType;
    },
    errorMessage(state) {
      return errorMessages[state.errorType];
    },
  },
  actions: {
    setErrorType({ commit }, errorType) {
      commit("setErrorType", errorType);
    },
  },
  modules: {
    web3Module,
    contractModule,
  },
});

export default store;
