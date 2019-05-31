<template>
    <div class="main-box">
        <div class="right-box">
            <div class="content-box">
                <p class="title">Login</p>
                <p class="title-des">Beyond blockchain</p>
                <p class="title-des">open the gate to the decentralized future</p>
                <label for="username" class="form-input mar-btm-20 mar-top-45">
                    <input
                        type="text"
                        value="1@qq.com"
                        id="username"
                        :class="usernameInputClass"
                        v-on:blur="testUsername()"
                        v-on:input="usernameChange"
                        v-model="username"
                    >
                    <span class="label" id="username-wrap" :class="usernameActive">Email</span>
                </label>
                <label for="password" class="form-input">
                    <input
                        type="password"
                        value="A123456789"
                        id="password"
                        v-on:input="passwordChange"
                        v-model="password"
                        @keyup.enter="submitForm"
                    >
                    <span class="label" id="password-wrap" :class="passwordActive">Password</span>
                </label>
                <div
                    class="login-btn"
                    id="submit-btn"
                    :class="clickSubmitClass"
                    v-on:click="submitForm()"
                >
                    <span class="loading"></span>Log in
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
const { ipcRenderer } = require("electron");
// var common = require("./common").default;
import common from "./common";
const md5 = require("md5");
const remote = require("electron").remote;

export default {
    name: "login",
    data() {
        return {
            boxIp: "",
            boxPort: "",
            //   username: "",
            //   password: "",
            username: "1@qq.com",
            password: "A123456789",
            // username: "619912987@qq.com",
            // password: "dh5819413",
            usernameActive: "",
            passwordActive: "",
            usernameInputClass: "",
            clickSubmitClass: "hide-load"
        };
    },
    computed: {
        isShowToast() {
            return this.$store.state.Counter.isShowToast;
        },
        toastText() {
            return this.$store.state.Counter.toastText;
        }
    },
    mounted() {
        if (this.username.length > 0) {
            this.usernameActive = "active";
        }
        if (this.password.length > 0) {
            this.passwordActive = "active";
        }
    },
    methods: {
        usernameChange() {
            if (this.username.length > 0) {
                this.usernameActive = "active";
            } else {
                this.usernameActive = "";
            }
        },
        testUsername() {
            if (this.username.length > 0) {
                let rep = /([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})/;
                if (rep.test(this.username)) {
                    this.usernameInputClass = "";
                } else {
                    this.usernameInputClass = "error shake";
                    setTimeout(() => {
                        this.usernameInputClass = "error";
                    }, 100);
                }
            }
        },
        passwordChange() {
            if (this.password.length > 0) {
                this.passwordActive = "active";
            } else {
                this.passwordActive = "";
            }
        },

        submitForm() {
            common.log("即将登录.....");
            if (this.clickSubmitClass.indexOf("hide-load") < 0) {
                common.log("正在提交.......");
                //正在提交中，防止重复提交
                return false;
            }
            this.clickSubmitClass = "active";
            setTimeout(() => {
                this.clickSubmitClass = "";
            }, 100);
            //提交数据
            let username = this.username,
                password = this.password;
            common.log("登录用户名：" + username + ",登录密码：" + password);
            // ipcRenderer.send('login', username, password);

            //开始获取盒子git s
            let unameHash = md5(username);
            return common
                .discovery(unameHash)
                .then(device => {
                    common.log("搜索到盒子：" + JSON.stringify(device));
                    if (device) {
                        ipcRenderer.send("update-global", "box", device);
                        //解析盒子ip和端口
                        let location = device.URLBase;
                        let info = location.split(":");
                        common.setBox({
                            boxIp: info[0],
                            boxPort: info[1]
                        });
                        //开始登录盒子
                        return common
                            .post("/ubeybox/user/login", {
                                username: username,
                                password: md5(password)
                            })
                            .then(res => {
                                common.log(
                                    "登录成功.....，开始获取用户信息......."
                                );

                                if (res.err_no == 0) {
                                    this.clickSubmitClass = "hide-load";
                                    //登录成功，获取用户信息
                                    return common
                                        .post("/ubeybox/user/get_userinfo", {})
                                        .then(res => {
                                            //设置用户信息
                                            ipcRenderer.send(
                                                "update-global",
                                                "userInfo",
                                                res.data
                                            );
                                            ipcRenderer.send(
                                                "update-global",
                                                "loginInfo",
                                                {
                                                    username: username,
                                                    password: md5(password)
                                                }
                                            );

                                            if (res.err_no == 0) {
                                                common.log(
                                                    "获取用户信息成功.....",
                                                    res.data
                                                );
                                                //登录完毕，通知mainWindow跳转
                                                ipcRenderer.send(
                                                    "login-finished"
                                                );
                                            }
                                        });
                                }
                            });
                    } else {
                        //没有找到盒子
                        return Promise.reject();
                    }
                })
                .catch(e => {
                    common.log("登录失败.....", e);
                    setTimeout(() => {
                        this.clickSubmitClass = "hide-load";
                        if (!e) {
                            common.createToast(
                                "Your binding device is not online. Please check the network and power status"
                            );
                        } else if (!e.err_no) {
                            common.createToast(
                                "Network connection failed, please check."
                            );
                        }
                    }, 101);
                });
        }
    }
};
</script>

<style>
</style>
