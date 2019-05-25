<template>
    <div class="main-list-box">
        <div class="header-box">
            <div class="option-btn">
                <span
                    class="back-btn"
                    :class="currPathList.length >= 2 ? '' : 'active'"
                    @click="goBack()"
                ></span>
                <span class="next-btn active"></span>
            </div>
            <div
                class="download-btn"
                v-if="selectFileList.length != 0"
                @click="downloadAllFiles()"
            >Download</div>
            <div class="username" :class="isShowLogout ? 'active' :''" id="logout">
                <p @click="toggleLogout()">
                    {{ loginInfo.username }}
                    <em></em>
                </p>
                <span class="label" @click="logout()">Logout</span>
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
                            >{{ disk.used | fileSize }} GB/{{ disk.size | fileSize }} GB</p>
                        </div>
                    </li>
                </ul>
                <div class="connect-status">
                    <span class="connect-circle">
                        <em></em>
                    </span>
                    连接正常
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
                        <div class="fl file-name nobackground">File name</div>
                        <div class="fl file-size">Size</div>
                        <div class="fl file-time">Recent editing time</div>
                    </div>
                    <ul>
                        <li
                            class="li-box"
                            v-for="file in fileList"
                            v-bind:key="file.name"
                            @click="toggleSelect(file)"
                        >
                            <div class="fl file-checkbox" :class="file.isSelect ? 'select' : ''"></div>
                            <div
                                class="fl file-name"
                                :class="file.type"
                                :style="file.thumbnail ? 'background-image: url(' + file.thumbnail + ')' : ''"
                            >
                                <a
                                    href="javascript:void(0)"
                                    @click.stop
                                    @click="goNextFolder(file)"
                                >{{ file.name }}</a>
                                <span
                                    v-if="file.type != 'type-folder'"
                                    @click.stop="downloadFileToLocal(file.name)"
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
            smb2Client: {},
            smbConfig: null,
            toastStr: "",
            disks: [],
            fileList: [],
            currPath: "",
            selectFileList: [],
            isShowLogout: false,
            isAllSelect: false,
            currPathList: [],
            disk: {}
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
            common.log(this);
            return this.$store.state.Counter.isShowToast;
        },
        toastText() {
            return this.$store.state.Counter.toastText;
        }
    },
    mounted() {
        this.initGlobalInfo();
        this.initSamba();
        this.init();
    },
    methods: {
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
                    if (res.err_no == 0) {
                        this.smbConfig = {
                            share: "\\\\" + boxIp + "\\" + res.tag,
                            domain: res.tag,
                            autoCloseTimeout: 0, //设置此参数以后不会自动关闭连接，需要手动调用smb2Client.disconnect();
                            username: res.samba_uname,
                            password: res.samba_pwd
                            // username: this.loginInfo.username,
                            // password: this.loginInfo.password,
                        };
                        this.smb2Client = new SMB2(this.smbConfig);
                        this.renderDisks();
                    }
                });
        },
        downloadAllFiles() {
            this.selectFileList.map(item => {
                if (item.type != "type-folder") {
                    common.log(" +++++ " + item.name);
                    this.downloadFileToLocal(item.name);
                }
            });
            this.selectFileList = [];
            this.toggleAllSelect(0);
            common.createToast(
                "已经成功创建下载任务至" +
                    ipcRenderer.sendSync("get-global", "downloadPath")
            );
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
            common.log(`从${remotePath}下载文件到${localPath}`);
            options = options || {};
            if (options.toast) {
                common.createToast(
                    "已创建下载任务至" +
                        ipcRenderer.sendSync("get-global", "downloadPath")
                );
            }

            this.smb2Client.createReadStream(remotePath, function(
                err,
                readStream
            ) {
                if (err) throw err;
                var writeStream = fs.createWriteStream(localPath);
                writeStream.on("finish", function() {
                    common.log("文件下载完毕....");
                    callback && callback();
                });
                writeStream.on("error", function() {
                    common.log("文件下载失败....");
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
            common.log("盒子ip:" + boxIp + ",盒子端口：" + boxPort);
            this.smb2Client.readdir("", (err, content) => {
                if (!content || !content.length) {
                    return false;
                }
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
                            console.log("获取磁盘状态成功.....");
                            let disks = [];
                            res.disks = res.disks || [];
                            console.log("磁盘信息：" + JSON.stringify(content));
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
                                    name: cont.Filename,
                                    label: label,
                                    size: item.size,
                                    used: item.used
                                });
                            });
                            if (disks[0]) {
                                common.log(
                                    "设置初始磁盘：" + JSON.stringify(disks[0])
                                );
                                disks[0].isSelect = true;
                                this.disk = disks[0];
                                this.initCurrPath();
                            }
                            this.disks = disks;
                        }
                    });

                this.renderFileList(content[0].Filename);
            });
        },
        computeGB(size) {
            if (!size) {
                return 0;
            } else {
                return (size / Math.pow(2, 30)).toFixed(2);
            }
        },
        renderFileList(folder,isInitPath = false) {
            common.log("查询目录-----：" + folder);
            let self = this;
            try {
                this.smb2Client.readdir(folder, function(err, content) {
                    if (err) throw err;
                    common.log(content);
                    window.content = content; //For debug

                    let fileList = [],
                        folderList = [];
                    if(isInitPath) {
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
                    // self.getThumbnail(folder, fileList);
                });
            } catch (e) {
                console.log("Readdir catch.......");
                this.smb2Client.disconnect();
                this.smb2Client = new SMB2(this.smbConfig);
                this.renderFileList(folder);
            }
        },
        getThumbnail(folder, list) {
            common.log("获取以下缩略图：", folder);
            let uuid = folder.replace(/^([^/]+)\/.+$/, "$1");
            let subFolder = folder.replace(uuid, "");
            let self = this;
            for (let i = 0, len = list.length; i < len; i++) {
                let item = list[i];
                if (item.type == "type-image" || item.type == "type-video") {
                    let name = md5(subFolder + "/" + item.name) + ".png";
                    console.log(subFolder, "+++++++", item.name);
                    let remotePath = uuid + "\\thumbnail.uploading\\" + name,
                        localPath =
                            ipcRenderer.sendSync("get-global", "appPath") +
                            "/thumbnail/" +
                            name;

                    common.log(
                        `缩略图远程路径：${remotePath},本地路径：${localPath}`
                    );
                    !(function(index, value) {
                        self.downloadFile(remotePath, localPath, () => {
                            //下载成功
                            value.thumbnail = localPath;
                            console.log(index, value, "-------");
                            //触发UI更新
                            //self.$set(self.fileList, index, value);
                        });
                    })(i, item);
                }
            }
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
            return "file-name";
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
            if (disk.isSelect) {
                return false;
            }
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
                return false;
            }
            let currPath =
                this.currPath.replace("\\" + file.name, "") + "\\" + file.name;

            this.renderFileList(currPath, true);
            this.isAllSelect = false;
            this.selectFileList = [];
        },
        changePath(path) {
            if (
                this.currPathList.indexOf(path) > -1 &&
                this.currPathList.indexOf(path) == this.currPathList.length - 1
            ) {
                return false;
            }
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
            this.renderFileList(this.currPath);
        },
        initCurrPath() {
            this.currPathList = this.currPath.split("\\");
            this.currPathList[0] = this.disk.label;
        },
        goBack() {
            if (this.currPathList.length >= 2) {
                let path = this.currPathList[this.currPathList.length - 2];
                this.changePath(path);
            }
        },
        init() {
            ipcRenderer.on("refresh-list", () => {
                let path = this.currPathList[this.currPathList.length - 1];
                this.changePath(path);
            });
            ipcRenderer.on("select-all", () => {
                this.isAllSelect = false;
                this.toggleAllSelect(true);
            });
            ipcRenderer.on("download-all", () => {
                this.downloadAllFiles();
            });
        }
    }
};
</script>

<style>
</style>
