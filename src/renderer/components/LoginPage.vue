<template>
    <div class="main-box">
        <div class="right-box">
            <div class="content-box">
                <p class="title">{{ l.LOGIN }}</p>
                <p class="title-des">{{ l.SLOGAN1 }}</p>
                <p class="title-des">{{ l.SLOGAN2 }}</p>
                <label for="username" class="form-input mar-btm-20 mar-top-45">
                    <input
                        type="text"
                        :placeholder="userPlaceholder"
                        id="username"
                        :class="usernameInputClass"
                        v-on:blur="testUsername()"
                        @focus="usernameFocus"
                        v-on:input="usernameChange"
                        v-model="username"
                    />
                    <span class="label" id="username-wrap" :class="usernameActive">{{ l.EMAIL }}</span>
                </label>
                <label for="password" class="form-input">
                    <input
                        :placeholder="passwordPlaceholder"
                        type="password"
                        id="password"
                        @focus="passwordFocus"
                        v-on:blur="passwordBlur"
                        v-model="password"
                        @keyup.enter="submitForm"
                    />
                    <span class="label" id="password-wrap" :class="passwordActive">{{ l.PASSWORD }}</span>
                </label>
                <div
                    class="login-btn"
                    id="submit-btn"
                    :class="clickSubmitClass"
                    v-on:click="submitForm()"
                >
                    <span class="loading"></span>
                    {{ l.LOGINBTN }}
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
            // username: "",
            // password: "",
            // username: "1@qq.com",
            // password: "A123456789",
            username: "testv314@online.com",
            password: "a12345678",
            usernameActive: "",
            passwordActive: "",
            userPlaceholder: "",
            passwordPlaceholder: "",
            usernameInputClass: "",
            clickSubmitClass: "hide-load",
            l: {
                LOGIN: "",
                SLOGAN1: "",
                SLOGAN2: "",
                EMAIL: "",
                PASSWORD: "",
                LOGINBTN: "",
                USERNAMEHOLDER: "",
                PASSWORDHOLDER: "",
                NOUSERNAME: "",
                NOPASSWORD: "",
                NODEVICE: "",
                NETWORKERROR: ""
            }
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
    created() {
        this.toggleLanguage();
    },
    mounted() {
        if (this.username.length > 0) {
            this.usernameActive = "active";
        }
        if (this.password.length > 0) {
            this.passwordActive = "active";
        }
        this.$store.commit("updateToastStatus", {
            isShowToast: false,
            toastText: ""
        });
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
            }
        },
        usernameChange() {
            if (this.username.length > 0) {
                this.usernameActive = "active";
            } else {
                console.log("3333");
                this.usernameActive = "";
            }
        },
        usernameFocus() {
            this.userPlaceholder = this.l.USERNAMEHOLDER;
        },
        testUsername() {
            this.userPlaceholder = "";

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
        passwordFocus() {
            this.passwordPlaceholder = this.l.PASSWORDHOLDER;
        },
        passwordBlur() {
            this.passwordPlaceholder = "";
        },
        submitForm() {
            if (!this.username) {
                common.createToast(this.l.NOUSERNAME);
                return false;
            }

            if (!this.password) {
                common.createToast(this.l.NOPASSWORD);
                return false;
            }
            common.log("Start to login.....");
            if (this.clickSubmitClass.indexOf("hide-load") < 0) {
                common.log("Commiting.......");
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
            common.log("Username:" + username + ",Password: " + password);
            // ipcRenderer.send('login', username, password);

            //开始获取盒子git s
            let unameHash = md5(username);
            return common
                .discovery(unameHash)
                .then(device => {
                    common.log("Get box: " + JSON.stringify(device));
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
                                    "Login successfully, get user info...."
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
                                                    "Get user info succesfuly.....",
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
                    common.log("Failed to login.....", e);
                    setTimeout(() => {
                        this.clickSubmitClass = "hide-load";
                        if (!e) {
                            common.createToast(this.l.NODEVICE);
                        } else if (!e.err_no) {
                            common.createToast(this.l.NETWORKERROR);
                        }
                    }, 101);
                });
        }
    }
};
</script>

<style>
</style>
