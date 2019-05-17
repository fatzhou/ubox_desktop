import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
	routes: [
		{
			path: '/',
			name: 'login',
			component: require('@/components/LoginPage').default
		},
		{
			path: '/',
			name: 'list',
			component: require('@/components/ListPage').default
		},
		{
			path: '*',
			redirect: '/'
		}
	]
})
