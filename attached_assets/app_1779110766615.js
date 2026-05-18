App({
  onLaunch() {
    // 启动云开发，填上咱们的环境ID
    wx.cloud.init({
      env: 'cloud1-d7gjrrq5u656d22e2'
    });
    console.log('手语翻译小程序启动');
  },
  globalData: {
    userInfo: null,
    settings: {
      fontSize: 'normal',
      contrast: false,
      speed: 1,
      volume: 0.8,
      offlineMode: false
    },
    currentScene: 'general'
  }
});