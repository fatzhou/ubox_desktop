<template>
  <div class="main-list-box">
    <div class="header-box">
      <div class="option-btn">
        <span class="back-btn"></span>
        <span class="next-btn active"></span>
      </div>
      <div class="download-btn">Download</div>
      <div class="username" id="logout">
        <p>
          {{ loginInfo.username }}
          <em></em>
        </p>
        <span class="label" @click="logout()">Logout</span>
      </div>
    </div>
    <div class="body-box">
      <div class="left-box">
        <ul>
          <li class="active">
            <div class="img-div"></div>
            <div class="diskinfo-div">
              <p class="disk-name">Disk A</p>
              <p class="disk-info">246 GB/982 GB</p>
            </div>
          </li>
          <li>
            <div class="img-div"></div>
            <div class="diskinfo-div">
              <p class="disk-name">Disk B</p>
              <p class="disk-info">246 GB/982 GB</p>
            </div>
          </li>
        </ul>
        <div class="connect-status">
          <span class="connect-circle error">
            <em></em>
          </span>连接正常
        </div>
      </div>
      <div class="right-box">
        <div class="path">
          <p>
            <span>
              Disk A
              <em></em>
            </span>
            <span>
              BackUp
              <em></em>
            </span>
          </p>
        </div>
        <div class="file-list-box">
          <div class="file-title">
            <div class="fl file-checkbox select"></div>
            <div class="fl file-name nobackground">File name</div>
            <div class="fl file-size">Size</div>
            <div class="fl file-time">Recent editing time</div>
          </div>
          <ul >
			  <li class="li-box" v-for="file in fileList" v-bind:key="file.name">  
				<div class="fl file-checkbox"></div>
				<div class="fl file-name ${type}">{{ file.Filename }}<span class="download-icon"></span></div>
				<div class="fl file-size">{{ file.size }}</div>
				<div class="fl file-time">{{ file.lastWriteTime }}</div>                      
			</li>
		  </ul>
        </div>
      </div>
    </div>
    <div class="alert-box box-hide">
		<div class="alert-status"></div>
		<div class="alert-text">{{ toastStr }}</div>
    </div>
  </div>
</template>

<script>
const remote = require("electron").remote;
const { ipcRenderer } = require("electron");
var common = require("./common");
const SMB2 = require("@marsaud/smb2");
const FileTime = require("win32filetime");

export default {
  name: "list-page",
  data() {
    return {
      box: {},
      userInfo: {},
      loginInfo: {},
      smb2Client: {},
	  toastStr: "",
      fileList: [],
    };
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
	  common.http('/ubeybox/service/pc_getsambaconf', {})
	  .then(res => {
		  if(res.err_no == 0) {
			this.smb2Client = new SMB2({
				share: "\\\\" + boxIp + "\\" + res.tag,
				domain: res.tag,
				username: res.samba_uname,
				password: res.samba_pwd
				// username: this.loginInfo.username,
				// password: this.loginInfo.password,
			});
			this.renderFileList("");
		  }
	  })
    },
    renderFileList(folder) {
      let self = this;
      this.smb2Client.readdir("", function(err, content) {
        if (err) throw err;
		console.log(content);
		window.content = content; //For debug

		let fileList = [];
		content.forEach(item => {
          if (/\.uploading$/g.test(item.Filename)) {
            return;
		  }	
		 var lastWriteTime = self.transferDate(
            FileTime.toDate({
              low: low,
              high: high
            })
		  );
		  var type =
			item.FileAttributes == 128
              ? "type-folder"
			  : self.getFileType(content[i].Filename);
			  
			fileList.push({
				name: item.Filename,
				type: type,
				size: 0,
				time: lastWriteTime
			})
		})

		this.fileList = fileList;
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
      return "type-ppt";
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
    logout() {}
  }
};
</script>

<style>
</style>
