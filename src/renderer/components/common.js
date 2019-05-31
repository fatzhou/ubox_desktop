const http = require('http');
import axios from 'axios';
const querystring = require("querystring");
var env = "test";
import Common from '../../Common';
import { ipcRenderer } from 'electron';
var upnp = require('node-upnp-utils');
import store from '../store';

var upnp = require('node-upnp-utils');
var common = {
	env: "test",
	searching: false,
	box: null,
	post(url, params, opt) {
		common.log("start to post..........");
		return new Promise((resolve, reject) => {
			opt = opt || {};
			common.log("----", opt.boxIp, opt.boxPort)
			let cookie = ipcRenderer.sendSync("get-global", "cookie");
			var options = {
				// hostname: (common.box && common.box.boxIp) || (this.env == "test" ? 'www.yqtc.co' : 'api.yqtc.co'),
				hostname: opt.boxIp || common.box && common.box.boxIp,
				port: opt.boxPort || (common.box && common.box.boxPort) || 80,
				path: url,
				// path: (this.env == 'test' && !common.box) ? '/iamtest' + url : url,
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'cookie': cookie
				},
				method: 'POST'
			};
			let postTool = http;
			var req = postTool.request(options, (res) => {
				if (res.headers['set-cookie']) {
					let cookie = res.headers['set-cookie'];
					ipcRenderer.send('update-global', 'cookie', cookie);
				}
				res.setEncoding('utf8');
				var data = '';
				res.on('data', (chunk) => {
					// process.stdout.write(d);
					data += chunk;
				});
				res.on('end', () => {
					common.log('请求响应：' + data + ",url:" + url);
					var res = {};
					try {
						res = JSON.parse(data);
					} catch (e) {
						res = {};
						reject(JSON.parse(data));
						return;
					}
					if (!opt.muteError) {
						var err_no = res.err_no;
						if (Common.ERRORS[err_no]) {
							//弹出错误 blablabla....
							common.createToast(Common.ERRORS[err_no]);
						}
					}
					resolve(res);
				})
			});

			req.on('error', (e) => {
				console.error(e);
				reject(e);
			});
			req.write(querystring.stringify(params));
			common.log("请求已发送:" + url + ",参数：" + querystring.stringify(params));
			req.end();
		})

	},
	setBox(box) {
		this.box = box;
	},
	log(...args) {
		console.log(Date.now() + " | " + args.join('==='));
	},
	getBox() {
		return this.box;
	},
	discovery(unameHash) {
		return new Promise((resolve, reject) => {
			common.log("即将开始搜索盒子.....");
			if (this.searching) {
				common.log("正在搜索.....");
				reject('searching');
			}
			this.searching = true;
			common.log("开始调用startDiscovery.....");

			try {
				upnp.startDiscovery({
					st: 'upnp:ubbeybox',
					mx: 3
				});
			} catch (e) {
				console.log("哎哎哎", e);
				throw e;
			}


			common.log("startDiscovery调用完毕.....");

			let timeout = setTimeout(() => {
				common.log("并未搜索到设备，超时结束.......");
				upnp.stopDiscovery(() => {
					common.log('stopDiscovery');
					this.searching = false;
					var device_list = upnp.getActiveDeviceList();
					common.log(device_list.length + ' devices (services) were found.');
					let device = device_list.find(item => {
						item.bindUserHash == unameHash
					});
					resolve(device);
				});
				// this.searching = false; //stopdiscovery的回调经常执行不了，直接更改状态
				// resolve(null);
			}, 8000);

			upnp.on('added', (device) => {
				common.log("搜索到设备:", JSON.stringify(device));
				var bindUserHash = device.device.bindUserHash,
					boxId = device.device.boxId;
				console.log("设备hash:" + bindUserHash + ", 用户hash:" + unameHash);
				if (bindUserHash == unameHash) {
					common.log("搜索到自己的设备....");
					if (timeout) {
						upnp.stopDiscovery(() => {
							common.log('stop')
							this.searching = false;
						});
						clearTimeout(timeout);
						timeout = null;
					}
					this.searching = false; //stopdiscovery的回调经常执行不了，直接更改状态
					resolve(device);
				}
			});
		})
			.catch(e => {
				this.searching = false;
				return Promise.reject('search box catch...', e);
			})
	},
	createToast(err_msg) {
		store.commit('updateToastStatus', {
			isShowToast: false,
			toastText: ''
		})
		store.commit('updateToastStatus', {
			isShowToast: true,
			toastText: err_msg
		})
		setTimeout(() => {
			store.commit('updateToastStatus', {
				isShowToast: false,
				toastText: err_msg
			})
		}, 4000)

	},
	// eventDelegate(root, eventName, selector, callback) {
	// 	root.addEventListener(eventName, function (e) {
	// 		common.log("34567")
	// 		var l = e.target;
	// 		if (selector.indexOf('.') < 0) {
	// 			while (l.tagName.toLowerCase() !== selector) {
	// 				l = l.parentNode
	// 				if (l === root) {
	// 					l = null
	// 					break;
	// 				}
	// 			}
	// 		} else {
	// 			let className = selector.replace('.', '');
	// 			while (l.classList.contains(className)) {
	// 				l = l.parentNode
	// 				if (l === root) {
	// 					l = null
	// 					break;
	// 				}
	// 			}
	// 		}
	// 		if (l) {
	// 			common.log('子元素命中！');
	// 			callback(e, l);
	// 		}
	// 	})
	// }
};

export default common;