const app = getApp()

Page({
  data: {
    largeText: '',
    types: ['功能建议', 'Bug问题', '使用疑问', '其他'],
    typeIndex: 0,
    contact: '',
    content: ''
  },

  onShow() {
    this.setData({
      largeText: app.globalData.settings.fontSize === 'large' ? 'large-text' : ''
    })
  },

  typeChange(e) {
    this.setData({ typeIndex: e.detail.value })
  },

  setContact(e) {
    this.setData({ contact: e.detail.value })
  },

  setContent(e) {
    this.setData({ content: e.detail.value })
  },

  // 真实提交反馈
  submit() {
    const { types, typeIndex, contact, content } = this.data

    if (!content) {
      wx.showToast({ title: '请输入反馈内容', icon: 'error' })
      return
    }

    const feedbackData = {
      type: types[typeIndex],
      contact,
      content,
      time: new Date().toLocaleString()
    }

    // 保存到本地反馈列表
    let list = wx.getStorageSync('feedbackList') || []
    list.unshift(feedbackData)
    wx.setStorageSync('feedbackList', list)

    wx.showModal({
      title: '提交成功',
      content: '感谢你的反馈，我们会尽快处理！',
      showCancel: false,
      success() {
        wx.navigateBack()
      }
    })
  }
})