'use strict'

import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import Common from '../common';
import path from 'path';
// const LNDB = require('lndb')
// const db = new LNDB('your/path')
// 初始类型
// const pg = db.init('page')
const { dialog } = require('electron')
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

class ElectronicUbbey {
	constructor() {
		this.mainWindow = null;
		let downloadPath = ''//pg.get('downloadPath');
		this.shareObjects = {
			box: null,
			userInfo: null,
			loginInfo: null,
			cookie: '',
			downloadPath: downloadPath || process.env.HOME + "/Downloads"
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
			// this.createFilesWindow();
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
			// pg.set('downloadPath', path);
		} else {
			console.log("用户取消了下载文件夹变更");
		}
	}

	setMenu() {
		let self = this;
		// Create the Application's main menu
		var template = [{
			label: "应用",
			submenu: [
				{ label: "关于", accelerator: "CmdOrCtrl+Z", selector: "orderFrontStandardAboutPanel:" },
				{ label: "设置", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
				{ label: "检查更新", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
<<<<<<< HEAD
				{ label: "退出", accelerator: "CmdOrCtrl+Z", click: function () { app.quit(); } },
=======
				{ type: "separator" },
				{ label: "退出", accelerator: "CmdOrCtrl+Z", click: function () { app.quit(); }}
>>>>>>> cc4a21e92de40afdac3783a32c15fc6379d59e95
				// { label: "Quit", accelerator: "Command+Q", click: function () { app.quit(); } },
			]
		}, {
			label: "编辑",
			submenu: [
				{ label: "全选", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
				{
					label: "下载", accelerator: "Shift+CmdOrCtrl+Z", function() {

					}
				},
				{ type: "separator" },
				{ label: "删除", accelerator: "CmdOrCtrl+X", selector: "cut:" },
				{
					label: "刷新", accelerator: "CmdOrCtrl+C", click: function () {

					}
				},
				{ label: "打开下载文件夹", accelerator: "CmdOrCtrl+V", selector: "paste:" },
			]
		}, {
			label: "窗口",
			submenu: [
				{ label: "最小化", accelerator: "CmdOrCtrl+Z", role: "minimize" },
				{
					label: "缩放", accelerator: "Shift+CmdOrCtrl+Z", click: function () {

					}
				},
				{ label: "关闭", accelerator: "CmdOrCtrl+X", selector: "close:" },
			]
		}, {
			label: "帮助",
			submenu: [
				{
					label: "使用帮助", accelerator: "CmdOrCtrl+Z", click() { require('electron').shell.openExternalSync('https://electronjs.org') }
				},
			]
		}
		];
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
			frame: false,
			movable: true,
			autoHideMenuBar: true,
			// fullscreen: true,
			// alwaysOnTop: true,
			icon: 'assets/icon.png',
			titleBarStyle: 'hidden',
			webPreferences: {
				nodeIntegration: true,
				// devTools: false,
			}
			// titlebarAppearsTransparent: 'YES'
		});
		this.mainWindow.loadURL(loginURL);
		this.setMenu();
		this.mainWindow.webContents.closeDevTools();
		this.mainWindow.on('ready-to-show', function () {
			self.mainWindow.show();
			self.mainWindow.focus();
		});

	}
}

new ElectronicUbbey().init();

