<template>
  <v-btn
    v-if="!isConnected"
    large
    rounded
    color="#36adb5"
    @click="triggerAction"
  >
    <v-icon class="me-2" :size="20">mdi-link</v-icon>
    <span>Connect</span>
  </v-btn>
  <v-btn v-else large rounded color="#4e4e4f" @click="triggerAction">
    <v-icon class="me-2" :size="20">mdi-link-off</v-icon>
    <span>Disconnect</span>
  </v-btn>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
export default {
  props: {
    transition: {
      default: "slide-y-transition", // 'slide-y-transition'
    },
  },
  computed: {
    ...mapGetters("web3Module", ["isConnected"]),
  },
  methods: {
    ...mapActions(["setErrorType"]),
    ...mapActions("web3Module", ["connectWeb3", "clearProvider"]),
    async connect() {
      this.loading = true;
      try {
        await this.connectWeb3();
        await this.setErrorType(null);
      } finally {
        this.loading = false;
      }
    },
    clear() {
      this.clearProvider();
    },
    async triggerAction() {
      this.isConnected ? this.clear() : await this.connect();
    },
  },
};
</script>

<style lang="scss" scoped></style>
