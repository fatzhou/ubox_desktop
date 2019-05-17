<template>
  <div class="main-box">
    <div class="right-box">
      <div class="content-box">
        <p class="title">Login</p>
        <p class="title-des">Beyond blockchain,</p>
        <p class="title-des">open the gate to the decentralized future</p>
        <label for="username" class="form-input mar-btm-20 mar-top-45">
          <input type="text" value="1@qq.com" id="username" v-on:input="usernameChange" v-model="username">
          <span class="label" id="username-wrap" :class="usernameActive">Email</span>
        </label>
        <label for="password" class="form-input">
          <input type="password" value="A123456789" id="password" v-on:input="passwordChange" v-model="password">
          <span class="label" id="password-wrap" :class="passwordActive">Password</span>
        </label>
        <div class="login-btn hide-load" id="submit-btn" v-on:click="sbumitForm()">
          <span class="loading" v-if="isShowLoading"></span>Log in
        </div>
      </div>
    </div>
    <div class="alert-box box-hide">
      <div class="alert-status"></div>
      <div class="alert-text">告知当前状态，信息和解决方法，最多不超过2行内容告知当前状态，信息和解决方法，最多不超过2行内容</div>
    </div>
  </div>
</template>

<script>
const { ipcRenderer } = require("electron");
// var common = require("./common").default;
import common from './common';
const md5 = require("md5");
const remote = require("electron").remote;

export default {
  name: "login-page",
  data() {
    return {
      boxIp: "",
      boxPort: "",
      username: '1@qq.com',
      password: 'A123456789',
      isShowLoading: false,
      usernameActive: '',
      passwordActive: '',
    };
  },
  methods: {
    usernameChange() {
        // if (this.username.length > 0) {
        //     this.usernameActive = 'active';
        //     let rep = /([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})/;
        //     if (rep.test(this.username)) {
        //         usernameInput.classList.remove('error');
        //     } else {
        //         usernameInput.classList.add('error');
        //         usernameInput.classList.add('shake');
        //         setTimeout(() => {
        //             usernameInput.classList.remove('shake');
        //         }, 100);
        //     }
        // } else {
        //     this.usernameActive = '';
        // }
    },
    passwordChange() {
        // if (this.password.length > 0) {
        //     passwordLabel.classList.add('active');
        // } else {
        //     passwordLabel.classList.remove('active');
        // }
    },
    sbumitForm() {
        // let usernameLabel = document.getElementById("username-wrap");
        // let passwordLabel = document.getElementById("password-wrap");
        // var submitBtn = document.getElementById('submit-btn');
        console.log("即将登录.....")
        if (this.isShowLoading == true) {
            console.log("正在提交.......")
            //正在提交中，防止重复提交
            return false;
        }
        // submitBtn.classList.add('active');
        setTimeout(()=> {
            // submitBtn.classList.remove('active');
            this.isShowLoading = true;
        },100)
        //提交数据
        let username = this.username,
            password = this.password;
        console.log("登录用户名：" + username + ",登录密码：" + password);
        // ipcRenderer.send('login', username, password);
        common.post('/ubbey/user/login', {
            uname: username,
            password: md5(password)
        },{})
        .then(res => {
            console.log(res)
            if(res.err_no != 0) {
                return Promise.reject(res);
            } 
            //开始获取盒子
            let unameHash = md5(username);
            return common.discovery(unameHash)
            .then(device => {
                console.log("搜索到盒子：" + JSON.stringify(device))
                if(device) {
                    ipcRenderer.send('update-global', 'box', device);
                    //解析盒子ip和端口
                    let location = device.URLBase;
                    let info = location.split(':');
                    common.setBox({
                        boxIp: info[0],
                        boxPort: info[1]
                    })
                    //开始登录盒子
                    return common.post('/ubeybox/user/login', {
                        username: username,
                        password: md5(password)
                    })
                    .then(res => {
                        console.log("登录成功.....，开始获取用户信息.......");
                        
                        if(res.err_no == 0) {
                            //登录成功，获取用户信息
                            return common.post('/ubeybox/user/get_userinfo', {})
                            .then(res => {
                                //设置用户信息
                                ipcRenderer.send('update-global', 'userInfo', res.data);
                                ipcRenderer.send('update-global', 'loginInfo', {
                                    username: username,
                                    password: md5(password)
                                });
            
                                if(res.err_no == 0) {
                                    console.log("获取用户信息成功.....", res.data);
                                    //登录完毕，通知mainWindow跳转
                                    ipcRenderer.send('login-finished');
                                }
                            })
                        }
                    })
                } else {
                    //没有找到盒子
                    return Promise.reject();
                }
            })
            .catch(e => {
                return Promise.reject();
            })
        })
        .catch(e => {
            console.log("登录失败.....")
            setTimeout(()=> {
                this.isShowLoading = false;
                if(!e) {
                    common.createToast('Your binding device is not online. Please check the network and power status');
                } else if(!e.err_no) {
                    common.createToast('Network connection failed, please check.');
                }
            },101)
        })
    }
  }
};
</script>
<style>
</style>
