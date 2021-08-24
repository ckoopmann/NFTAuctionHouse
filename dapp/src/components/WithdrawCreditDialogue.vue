<template>
  <v-row justify="center">
    <v-dialog v-model="dialog" persistent max-width="600px">
      <template v-slot:activator="{ on, attrs }">
        <v-btn color="primary" dark v-bind="attrs" v-on="on">
          Withdraw Credit
        </v-btn>
      </template>
      <v-card>
        <v-card-title>
          <span class="headline">Withdraw your credit from the contract</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="8">
                <v-list-item>
                  <v-list-item-title>Your Credit</v-list-item-title>
                  <v-list-item-subtitle>{{ userCredit }}</v-list-item-subtitle>
                </v-list-item>
              </v-col>
              <v-col cols="4">
                <v-btn color="blue darken-1" text @click="updateUserCredit">
                  Refresh
                </v-btn>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="close">
            Close
          </v-btn>
          <v-progress-circular
            indeterminate
            color="primary"
            v-if="loading"
          ></v-progress-circular>
          <v-btn v-else color="blue darken-1" text @click="withdrawCredit">
            Withdraw
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>
</template>

<script>
import { mapGetters, mapActions } from "vuex";

export default {
  name: "WithdrawCredit",
  data() {
    return {
      dialog: false,
      loading: false,
    };
  },
  computed: mapGetters("contractModule", ["userCredit"]),
  methods: {
    ...mapActions("contractModule", ["withdrawCredit", "updateUserCredit"]),
    async submit() {
      try {
        this.loading = true;
        await this.withdrawCredit();
        this.dialog = false;
      } finally {
        this.loading = false;
      }
    },
    close() {
      this.dialog = false;
    },
  },
};
</script>
