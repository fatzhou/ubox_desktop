import Vue from 'vue'
import Router from 'vue-router'
import LoginPage from '../components/LoginPage'
import ListPage from '../components/ListPage'

Vue.use(Router)

export default new Router({
	routes: [
		{
			path: '/',
			name: 'login',
			component: LoginPage
		},
		{
			path: '/list',
			name: 'list',
			component: ListPage
		},
		{
			path: '*',
			redirect: '/list'
		}
	]
})
