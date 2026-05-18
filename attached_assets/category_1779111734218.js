const app = getApp()
const API_BASE = 'https://mini-backend--cxy2069577743.replit.app'

Page({
  data: {
    categoryList: []
  },

  onLoad(options) {
    this.loadCategories();
  },

  // 加载分类列表
  loadCategories() {
    wx.showLoading({ title: '加载中...' });
    wx.request({
      url: `${API_BASE}/api/category/list`,
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          this.setData({ categoryList: res.data.data });
        } else {
          wx.showToast({ title: '加载分类失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络异常', icon: 'none' });
      }
    });
  },

  // 进入词语列表页
  goToWordList(e) {
    const category_id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/wordList/wordList?category_id=${category_id}`
    });
  }
})