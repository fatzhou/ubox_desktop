<template>
  <div class="main-list-box">
    <div class="header-box">
      <div class="option-btn">
        <span class="back-btn"></span>
        <span class="next-btn active"></span>
      </div>
      <div class="download-btn">Download</div>
      <div class="username" id="logout">
        <p onclick="clickLogout()">
          ti**sd@gmail.com
          <em></em>
        </p>
        <span class="label">Logout</span>
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
          <ul id="fileList"></ul>
        </div>
      </div>
    </div>
    <!-- <div class="alert-box box-hide">
						                <div class="alert-status"></div>
						                <div class="alert-text">告知当前状态，信息和解决方法，最多不超过2行内容告知当前状态，信息和解决方法，最多不超过2行内容</div>
    </div>-->
  </div>
</template>

<script>
export default {
  name: "list-page",
  methods: {}
};
</script>

<style>
</style>
