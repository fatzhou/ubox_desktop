const state = {
  main: 0,
  isShowToast: false,
	toastText: '',
}

const mutations = {
  DECREMENT_MAIN_COUNTER (state) {
    state.main--
  },
  INCREMENT_MAIN_COUNTER (state) {
    state.main++
  },
  updateToastStatus(state,obj) {
    state.isShowToast = obj.isShowToast
    state.toastText = obj.toastText
  }
}

const actions = {
  someAsyncTask ({ commit }) {
    // do something async
    commit('INCREMENT_MAIN_COUNTER')
  }
}

export default {
  state,
  mutations,
  actions
}
