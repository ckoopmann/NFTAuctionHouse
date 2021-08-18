import Web3modal from "web3modal";
import { ethers } from "ethers";

let web3Modal;
let currentProvider;

function initializeModal() {
  // window must be available so we delay instantiating till later
  if (!web3Modal)
    web3Modal = new Web3modal({
      network: "kovan",
      cacheProvider: false,
    });
  return web3Modal;
}

export const getCurrentProvider = () => {
  return currentProvider;
};

const web3Module = {
  namespaced: true,
  state: {
    isConnected: false,
    modalInitializing: false,
    providerSet: false,
    networkInfo: { name: "", chainId: -1 },
    correctNetwork: "kovan",
    activeNetwork: "",
    selectedAccount: "",
  },
  mutations: {
    setNetworkInfo(state, networkInfo) {
      const provider = getCurrentProvider()?.provider;
      const metamaskProvider = provider;
      state.selectedAccount = metamaskProvider.selectedAddress ?? "";
      state.networkInfo = networkInfo;
      state.activeNetwork = networkInfo.name;
    },
    setSelectedAccount(state, address) {
      state.selectedAccount = address;
    },
    setConnectionStatus(state, connectionState) {
      state.isConnected = connectionState;
    },
    setEthersProvider(state, provider) {
      try {
        currentProvider = new ethers.providers.Web3Provider(provider);
        state.providerSet = true;
      } catch (e) {
        console.log(
          "error converting to web3Provider to ethersProvider: %s",
          provider
        );
        state.providerSet = false;
      }
    },
    setModalInitializing(state) {
      state.modalInitializing = state;
    },
    clearProvider(state) {
      currentProvider = undefined;
      state.providerSet = false;
      state.isConnected = false;
    },
  },
  actions: {
    clearProvider(context) {
      context.commit("clearProvider");
      context.dispatch("setErrorType", "noWalletConnection", { root: true });
    },
    registerListeners(context, metamaskProvider) {
      if (metamaskProvider.isMetaMask) {
        console.log("Registering account listener");
        metamaskProvider.on("accountsChanged", async (accounts) => {
          const account = accounts[0];
          console.log("Detected account update: %s", account);
          context.commit("setSelectedAccount", account);
          await context.dispatch(
            "contractModule/loadOwnedIds",
            {},
            { root: true }
          );
        });

        // Note that this will not be triggered if we change between networks with the same chain id
        // Tried this but did not work: https://docs.ethers.io/v5/concepts/best-practices/#best-practices
        metamaskProvider.on("chainChanged", () => {
          console.log("Detected network change, reload page");
          window.location.reload();
        });
      }
    },
    async connectWeb3(context) {
      context.commit("setModalInitializing", true);
      const webModal = initializeModal();
      let provider;
      try {
        provider = await webModal.connect();
        context.commit("setEthersProvider", provider);
        context.commit("setConnectionStatus", true);
        await context.dispatch("registerListeners", provider);
        await context.dispatch("updateNetworkInfo");
      } catch (e) {
        console.log("Error connecting to Web3");
        context.commit("setConnectionStatus", false);
        context.dispatch("setErrorType", "failedWalletConnection", { root: true });
      } finally {
        context.commit("setModalInitializing", false);
      }
    },
    async updateNetworkInfo(context) {
      const ethersWeb3Provider = getCurrentProvider();
      if (context.state.providerSet && ethersWeb3Provider) {
        const networkInfo = await ethersWeb3Provider.getNetwork();
        context.commit("setNetworkInfo", networkInfo);
      }
    },
  },
  getters: {
    onCorrectNetwork(state) {
      return state.networkInfo.name === state.correctNetwork;
    },
    networkId(state) {
      return state.networkInfo.chainId;
    },
    signer(state) {
      const modalProvider = getCurrentProvider();
      console.error("Undefined provider when trying to generate signer");
      if (modalProvider !== undefined) {
        return modalProvider.getSigner(state.selectedAccount);
      } else {
        return undefined;
      }
    },
    selectedAccount(state) {
      return state.selectedAccount;
    },
    isConnected(state) {
      return state.isConnected;
    },
  },
};
export default web3Module;
