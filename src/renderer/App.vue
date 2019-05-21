<template>
  <div id="app" class="app">
    <router-view></router-view>
  </div>
</template>

<script>
export default {
  name: "ubox_desktop"
};
</script>

<style lang="less">
/* CSS */
@import "./assets/css/common.css";
.app {
  width: 100%;
  height: 100%;
}
</style>
