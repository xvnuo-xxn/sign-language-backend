const API_BASE = "https://mini-backend--cxy2069577743.replit.app";

Page({
  data: {
    wordList: [],
    currentVideoUrl: "",
    currentWordId: "",
    speedList: ["0.5x", "1.0x", "1.5x", "2.0x"],
    speedIndex: 1,
    videoContext: null
  },

  onLoad(options) {
    this.setData({
      videoContext: wx.createVideoContext('videoPlayer')
    });

    // 两种模式：从分类进入 / 直接播放单个词汇
    if (options.category_id) {
      this.loadWordsByCategory(options.category_id);
    } else if (options.directPath) {
      const path = decodeURIComponent(options.directPath);
      this.setData({
        currentVideoUrl: `${API_BASE}/${path}`
      });
      this.data.videoContext.play();
    }
  },

  // 加载分类下的词汇
  loadWordsByCategory(categoryId) {
    wx.request({
      url: `${API_BASE}/api/words-by-category`,
      data: { category_id: categoryId },
      success: res => {
        if (res.data.code === 200 && res.data.data.length > 0) {
          const list = res.data.data;
          this.setData({
            wordList: list,
            currentVideoUrl: `${API_BASE}/${list[0].video_path}`,
            currentWordId: list[0].id
          });
        }
      }
    });
  },

  // 点击词汇切换视频
  selectWord(e) {
    const id = e.currentTarget.dataset.id;
    const path = e.currentTarget.dataset.path;
    this.setData({
      currentWordId: id,
      currentVideoUrl: `${API_BASE}/${path}`,
      speedIndex: 1
    });
    this.data.videoContext.play();
    this.data.videoContext.playbackRate(1.0);
  },

  // 重播视频
  replayVideo() {
    this.data.videoContext.seek(0);
    this.data.videoContext.play();
  },

  // 切换播放速度
  changeSpeed(e) {
    const index = e.detail.value;
    const speedArr = [0.5, 1.0, 1.5, 2.0];
    this.setData({ speedIndex: index });
    this.data.videoContext.playbackRate(speedArr[index]);
  }
});