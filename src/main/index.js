'use strict'

import { app, BrowserWindow, ipcMain, Menu, ipcRenderer } from 'electron'
import Common from '../common';
import path from 'path';
const { shell } = require('electron') // deconstructing assignment
import Store from '../renderer/components/store';


// const LNDB = require('lndb')
// const db = new LNDB('your/path')
// 初始类型
// const pg = db.init('page')
const { dialog } = require('electron')
const { Tray } = require('electron');

import fs from 'fs';

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
	global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

const loginURL = process.env.NODE_ENV === 'development'
	? `http://localhost:9080`
	: `file://${__dirname}/index.html`

const listURL = process.env.NODE_ENV === 'development'
	? `http://localhost:9080#list`
	: `file://${__dirname}/index.html#list`

const store = new Store({
	// We'll call our data file 'user-preferences'
	configName: 'ubbey-info',
	defaults: {
		// 800x600 is the default size of our window
		downloadPath: 'jkk'
	}
});
class ElectronicUbbey {
	constructor() {
		const appName = app.getName();
		const appPath = path.join(app.getPath("appData"), appName);
		const thumbnailPath = path.join(appPath, 'thumbnail');
		console.log("appPath:" + appPath);
		console.log("thumbnailPath:" + thumbnailPath);

		this.mainWindow = null;

		// console.log('llll' + JSON.stringify(store));
		// console.log('hhhh' + store.set('downloadPath', 'kkk'));
		// console.log('jjjj' + store.get('downloadPath'));
		let downloadPath = store.get('downloadPath') || ''//pg.get('downloadPath');
		this.shareObjects = {
			box: null,
			userInfo: null,
			loginInfo: null,
			cookie: '',
			appPath: appPath,
			downloadPath: downloadPath || process.env.HOME + "/Downloads"
		}

		//创建缩略图文件夹
		if (!fs.existsSync(thumbnailPath)) {
			fs.mkdirSync(thumbnailPath);
		}

	}

	init() {
		this.makeSingleInstance();
		this.initApp();
		this.initIPC();
	}

	makeSingleInstance() {

	}

	initApp() {
		app.on('ready', () => {
			this.createMainWindow();
			this.setMenu();
		});

		app.on('activate', () => {
			this.makeSingleInstance();
		});
	};

	initIPC() {
		ipcMain.on('log', (event, message) => {
			console.log(message);
		});

		ipcMain.on('login-finished', (event) => {
			//登录流程结束，进入列表页
			this.mainWindow.loadURL(listURL);
		});
		ipcMain.on('logout-finished', (event) => {
			//登录流程结束，进入列表页
			this.mainWindow.loadURL(loginURL);
		});

		ipcMain.on('update-global', (event, key, value) => {
			this.shareObjects[key] = value;
		})

		ipcMain.on('get-global', (event, key) => {
			// event.sender.send(this.shareObjects[key]);
			event.returnValue = this.shareObjects[key];
		})
	};

	selectDirectory() {
		console.log("++++++++++++")
		let path = dialog.showOpenDialog(this.mainWindow, {
			properties: ['openDirectory']
		});
		if (path) {
			console.log("用户已更新下载文件夹:" + path);
			this.shareObjects.downloadPath = path;
			// console.log(store)
			store.set('downloadPath', path);
			// console.log('jjjj' + store.get('downloadPath'));
			// pg.set('downloadPath', path);
		} else {
			console.log("用户取消了下载文件夹变更");
		}
	}

	setMenu() {
		let self = this;
		// Create the Application's main menu
		var template = [
			{
				label: app.getName(),
				submenu: [
					{ label: "关于", accelerator: "CmdOrCtrl+B", selector: "orderFrontStandardAboutPanel:" },
					{
						label: "设置下载文件夹", accelerator: "Shift+CmdOrCtrl+O", click: function () {
							console.log("------");
							//设置下载文件夹
							self.selectDirectory();

						}
					},
					{
						label: "检查更新", accelerator: "CmdOrCtrl+U", click: function () {
							//TODO
							// const appIcon = new Tray('assets/images/icon.png');

							dialog.showMessageBox(self.mainWindow, {
								title: "检查更新",
								message: "您当前已经是最新版本"
							});
						}
					},
					{
						label: "退出", accelerator: "CmdOrCtrl+Q", click: function () { app.quit(); }
					}
				]
			},
			// { label: "Quit", accelerator: "Command+Q", click: function () { app.quit(); } },
			{
				label: "编辑",
				submenu: [

					{
						label: "全选", accelerator: "CmdOrCtrl+A", click: function () {
							//选中所有
							self.mainWindow.webContents.send("select-all")
						}
					},
					{
						label: "下载", accelerator: "Shift+CmdOrCtrl+D", function() {
							//下载选中文件
							self.mainWindow.webContents.send("download-all");
						}
					},
					{ type: "separator" },
					{
						label: "刷新", accelerator: "CmdOrCtrl+F", click: function () {
							//刷新列表
							self.mainWindow.webContents.send("refresh-list");
						}
					},
					{
						label: "打开下载文件夹", accelerator: "CmdOrCtrl+O", click: function () {
							shell.openItem(self.shareObjects.downloadPath); //打开下载文件夹
						}
					}
				],
			},
			{
				label: "窗口",
				submenu: [
					{ label: "最小化", accelerator: "CmdOrCtrl+M", role: "minimize" },
					{
						label: "缩放", accelerator: "Shift+CmdOrCtrl+Z", click: function () {
							Common.ISMAX = !Common.ISMAX;
							if (Common.ISMAX) {
								self.mainWindow.maximize();
							} else {
								self.mainWindow.setSize(Common.WINDOW_SIZE.width, Common.WINDOW_SIZE.height);
							}
							self.mainWindow.center();
						}
					}
				]
			},
			{
				label: "帮助",
				submenu: [
					{
						label: "使用帮助", accelerator: "CmdOrCtrl+H", click() {
							shell.openExternalSync('https://ubbey.org');
						}
					},
				]
			}];


		Menu.setApplicationMenu(Menu.buildFromTemplate(template));
	}


	createMainWindow() {
		var self = this;
		this.mainWindow = new BrowserWindow({
			width: Common.WINDOW_SIZE.width,
			height: Common.WINDOW_SIZE.height,
			title: Common.FILES_TITLE,
			resizable: true,
			center: true,
			show: false,
			frame: true,
			movable: true,
			autoHideMenuBar: true,
			// fullscreen: true,
			// alwaysOnTop: true,
			backgroundColor: '#302F34',
			titleBarStyle: 'hidden',
			webPreferences: {
				nodeIntegration: true,
				webSecurity: false,
				// devTools: false,
			}
			// titlebarAppearsTransparent: 'YES'
		});
		this.mainWindow.loadURL(loginURL);
		this.mainWindow.webContents.closeDevTools();
		// this.setMenu();
		this.mainWindow.on('ready-to-show', function () {
			self.mainWindow.show();
			self.mainWindow.focus();
		});
	}
}

new ElectronicUbbey().init();

