const app = getApp()

Page({
  data: {
    user: null,
    largeText: '',
    dictList: [], // 用来存后台上传的词库数据
    videoList: [] // 用来存后台上传的视频数据
  },

  onLoad() {
    const user = wx.getStorageSync('userInfo')
    // 未登录自动跳转登录页
    if (!user) {
      wx.reLaunch({ url: '/pages/login/login' })
      return
    }

    this.setData({
      user,
      largeText: app.globalData.settings.fontSize === 'large' ? 'large-text' : ''
    })

    // ✅ 关键：加载管理后台上传的词库和视频数据
    this.loadAdminData()
  },

  // 从管理后台加载数据
  async loadAdminData() {
    try {
      // 1. 获取词库列表
      const dictRes = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://mini-backend--cxy2069577743.replit.app/api/category/list',

          method: 'GET',
          success: resolve,
          fail: reject
        })
      })

      // 2. 获取视频列表
      const videoRes = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://mini-backend--cxy2069577743.replit.app/api/video/list',
          method: 'GET',
          success: resolve,
          fail: reject
        })
      })

      this.setData({
        dictList: dictRes.data.data || [],
        videoList: videoRes.data.data || []
      })

      console.log('✅ 成功获取后台数据', {
        词库数量: this.data.dictList.length,
        视频数量: this.data.videoList.length
      })
    } catch (err) {
      console.error('❌ 加载后台数据失败', err)
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      })
    }
  },

  goTranslate() {
    wx.switchTab({ url: '/pages/translate/translate' })
  },

  goLearn: function() {
    wx.navigateTo({
      url: '/pages/category/category'
    })}

})