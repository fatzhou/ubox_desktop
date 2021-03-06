<template>
    <div class="main-list-box">
        <div class="header-box">
            <div class="option-btn">
                <span
                    class="back-btn"
                    :class="currPathList.length >= 2 ? '' : 'active'"
                    @click="goBack()"
                ></span>
                <span
                    class="next-btn"
                    :class="navBackList.length > 0 ? '' : 'active'"
                    @click="goNext()"
                ></span>
            </div>
            <div class="refresh-btn">
                <span @click="refreshFiles()"></span>
            </div>
            <div
                class="download-btn"
                v-if="selectFileList.length != 0"
                @click="downloadAllFiles()"
            >{{ l.DOWNLOAD }}</div>
            <div class="username" :class="isShowLogout ? 'active' :''" id="logout">
                <p @click="toggleLogout()">
                    {{ loginInfo.username }}
                    <em></em>
                </p>
                <div class="layout-box" @click="toggleLogout()">
                    <span class="label" @click="logout()">{{ l.LOGOUT }}</span>
                </div>
            </div>
        </div>
        <div class="body-box">
            <div class="left-box">
                <ul>
                    <li
                        v-on:click="changeDisk(disk)"
                        :class="disk.isSelect ? 'active' : ''"
                        v-for="disk in disks"
                        :key="disk.label"
                    >
                        <div class="img-div"></div>
                        <div class="diskinfo-div">
                            <p class="disk-name">{{ disk.label }}</p>
                            <p
                                class="disk-info"
                            >{{ disk.used | fileSize }} /{{ disk.size | fileSize }}</p>
                        </div>
                    </li>
                </ul>
                <div class="connect-status">
                    <span class="connect-circle">
                        <em></em>
                    </span>
                    {{ l.CONNECTED }}
                </div>
            </div>
            <div class="right-box">
                <div class="path">
                    <p>
                        <span v-for="path in currPathList" :key="path" @click="changePath(path)">
                            {{ path | pathName }}
                            <em></em>
                        </span>
                    </p>
                </div>
                <div class="file-list-box">
                    <div class="file-title">
                        <div
                            class="fl file-checkbox"
                            @click="toggleAllSelect()"
                            :class="isAllSelect ? 'select' : ''"
                        ></div>
                        <div class="fl file-name nobackground">{{ l.FILENAME }}</div>
                        <div class="fl file-size">{{ l.SIZE }}</div>
                        <div class="fl file-time">{{ l.TIME }}</div>
                    </div>
                    <ul>
                        <li
                            class="li-box"
                            v-for="file in fileList"
                            v-bind:key="file.name"
                            @click="toggleSelect(file)"
                        >
                            <div class="fl file-checkbox" :class="file.isSelect ? 'select' : ''"></div>
                            <div class="fl file-name">
                                <div class="file-type" :class="file.type">
                                    <img
                                        class="thumbnail"
                                        v-if="file.thumbnail"
                                        v-bind:src="file.thumbnail"
                                        @error="handleError(file)"
                                    />
                                </div>
                                <a
                                    href="javascript:void(0)"
                                    @click.stop
                                    @click="goNextFolder(file)"
                                >{{ file.name }}</a>
                                <span
                                    v-if="file.type != 'type-folder'"
                                    @click.stop="downloadFileToLocal(file.name, {toast: true})"
                                    class="download-icon"
                                ></span>
                            </div>
                            <div class="fl file-size">{{ file.size | fileSize }}</div>
                            <div class="fl file-time">{{ file.time }}</div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
        <div class="alert-box" v-if="isShowToast">
            <div class="alert-status"></div>
            <div class="alert-text">{{ toastText }}</div>
        </div>
    </div>
</template>

<script>
const remote = require("electron").remote;
const { ipcRenderer } = require("electron");
import common from "./common";
const SMB2 = require("@marsaud/smb2");
const FileTime = require("win32filetime");
import fs from "fs";
const md5 = require("md5");
import BigInt from "@marsaud/smb2/lib/tools/BigInt";
const querystring = require("querystring");
const http = require("http");

let K = 1024,
    M = 1024 * 1024,
    G = K * M;

export default {
    name: "list",
    data() {
        return {
            box: {},
            boxIp: "",
            boxPort: "",
            userInfo: {},
            loginInfo: {},
            smb2Client: null,
            smbConfig: null,
            toastStr: "",
            disks: [],
            fileList: [],
            navBackList: [],
            currPath: "",
            selectFileList: [],
            isShowLogout: false,
            isAllSelect: false,
            currPathList: [],
            disk: {},
            l: {
                TIME: "",
                LOGOUT: "",
                FILENAME: "",
                DOWNLOAD: "",
                CONNECTED: "",
                SIZE: "",

                DOWNLOADSUCCESS: "",
                CREATETASKSUCCEED: ""
            }
        };
    },
    filters: {
        pathName: function(path) {
            if (!path) return "";
            path = path.toString();
            if (path.length > 32) {
                return path.substr(0, 15) + "..." + path.substr(-15, 15);
            } else if (path.length > 16 && path.length < 32) {
                return path.substr(0, 15) + "...";
            } else {
                return path;
            }
        },
        fileSize: function(size) {
            if (!size) {
                return "--";
            } else {
                if (size < K) {
                    return size + "B";
                } else if (size < M) {
                    return (size / K).toFixed(2) + "KB";
                } else if (size < G) {
                    return (size / M).toFixed(2) + "MB";
                } else {
                    return (size / G).toFixed(2) + "GB";
                }
            }
        }
    },
    computed: {
        isShowToast() {
            return this.$store.state.Counter.isShowToast;
        },
        toastText() {
            return this.$store.state.Counter.toastText;
        }
    },
    created() {
        this.toggleLanguage();
    },
    mounted() {
        this.initGlobalInfo();
        this.initSamba();
        this.init();

        ipcRenderer.on("lang-changed", (event, lang) => {
            console.log("Lang changed to " + JSON.stringify(lang));
            this.toggleLanguage();
        });
    },
    methods: {
        toggleLanguage() {
            //获取语言文件
            let lang = ipcRenderer.sendSync("get-lang");
            for (let i in this.l) {
                this.l[i] = lang[i];
                console.log(i, this.l[i]);
            }
        },
        initGlobalInfo() {
            this.box = ipcRenderer.sendSync("get-global", "box");
            this.userInfo = ipcRenderer.sendSync("get-global", "userInfo");
            this.loginInfo = ipcRenderer.sendSync("get-global", "loginInfo");
            common.log(this.box, this.userInfo, this.loginInfo);
        },
        initSamba() {
            let location = this.box.URLBase;
            var boxIp = location.split(":")[0];
            var boxPort = location.split(":")[1];

            common
                .post(
                    "/ubeybox/service/pc_getsambaconf",
                    {},
                    {
                        boxIp: boxIp,
                        boxPort: boxPort
                    }
                )
                .then(res => {
                    console.log("succeed to get smb config....");
                    if (res.err_no == 0) {
                        this.smbConfig = {
                            share: "\\\\" + boxIp + "\\" + res.tag,
                            domain: res.tag,
                            autoCloseTimeout: 30000, //设置此参数以后不会自动关闭连接，需要手动调用smb2Client.disconnect();
                            username: res.samba_uname,
                            password: res.samba_pwd
                            // username: this.loginInfo.username,
                            // password: this.loginInfo.password,
                        };
                        console.log("Connect to smb...");
                        this.reConnectSamba();
                        setTimeout(() => {
                            console.log("Start to get disk info");
                            this.renderDisks();
                        }, 300);
                    }
                });
        },
        downloadAllFiles() {
            let isShowToast = true;
            isShowToast = this.selectFileList.length > 0 ? true : false;
            this.selectFileList.map(item => {
                if (item.type != "type-folder") {
                    this.downloadFileToLocal(item.name);
                }
            });
            this.selectFileList = [];
            this.toggleAllSelect(0);
            if (isShowToast) {
                common.createToast(
                    this.l.CREATETASKSUCCEED +
                        ipcRenderer.sendSync("get-global", "downloadPath")
                );
            }
        },
        downloadFileToLocal(name, options) {
            options = options || {};
            let remotePath = this.currPath + "\\" + name,
                localPath =
                    ipcRenderer.sendSync("get-global", "downloadPath") +
                    "/" +
                    name;
            this.downloadFile(remotePath, localPath, null, null, {
                toast: !!options.toast
            });
        },
        downloadFile(remotePath, localPath, callback, errorCallback, options) {
            common.log(`Download ${remotePath} to ${localPath}`);
            options = options || {};
            if (options.toast) {
                common.createToast(
                    this.l.CREATETASKSUCCEED +
                        ipcRenderer.sendSync("get-global", "downloadPath")
                );
            }
            this.reConnectSamba();
            this.smb2Client.createReadStream(remotePath, (err, readStream) => {
                if (err) {
                    // this.smb2Client.disconnect();
                    // this.smb2Client = new SMB2(this.smbConfig);
                    return;
                }
                var writeStream = fs.createWriteStream(localPath + ".tmp");
                writeStream.on("finish", function() {
                    common.log("File download successfully event....");
                    //重命名
                    fs.renameSync(localPath + ".tmp", localPath);
                    callback && callback();
                });
                writeStream.on("error", function() {
                    common.log("File download failed event....");
                    errorCallback && errorCallback();
                });
                readStream.pipe(writeStream);
            });
        },
        renderDisks() {
            let location = this.box.URLBase;
            var boxIp = location.split(":")[0];
            var boxPort = location.split(":")[1];
            let diskCount = 0;
            this.boxIp = boxIp;
            this.boxPort = boxPort || 37867;
            common.log("Box ip:" + boxIp + ",port:" + boxPort);
            this.reConnectSamba();
            this.smb2Client.readdir("", (err, content) => {
                if (err) {
                    console.log("Samba error....");
                    this.smb2Client.disconnect();
                    this.smb2Client = new SMB2(this.smbConfig);
                    setTimeout(() => {
                        this.renderDisks();
                    }, 1000);
                    return;
                }
                if (!content || !content.length) {
                    return false;
                }
                console.log("Start to get disk status....");
                this.currPath = content[0].Filename;
                common
                    .post(
                        "/ubeybox/device/get_status",
                        {},
                        {
                            boxIp: boxIp,
                            boxPort: boxPort
                        }
                    )
                    .then(res => {
                        if (res.err_no == 0) {
                            let disks = [];
                            res.disks = res.disks || [];
                            console.log("Disk info:" + JSON.stringify(content));
                            res.disks.forEach(item => {
                                let uuid = item.uuid.replace(/-/g, "");
                                let cont = content.find(disk => {
                                    return uuid == disk.Filename;
                                });
                                if (!cont) {
                                    return false;
                                }
                                let label =
                                    item.label ||
                                    "Disk " +
                                        String.fromCharCode(
                                            "A".charCodeAt(0) + diskCount++
                                        );
                                disks.push({
                                    isSelect: false,
                                    name: item.uuid,
                                    label: label,
                                    size: item.size,
                                    used: item.used
                                });
                            });
                            if (disks[0]) {
                                common.log(
                                    "Set initial disk：" +
                                        JSON.stringify(disks[0])
                                );
                                disks[0].isSelect = true;
                                this.disk = disks[0];
                                this.initCurrPath();
                                this.renderFileList(disks[0].name);
                            }
                            this.disks = disks;
                        }
                    });
            });
        },
        computeGB(size) {
            if (!size) {
                return 0;
            } else {
                return (size / Math.pow(2, 30)).toFixed(2);
            }
        },
        reConnectSamba() {
            if (
                !this.smb2Client ||
                this.smb2Client.socket.readyState == "closed"
            ) {
                console.log("Start to init samba connect....");
                this.smb2Client = new SMB2(this.smbConfig);
                this.smb2Client.socket.on("close", () => {
                    console.log("Samba closed......");
                });
            }
        },
        renderFileList(folder, isInitPath = false) {
            common.log("Check folder-----：" + folder);
            this.reConnectSamba();
            let self = this;
            try {
                this.smb2Client.readdir(folder, (err, content) => {
                    console.log("Smb return....", err, content);
                    if (err) {
                        this.smb2Client.disconnect();
                        this.smb2Client = new SMB2(this.smbConfig);
                        // this.renderFileList(folder);
                        // throw err;
                        return;
                    }
                    common.log(content);
                    window.content = content; //For debug

                    let fileList = [],
                        folderList = [];
                    if (isInitPath) {
                        self.currPath = folder;
                        self.initCurrPath();
                    }
                    content.forEach(item => {
                        if (/\.uploading$/g.test(item.Filename)) {
                            return;
                        }
                        var low = item.LastWriteTime.readUInt32LE(0),
                            high = item.LastWriteTime.readUInt32LE(4);
                        var lastWriteTime = self.transferDate(
                            FileTime.toDate({
                                low: low,
                                high: high
                            })
                        );
                        var typeTest = /[.]/g;
                        var type =
                            item.FileAttributes == 16
                                ? "type-folder"
                                : self.getFileType(item.Filename);
                        let file = {
                            isSelect: false,
                            name: item.Filename,
                            type: type,
                            size: BigInt.fromBuffer(item.EndofFile).toNumber(),
                            time: lastWriteTime
                        };
                        if (item.FileAttributes == 16) {
                            folderList.push(file);
                        } else {
                            //该属性可以用于检测MIME
                            fileList.push(file);
                        }
                    });
                    //图片文件获取缩略图
                    self.fileList = folderList.concat(fileList);
                    setTimeout(() => {
                        self.getThumbnail(folder, fileList);
                    }, 200);
                });
            } catch (e) {
                console.log("Readdir catch.......");
                this.smb2Client.disconnect();
                this.smb2Client = new SMB2(this.smbConfig);
                this.renderFileList(folder);
            }
        },
        getThumbnail(folder, list) {
            common.log("Get thumbnail in folder:", folder);
            let regularFolder = folder.replace(/\\/g, "/");
            let uuid = regularFolder.replace(/^([^/]+)\/.+$/, "$1");
            let subFolder = regularFolder.replace(uuid, "");
            let self = this;
            for (let i = 0, len = list.length; i < len; i++) {
                let item = list[i];
                if (item.thumbnail) {
                    continue;
                }
                setTimeout(() => {
                    !(function(item) {
                        if (
                            item.type == "type-image" ||
                            item.type == "type-video"
                        ) {
                            let name =
                                md5(subFolder + "/" + item.name) + ".png";
                            let remotePath =
                                    uuid + "\\thumbnail.uploading\\" + name,
                                localPath =
                                    ipcRenderer.sendSync(
                                        "get-global",
                                        "appPath"
                                    ) +
                                    "/thumbnail/" +
                                    name,
                                localFullPath = localPath + ".tmp";

                            let fileExists = fs.existsSync(localPath);
                            // common.log("文件是否存在？" + fileExists + "," + localPath);
                            if (fileExists) {
                                common.log("Thumbnail exists:" + localPath);
                                item.thumbnail = "file://" + localPath;
                                self.fileList = self.fileList.slice();
                            } else {
                                // common.log(
                                //     `缩略图远程路径：${remotePath},本地路径：${localPath}`
                                // );
                                let params = {
                                    fullpath: subFolder + "/" + item.name,
                                    disk_uuid: uuid,
                                    is_thumbnail: 1
                                };
                                self.downloadThumbnail(params, item, {
                                    localFullPath,
                                    localPath
                                });
                            }
                        }
                    })(item);
                }, i * 100);
            }
        },
        downloadThumbnail(params, item, opt) {
            let self = this;
            let options = {
                hostname: self.boxIp,
                port: self.boxPort,
                path: `/ubeybox/file/download?${querystring.stringify(params)}`,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    cookie: ipcRenderer.sendSync("get-global", "cookie")
                },
                method: "GET"
            };
            // common.log(JSON.stringify(options));
            // common.getFile(options);
            var out = fs.createWriteStream(opt.localFullPath);
            let req = http.request(options, res => {
                var contentLength = parseInt(res.headers["content-length"]);

                var downLength = 0;

                res.on("data", chunk => {
                    downLength += chunk.length;
                    // data += chunk;
                    out.write(chunk, () => {});
                });
                res.on("end", () => {
                    if (downLength != contentLength) {
                        common.log(
                            "Content length not equal:" +
                                downLength +
                                "," +
                                contentLength
                        );
                    }
                    common.log("Succeed to download file:", opt.localPath);
                    //重命名
                    fs.renameSync(opt.localFullPath, opt.localPath);
                    item.thumbnail = "file://" + opt.localPath;
                    self.fileList = self.fileList.slice();
                });
            });
            req.write(querystring.stringify(params));
            req.on("error", e => {
                console.log("Download error for " + opt.localPath, e);
            });
            req.end();
        },
        getFileType(name) {
            //TODO: 根据名字后缀，计算file type
            let matches = name.match(/[^\.]+$/g);
            let style = (matches && matches[0]) || "";
            var suffix = style.toLowerCase();
            if (/^(jpe?g|png|gif|heic|tif?f|bmp|webp)$/.test(suffix)) {
                return "type-image";
            }
            if (
                /^(mp3|ogg|asf|wma|vqf|midi|module|ape|real|wav|flac|amr|m4a)$/.test(
                    suffix
                )
            ) {
                return "type-music";
            }
            if (
                /^(mp4|avi|rm|rmvb|mov|mp(e)g|mov|wmv|ts|3gp|flv|mkv)$/.test(
                    suffix
                )
            ) {
                return "type-video";
            }
            if (/^(doc|docx)$/.test(suffix)) {
                return "type-doc";
            }
            if (/^(txt)$/.test(suffix)) {
                return "type-txt";
            }
            if (/^(pdf)$/.test(suffix)) {
                return "type-pdf";
            }
            if (/^(ppt|pptx)$/.test(suffix)) {
                return "type-ppt";
            }
            if (/^(xls|xlsx)$/.test(suffix)) {
                return "type-xls";
            }
            if (/^(zip)$/.test(suffix)) {
                return "type-zip";
            }
            if (/^(torrent)$/.test(suffix)) {
                return "type-bt";
            }
            return "type-defalut";
        },

        transferDate(time) {
            //TODO: 根据时间戳，计算以下时间类型 2019-01-01 11:01:02
            var date = new Date(time);
            var month = date.getMonth() + 1;
            var split = "-";
            var needHours = true;
            var Y = date.getFullYear(),
                M = ("00" + month).slice(-2),
                D = ("00" + date.getDate()).slice(-2),
                h = ("00" + date.getHours()).slice(-2),
                m = ("00" + date.getMinutes()).slice(-2),
                s = ("00" + date.getSeconds()).slice(-2);
            var hours = " " + [h, m, s].join(":");
            if (needHours == false) {
                hours = "";
            }
            return [Y, M, D].join(split) + hours;
        },
        logout() {
            let location = this.box.URLBase;
            var boxIp = location.split(":")[0];
            var boxPort = location.split(":")[1];
            common
                .post(
                    "/ubeybox/user/logout",
                    {},
                    {
                        boxIp: boxIp,
                        boxPort: boxPort
                    }
                )
                .then(res => {
                    if (res.err_no == 0) {
                        common.setBox(null);
                        this.box = {};
                        ipcRenderer.send("logout-finished");
                    }
                });
        },
        changeDisk(disk) {
            this.disk = disk;
            this.selectFileList = [];
            this.fileList = [];
            this.disks.filter(item => {
                item.isSelect = false;
            });
            disk.isSelect = true;
            this.currPath = disk.name;
            this.initCurrPath();
            this.renderFileList(disk.name);
        },
        toggleLogout() {
            this.isShowLogout = !this.isShowLogout;
        },
        toggleSelect(file) {
            file.isSelect = !file.isSelect;
            if (file.isSelect) {
                this.selectFileList.push(file);
            } else {
                this.selectFileList = this.selectFileList.filter(item => {
                    return item.name != file.name;
                });
            }
            if (this.selectFileList.length < this.fileList.length) {
                this.isAllSelect = false;
            } else {
                this.isAllSelect = true;
            }
        },
        toggleAllSelect(isSelect = null) {
            if (isSelect == 0) {
                this.isAllSelect = false;
            } else {
                this.isAllSelect = !this.isAllSelect;
            }
            this.fileList.map(item => {
                item.isSelect = this.isAllSelect;
            });
            if (this.isAllSelect) {
                this.selectFileList = this.fileList;
            } else {
                this.selectFileList = [];
            }
        },
        goNextFolder(file) {
            if (file.type != "type-folder") {
                this.toggleSelect(file);
            } else {
                let currPath =
                    this.currPath.replace("\\" + file.name, "") +
                    "\\" +
                    file.name;
                this.renderFileList(currPath, true);
                this.isAllSelect = false;
                this.selectFileList = [];
                //进入下一级目录: 倘若是“连续”的，应当push进入navBackList, 否则，只把当前目录列入即可
                if (this.currPathList.length <= 2) {
                    this.navBackList = [];
                }
            }
        },
        changePath(path, isRefresh = false) {
            if (
                this.currPathList.indexOf(path) > -1 &&
                this.currPathList.indexOf(path) ==
                    this.currPathList.length - 1 &&
                !isRefresh
            ) {
                return false;
            }
            //重置currPathList和currPath
            if (this.currPathList.indexOf(path) > -1) {
                this.currPath = "";
                let pathList = [];
                pathList = this.currPathList.filter(item => {
                    return (
                        this.currPathList.indexOf(item) <=
                        this.currPathList.indexOf(path)
                    );
                });
                pathList[0] = this.disk.name;
                this.currPath = pathList.join("\\");
                this.initCurrPath();
            }
            common.log(this.currPath);
            //渲染新的currPath
            this.renderFileList(this.currPath);
        },
        initCurrPath() {
            //用于显示的path
            this.currPathList = this.currPath.split("\\");
            this.currPathList[0] = this.disk.label;
        },
        goBack() {
            if (this.currPathList.length >= 2) {
                let path = this.currPathList[this.currPathList.length - 2];
                this.navBackList.push(this.currPath);
                console.log(this.currPath);
                this.changePath(path);
            }
        },
        goNext() {
            if (this.navBackList.length > 0) {
                let path = this.navBackList.pop();
                this.renderFileList(path);
                //重新计算this.currPath，这个用于请求
                this.currPath = path;
                //更新用于显示的path
                this.initCurrPath();
            }
        },
        init() {
            ipcRenderer.on("refresh-list", () => {
                this.refreshFiles();
            });
            ipcRenderer.on("select-all", () => {
                this.isAllSelect = false;
                this.toggleAllSelect(true);
            });
            ipcRenderer.on("download-all", () => {
                this.downloadAllFiles();
            });
        },
        handleError(item) {
            if (item.thumbnail) {
                let localPath = item.thumbnail.replace(/^file:\/\//, "");
                let fileExists = fs.existsSync(localPath);
                if (fileExists) {
                    item.thumbnail = "";
                    fs.unlink(localPath, () => {
                        console.log("delete success");
                    });
                }
            }
        },
        refreshFiles() {
            let path = this.currPathList[this.currPathList.length - 1];
            this.changePath(path, true);
        }
    }
};
</script>

<style>
</style>
