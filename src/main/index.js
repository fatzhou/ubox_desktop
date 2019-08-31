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
var appTray = null;
import fs from 'fs';
const { download } = require("electron-dl");

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

// const appIconPath = process.env.NODE_ENV === 'development'
// 	? `file://${__dirname}/../renderer/assets/images/icon.ico`
// 	: `file://${__dirname}/../renderer/assets/images/icon.ico`

const store = new Store({
	// We'll call our data file 'user-preferences'
	configName: 'ubbey-info',
	defaults: {
		// 800x600 is the default size of our window
		downloadPath: process.env.HOME + "/Downloads",
		currLang: app.getLocale()
	}
});

const langList = ['cn', 'en'];


class ElectronicUbbey {
	constructor() {
		const appName = app.getName();
		const appPath = path.join(app.getPath("appData"), appName);
		let thumbnailPath = '';
		if (fs.existsSync(appPath)) {
			thumbnailPath = path.join(appPath, 'thumbnail');
		} else {
			//没有创建目录
			thumbnailPath = process.env.HOME + "/Downloads/thumbnail";
		}
		console.log("appPath:" + appPath);
		console.log("thumbnailPath:" + thumbnailPath);

		this.mainWindow = null;
		let downloadPath = store.get('downloadPath');
		console.log("Download path:", downloadPath)
		this.shareObjects = {
			box: null,
			userInfo: null,
			loginInfo: null,
			cookie: '',
			appPath: appPath,
			platform: process.platform,
			downloadPath: downloadPath || process.env.HOME + "/Downloads"
		}

		//创建缩略图文件夹
		if (!fs.existsSync(thumbnailPath)) {
			fs.mkdirSync(thumbnailPath);
		}

		//初始化语言
		let lang = store.get('currLang');
		if (langList.indexOf(lang) == -1) {
			lang = 'en'
		}
		this.currLang = lang;
		this.langFile = {};
		this.setLanguage(lang);
	}

	init() {
		this.makeSingleInstance();
		this.initApp();
		this.initIPC();
	}

	makeSingleInstance(cb) {
		let self = this;
		if (app.makeSingleInstance) {
			app.makeSingleInstance((argv, cmd) => {
				cb && cb();
			})
		} else if (app.requestSingleInstanceLock) {
			let lock = app.requestSingleInstanceLock();
			if (!lock) {
				app.quit()
			} else {
				app.on('second-instance', (event, argv, cwd) => {
					if (self.mainWindow) {
						if (self.mainWindow.isMinimized()) {
							self.mainWindow.restore();
							self.mainWindow.focus();
						}
					}
				})
			}

		} else {
			cb && cb();
		}
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

		ipcMain.on('get-lang', (event, key) => {
			// event.sender.send(this.shareObjects[key]);
			event.returnValue = this.langFile[this.currLang];
		})
	};

	selectDirectory() {
		let path = dialog.showOpenDialog(this.mainWindow, {
			properties: ['openDirectory']
		});
		if (path) {
			console.log("User update download path:", path);
			let pathStr = path.toString();
			this.shareObjects.downloadPath = pathStr;
			store.set('downloadPath', pathStr);
		} else {
		}
	}

	setMenu() {
		let self = this;
		// Create the Application's main menu
		var template = [
			{
				label: app.getName(),
				submenu: [
					{ label: self.__("ABOUT"), accelerator: "CmdOrCtrl+B", selector: "orderFrontStandardAboutPanel:" },
					{
						label: self.__("SETPATH"), accelerator: "Shift+CmdOrCtrl+O", click: function () {
							//设置下载文件夹
							self.selectDirectory();

						}
					},
					{
						label: self.__("CHECKUPDATE"), accelerator: "CmdOrCtrl+U", click: function () {
							//TODO
							// const appIcon = new Tray('assets/images/icon.png');

							dialog.showMessageBox(self.mainWindow, {
								title: self.__("CHECKUPDATE"),
								message: self.__("NEWESTVERSION")
							});
						}
					},
					{
						label: self.__("DEVELOPERMODE"), accelerator: "Shift+CmdOrCtrl+Q", click: function () {
							let isOpened = self.mainWindow.webContents.isDevToolsOpened();
							console.log(isOpened)
							if (isOpened) {
								self.mainWindow.webContents.closeDevTools();
							} else {
								self.mainWindow.webContents.openDevTools();
							}
						}
					},
					{
						label: self.__("QUIT"), accelerator: "CmdOrCtrl+Q", click: function () { app.quit(); }
					}
				]
			},
			// { label: "Quit", accelerator: "Command+Q", click: function () { app.quit(); } },
			{
				label: self.__("EDIT"),
				submenu: [

					{
						label: self.__("ALL"), accelerator: "CmdOrCtrl+A", click: function () {
							//选中所有
							self.mainWindow.webContents.send("select-all")
						}
					},
					{
						label: self.__("DOWNLOAD"), accelerator: "Shift+CmdOrCtrl+D", click: function () {
							//下载选中文件
							self.mainWindow.webContents.send("download-all");
						}
					},
					{ type: "separator" },
					{
						label: self.__("REFRESH"), accelerator: "CmdOrCtrl+F", click: function () {
							//刷新列表
							self.mainWindow.webContents.send("refresh-list");
						}
					},
					{
						label: self.__("OPENPATH"), accelerator: "CmdOrCtrl+O", click: function () {
							shell.openItem(self.shareObjects.downloadPath); //打开下载文件夹
						}
					}
				],
			},
			{
				label: self.__("WINDOW"),
				submenu: [
					{ label: self.__("MINIMIZE"), accelerator: "CmdOrCtrl+M", role: "minimize" },
					{
						label: self.__("ZOOM"), accelerator: "Shift+CmdOrCtrl+Z", click: function () {
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
				label: self.__("HELP"),
				submenu: [
					{
						label: self.__("USEHELP"), accelerator: "CmdOrCtrl+H", click() {
							shell.openExternal('https://ubbey.org');
						}
					},
				]
			},
			{
				label: self.__("LANGUAGE"),
				submenu: [
					{
						label: "中文", accelerator: "Shift+CmdOrCtrl+L+1", click() {
							if (self.currLang != 'cn') {
								self.currLang = "cn"
								self.setLanguage("cn");
								//通知渲染进程更新
								self.mainWindow.webContents.send("lang-changed", "cn");
								self.setMenu();
								store.set('currLang', 'cn')
							}
						}
					},
					{
						label: "English", accelerator: "Shift+CmdOrCtrl+L+2", click() {
							if (self.currLang != 'en') {
								self.currLang = "en"
								self.setLanguage("en");
								self.mainWindow.webContents.send("lang-changed", "en");
								self.setMenu();
								store.set('currLang', 'en')
							}
						}
					},
				]
			},
		];
		Menu.setApplicationMenu(Menu.buildFromTemplate(template));
	}

	setLanguage(lang) {
		if (this.langFile[lang]) {
			return this.langFile[lang];
		}
		let myPath = path.join(__dirname, "../translations/" + lang + '.json');
		if (!fs.existsSync(myPath)) {
			console.log("Language file not exists!!", lang);
			this.currLang = "en";
			myPath = path.join(__dirname, "../translations/en.json");
		}
		this.langFile[lang] = JSON.parse(fs.readFileSync(myPath), 'utf8');
		return this.langFile[lang];
	}

	__(phrase, arr) {
		let translation = this.langFile[this.currLang][phrase]
		if (translation === undefined) {
			translation = phrase
		}
		let index = 0;
		while (translation.indexOf('{{') > 0) {
			translation = translation.replace(/{{([^}]+)}}/, arr[index++] || "$1");
		}
		return translation
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
			autoHideMenuBar: false,
			// fullscreen: true,
			// alwaysOnTop: true,
			backgroundColor: '#302F34',
			titleBarStyle: 'hidden',
			fullscreenWindowTitle: true,
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
		this.mainWindow.on('close', (event) => {
			console.log('close')
			app.quit();
		});
		// console.log('__dirname' + __dirname);

		// var appIcon = new Tray(appIconPath);
		// console.log('appIconPath' + appIconPath);
		// // appIcon = new Tray(__dirname);

		// const contextMenu = Menu.buildFromTemplate([
		// 	{ label: 'Item1', type: 'radio' },
		// 	{ label: 'Item2', type: 'radio' }
		// ])

		// // Make a change to the context menu
		// contextMenu.items[1].checked = false

		// // Call this again for Linux because we modified the context menu
		// appIcon.setContextMenu(contextMenu);
	}
}

new ElectronicUbbey().init();

