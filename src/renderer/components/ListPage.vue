<template>
  <div class="main-list-box">
    <div class="header-box">
      <div class="option-btn">
        <span class="back-btn" :class="currPathList.length >= 2 ? '' : 'active'" @click="goBack()"></span>
        <span class="next-btn active" ></span>
      </div>
      <div class="download-btn" v-if="selectFileList.length != 0" @click="downloadAllFiles()">Download</div>
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
          <li v-on:click="changeDisk(disk)" :class="disk.isSelect ? 'active' : ''" v-for="disk in disks" :key="disk.label">
            <div class="img-div"></div>
            <div class="diskinfo-div">
              <p class="disk-name">{{ disk.label }}</p>
              <p class="disk-info">{{ disk.used }} GB/{{ disk.size }} GB</p>
            </div>
          </li>
        </ul>
        <div class="connect-status">
          <span class="connect-circle">
            <em></em>
          </span>连接正常
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
            <div class="fl file-checkbox " @click="toggleAllSelect()" :class="isAllSelect ? 'select' : ''"></div>
            <div class="fl file-name nobackground">File name</div>
            <div class="fl file-size">Size</div>
            <div class="fl file-time">Recent editing time</div>
          </div>
          <ul >
			  <li class="li-box" v-for="file in fileList" v-bind:key="file.name"  @click="toggleSelect(file)">  
				<div class="fl file-checkbox" :class="file.isSelect ? 'select' : ''"></div>
				<div class="fl file-name "  :class="file.type"><a href="javascript:void(0)" @click.stop @click="goNextFolder(file)">{{ file.name }}</a><span v-if="file.type != 'type-folder'" @click.stop="downloadFileToLocal(file.name)" class="download-icon"></span></div>
				<div class="fl file-size">{{ file.size }}</div>
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
  filters:{
    pathName: function (path) {
      if (!path) return ''
      path = path.toString();
      if(path.length > 32) {
        return path.substr(0,15) + '...' + path.substr(-15,15);
      } else if (path.length > 16 && path.length < 32){
        return path.substr(0,15) + '...'
      } else {
        return path
      }
    }
  },
  computed: {
    isShowToast() {
      console.log(this);
      return this.$store.state.Counter.isShowToast;
    },
    toastText() {
      return this.$store.state.Counter.toastText;
    }
  },
  mounted() {
    this.initGlobalInfo();
    this.initSamba();
  },
  methods: {
    initGlobalInfo() {
      this.box = ipcRenderer.sendSync("get-global", "box");
      this.userInfo = ipcRenderer.sendSync("get-global", "userInfo");
      this.loginInfo = ipcRenderer.sendSync("get-global", "loginInfo");
      console.log(this.box, this.userInfo, this.loginInfo);
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
            this.smb2Client = new SMB2({
              share: "\\\\" + boxIp + "\\" + res.tag,
              domain: res.tag,
              autoCloseTimeout: 0, //设置此参数以后不会自动关闭连接，需要手动调用smb2Client.disconnect();
              username: res.samba_uname,
              password: res.samba_pwd
              // username: this.loginInfo.username,
              // password: this.loginInfo.password,
            });
            this.renderDisks();
          }
        });
    },
    downloadAllFiles() {
      this.selectFileList.map(item => {
        if (item.type != "type-folder") {
          console.log(" +++++ " + item.name);
          this.downloadFileToLocal(item.name);
        }
      });
      this.selectFileList = [];
      this.toggleAllSelect();
    },
    downloadFileToLocal(name) {
      let remotePath = this.currPath + "\\" + name,
        localPath = process.env.HOME + "/Downloads/" + name;
      this.downloadFile(remotePath, localPath);
    },
    downloadFile(remotePath, localPath) {
      console.log(`从${remotePath}下载文件到${localPath}`);
      this.smb2Client.createReadStream(remotePath, function(err, readStream) {
        if (err) throw err;
        var writeStream = fs.createWriteStream(localPath);
        writeStream.on("finish", function() {
          console.log("文件下载完毕....");
        });
        writeStream.on("error", function() {
          console.log("文件下载失败....");
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
      console.log("盒子ip:" + boxIp + ",盒子端口：" + boxPort);
      this.smb2Client.readdir("", (err, content) => {
        console.log(content);
        if (!content || !content.length) {
          return false;
        }
        this.renderFileList(content[0].Filename);
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
              content.forEach(item => {
                let disk = res.disks.find(disk => {
                  return disk.uuid == item.Filename;
                });
                let label =
                  disk && disk.label
                    ? disk.label
                    : "Disk " +
                      String.fromCharCode("A".charCodeAt(0) + diskCount++);
                disks.push({
                  isSelect: false,
                  name: item.Filename,
                  label: label,
                  size: this.computeGB(disk && disk.size),
                  used: this.computeGB(disk && disk.used)
                });
                if (disks[0]) {
                  disks[0].isSelect = true;
                  this.initCurrPath();
                  this.disk = disks[0];
                }
              });
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
    renderFileList(folder) {
      console.log("查询目录-----：" + folder);
      let self = this;
      this.smb2Client.readdir(folder, function(err, content) {
        console.log("abcd+++++++++");
        if (err) throw err;
        console.log(content);
        window.content = content; //For debug

        let fileList = [];
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

          fileList.push({
            isSelect: false,
            name: item.Filename,
            type: type,
            size: 0,
            time: lastWriteTime
          });
        });
        self.fileList = fileList;
      });
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
        /^(mp4|avi|rm|rmvb|mov|mp(e)g|mov|wmv|ts|3gp|flv|mkv)$/.test(suffix)
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
    toggleAllSelect() {
      this.isAllSelect = !this.isAllSelect;
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
      this.currPath =
        this.currPath.replace("\\" + file.name, "") + "\\" + file.name;
      this.renderFileList(this.currPath);
      this.isAllSelect = false;
      this.selectFileList = [];
      this.initCurrPath();
    },
    changePath(path) {
      if(this.currPathList.indexOf(path) > -1 && this.currPathList.indexOf(path) == this.currPathList.length - 1){
        return false
      }
        if(this.currPathList.indexOf(path) > -1) {
            this.currPath = '';
            let pathList = [];
            pathList = this.currPathList.filter(item => {
                return this.currPathList.indexOf(item) <= this.currPathList.indexOf(path)
            })
            pathList[0] = this.disk.name;
            this.currPath = pathList.join('\\');
            this.initCurrPath();
        }
        console.log(this.currPath);
        this.renderFileList(this.currPath);
    },
    initCurrPath() {
        this.currPathList = this.currPath.split('\\');
        this.currPathList[0] = this.disk.label;
    },
    goBack() {
      if(this.currPathList.length >= 2) {
        let path = this.currPathList[this.currPathList.length - 2];
        this.changePath(path);
      }
    }
  }
};
</script>

<style>
</style>
