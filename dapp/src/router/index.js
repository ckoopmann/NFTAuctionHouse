import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/new',
    name: 'Create Auction',
    component: () => import(/* webpackChunkName: "about" */ '../views/NewAuction.vue')
  },
  {
    path: '/openAuctions',
    name: 'Open Auctions',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/OpenAuctions.vue')
  }
]

const router = new VueRouter({
  routes
})

export default router
