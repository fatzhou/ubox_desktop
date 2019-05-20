'use strict'

import { app, BrowserWindow, ipcMain } from 'electron'
import Common from '../common';
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
		this.shareObjects = {
			box: null,
			userInfo: null,
			loginInfo: null,
			cookie: ''
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
				nodeIntegration: true
			}
			// titlebarAppearsTransparent: 'YES'
		});
		this.mainWindow.loadURL(loginURL);
		this.mainWindow.webContents.openDevTools();
		this.mainWindow.on('ready-to-show', function () {
			self.mainWindow.show();
			self.mainWindow.focus();
		});
	}
}

new ElectronicUbbey().init();

