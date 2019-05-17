const https = require('https');
const http = require('http');
const querystring = require("querystring");
var env = "test";
import Common from '../../Common';
var upnp = require('node-upnp-utils');

var common = {
	env: "test",
	box: null,
	cookie: '',
	post(url, params, opt) {
		console.log("start to post..........")
		return new Promise((resolve, reject) => {
			console.log("aaaaa")
			opt = opt || {};
			console.log("bbbb")
			var options = {
				hostname: (common.box && common.box.boxIp) || (this.env == "test" ? 'www.yqtc.co' : 'api.yqtc.co'),
				port: (common.box && common.box.boxPort) || 443,
				path: (this.env == 'test' && !common.box) ? '/iamtest' + url : url,
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'cookie': this.cookie
				},
				method: 'POST'
			};
			console.log("ccccc")
			let postTool = common.box ? http : https;
			console.log("start to call..........")
			var req = postTool.request(options, (res) => {
				console.log('响应头部:', res.headers);
				if (res.headers['set-cookie']) {
					this.cookie = res.headers['set-cookie'];
				}
				res.setEncoding('utf8');
				var data = '';
				res.on('data', (chunk) => {
					// process.stdout.write(d);
					data += chunk;
				});
				res.on('end', () => {
					console.log('请求响应：' + data + ",url:" + url);
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
			console.log("请求已发送:" + url + ",参数：" + querystring.stringify(params));
			req.end();
		})

	},
	setBox(box) {
		this.box = box;
	},
	getBox() {
		return this.box;
	},
	discovery(unameHash) {
		return new Promise((resolve, reject) => {
			upnp.startDiscovery({
				st: 'upnp:ubbeybox',
				mx: 3
			});

			let timeout = setTimeout(() => {
				upnp.stopDiscovery(() => {
					var device_list = upnp.getActiveDeviceList();
					console.log(device_list.length + ' devices (services) were found.');
					let device = device_list.find(item => {
						item.bindUserHash == unameHash
					});
					resolve(device);
				});
			}, 10000);

			upnp.on('added', (device) => {
				console.log(device)
				var bindUserHash = device.device.bindUserHash,
					boxId = device.device.boxId;
				if (bindUserHash == unameHash) {
					resolve(device);
					if (timeout) {
						clearTimeout(timeout);
						timeout = null;
					}
				}
			});
		})
	},
	createToast(err_msg) {
		let alertBox = document.getElementsByClassName("alert-box");
		let alertText = document.getElementsByClassName("alert-text");
		alertBox[0].classList.remove('box-hide');
		alertText[0].innerHTML = err_msg;
		setTimeout(() => {
			alertBox[0].classList.add('box-hide');
		}, 4000)
	},
	// eventDelegate(root, eventName, selector, callback) {
	// 	root.addEventListener(eventName, function (e) {
	// 		console.log("34567")
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
	// 			console.log('子元素命中！');
	// 			callback(e, l);
	// 		}
	// 	})
	// }
};

export default common;