const app = getApp()

Page({
  data: {
    user: {},
    largeText: '',
    cacheSize: ''
  },

  onShow() {
    // 获取用户信息
    const user = wx.getStorageSync('userInfo') || {}
    this.setData({ user })

    // 大字体模式
    this.setData({
      largeText: app.globalData.settings.fontSize === 'large' ? 'large-text' : ''
    })

    // 获取缓存大小
    this.getCacheSize()
  },

  // 编辑资料（真实可修改昵称）
  goEditProfile() {
    wx.navigateTo({
      url: '/pages/edit-profile/edit-profile'
    })
  },

  // 翻译记录
  goHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    })
  },

  // 意见反馈（真实可提交）
  goFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    })
  },

  // 清除缓存（真实清除）
  clearCache() {
    wx.showModal({
      title: '确认清除',
      content: '将清除图片、记录等缓存数据',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          this.getCacheSize()
          wx.showToast({ title: '清除成功', icon: 'success' })
        }
      }
    })
  },

  // 获取缓存大小
  getCacheSize() {
    wx.getStorageInfo({
      success: (res) => {
        let size = (res.currentSize / 1024).toFixed(2) + 'MB'
        this.setData({ cacheSize: size })
      }
    })
  },

  // 设置
  goSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  },

  // 关于（真实显示版本）
  about() {
    wx.showModal({
      title: '手语实时翻译',
      content: '版本：v1.0.0\n一款专为听障人士打造的双向实时翻译工具',
      showCancel: false
    })
  },

  // 退出登录（真实退出）
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }
    })
  }
})