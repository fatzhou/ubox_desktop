import Vue from 'vue'
import Vuex from 'vuex'

import { createPersistedState, createSharedMutations } from 'vuex-electron'
import modules from './modules'
import Counter from './modules/Counter'

Vue.use(Vuex)

export default new Vuex.Store({
	modules,
	Counter,
	plugins: [
		createPersistedState(),
		// createSharedMutations()
	],
	strict: process.env.NODE_ENV !== 'production'
})
