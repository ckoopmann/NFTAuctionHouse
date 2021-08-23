<template>
  <v-app>
    <v-app-bar :clipped-left="clipped" app fixed>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer" />

      <v-container class="d-flex align-center">
        <router-link to="/">
          <v-avatar tile size="75">
            <v-img src="assets/logo_transparent.png" contain />
          </v-avatar>
        </router-link>
        <v-spacer />
        <div v-if="isConnected" :title="selectedAccount" class="connected">
          Connected: {{ selectedAccount }}
        </div>
        <v-slide-x-reverse-transition appear>
          <div class="d-flex">
            <div class="d-flex align-center ms-8">
              <connect-button />
            </div>
          </div>
        </v-slide-x-reverse-transition>
      </v-container>
    </v-app-bar>

    <v-main>
      <v-navigation-drawer
        v-model="drawer"
        :clipped="clipped"
        app
        class="navigationdrawer"
        stateless
      >
        <v-list v-if="errorType == null">
          <v-list-item
            v-for="(item, i) in items"
            :key="i"
            :to="item.to"
            router
            exact
            style="z-index:1000;"
          >
            <v-list-item-action>
              <v-icon>{{ item.icon }}</v-icon>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title v-text="item.title" />
            </v-list-item-content>
          </v-list-item>
        </v-list>
        <div v-else class="p-6 m-6">
          {{ this.errorMessage }}
        </div>
      </v-navigation-drawer>
      <div>
        <v-card v-if="false" class="mx-auto my-12" max-width="500">
          <v-card-text>{{ this.errorMessage }}</v-card-text></v-card
        >
        <router-view v-else />
      </div>
    </v-main>
  </v-app>
</template>

<script>
import { mapGetters } from "vuex";

import ConnectButton from "./components/ConnectButton.vue";

export default {
  name: "ParetoMarket",
  components: { ConnectButton },

  data() {
    return {
      scrolled: false,
      clipped: true,
      drawer: false,
      constantItems: [
        { icon: "mdi-home", title: "About", to: "/" },
        { icon: "mdi-magnify", title: "All Auctions", to: "/auctions" },
        {
          icon: "mdi-plus-box",
          title: "Create Auction",
          to: "/new",
        },
      ],
    };
  },
  computed: {
    ...mapGetters(["errorType", "errorMessage"]),
    ...mapGetters("web3Module", ["isConnected", "selectedAccount"]),
    items() {
      return this.constantItems;
    },
  },
};
</script>

<style lang="scss">
.fade-out-enter,
.fade-out-leave {
  opacity: 1;
}
.fade-out-leave-to {
  opacity: 0;
}
.fade-out-enter-active,
.fade-out-leave-active {
  transition: opacity 0.4s ease-in-out;
}

.dark-gradient {
  background-color: #050a19 !important;
  background: linear-gradient(
    125deg,
    rgba(5, 10, 25, 1) 45%,
    rgb(3, 16, 53) 100%
  ) !important;
}
html,
body {
  overflow: auto;
  /* Hide scrollbar for Chrome, Safari and Opera */
  &::-webkit-scrollbar {
    display: none;
  }
  /* Hide scrollbar for IE, Edge and Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
@import url(https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;700&family=Poppins:wght@200;300;400;500;600&display=swap);
.v-application,
body,
html,
.v-main,
.heading,
.v-application .headline,
.v-application .title,
.v-application .v-card .v-card__title,
.v-list .v-list-item__title {
  font-family: "poppins", "cairo" !important;
  &.v-application--is-rtl {
    div,
    h1,
    h2,
    h3,
    h4,
    p {
      letter-spacing: -0.5px !important;
    }
  }
}
.v-application,
body,
html,
.v-main {
  font-size: 16px !important;
}
.medium-text {
  font-size: 18px;
  line-height: 2.2rem !important;
  @media (max-width: 960px) {
    font-size: 17px;
    line-height: 2rem !important;
  }
}
.details-text {
  font-size: 14px !important;
}
.v-application {
  h1.headline {
    font-size: 2.2rem !important;
    line-height: 3.3rem !important;

    @media (max-width: 960px) {
      font-size: 1.9rem !important;
      line-height: 2.5rem !important;
    }
  }
}
#fullpage,
.fullpage-section {
  height: 100vh;
  position: relative;
}
.soft-ripple {
  color: rgba(0, 0, 0, 0.2) !important;
}
.v-card {
  &.card-shadow {
    box-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.1) !important;
    transition: 0.15s ease-in-out all;

    @media (min-width: 960px) {
      &:hover {
        box-shadow: 0 3px 15px 0 rgba(0, 0, 0, 0.08) !important;
        transform: translateY(-6px);
      }
    }
    &.v-card--link {
      &:before {
        opacity: 0 !important;
      }
      &:active {
        transform: translateY(1px);
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
      }
    }
  }
}
.container {
  &:not(.container--fluid) {
    @media (min-width: 1264px) {
      max-width: 1185px;
    }

    @media (min-width: 1904px) {
      max-width: 1290px;
    }
    @media (max-width: 960px) {
      padding: 16px;
    }
  }
}

/* buttons */
.v-application {
  .v-btn {
    letter-spacing: 0px;
    text-transform: unset;
    &.v-size--large {
      &:not(.v-btn--round) {
        padding: 0 20px;
      }
    }
  }
  &.v-application--is-rtl {
    .v-btn {
      letter-spacing: 0 !important;
    }
  }
}

/* transitions */
.delay-500ms {
  transition-delay: 0.5s !important;
}
.delay-1s {
  transition-delay: 1s !important;
}
.delay-2s {
  transition-delay: 2s !important;
}
.delay-3s {
  transition-delay: 3s !important;
}
.delay-4s {
  transition-delay: 4s !important;
}
.fade-up-off {
  opacity: 0;
  transform: translateY(200px);
}
.fade-up-on {
  opacity: 1;
  transform: none;
  transition: opacity 1s ease-in, transform 0.5s ease-out;
}

.v-application .navbar {
  &,
  .v-toolbar__content {
    transition: height 0.2s ease-out, background-color 0.1s linear !important;
  }
  &.soft-shadow {
    box-shadow: 0 0 transparent, 0 0 transparent,
      0 5px 5px -4px rgba(0, 0, 0, 0.1) !important;
  }
  &.dark-gradient {
    box-shadow: 0 1px 8px 0px rgba(0, 0, 0, 0.2) !important;
  }
  &.blank {
    &,
    .v-toolbar__content {
      background: none !important;
      border: none !important;
      box-shadow: none !important;
    }
  }
  .v-btn {
    font-weight: normal !important;
    text-transform: capitalize;
    letter-spacing: 1.1px;
  }
}
body {
  background-color: black;
}

.connected {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #ffffff11;
  margin: 0 10px;
  padding: 6px 15px;
  border-radius: 15px;
  cursor: pointer;
}
</style>
