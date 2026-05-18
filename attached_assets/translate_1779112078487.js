Page({
  data: {
    chatList: [],
    showCamera: false,

    // 手势识别密钥（保持不变）
    gestureAK: "AAFv1iPk3Mzinb6CDoeusHnV",
    gestureSK: "cGOuumkELKwOwjxiDiytDBAVTOHta5SZ",
    gestureToken: "",

    recorderManager: null,
    recognizeTimer: null,
    isCapturing: false,
    isRecording: false,
    canUse: true
  },

  onLoad() {
    this.recorderManager = wx.getRecorderManager();
    this.getGestureToken();

    // ====================== 语音识别（稳定版）======================
    this.recorderManager.onStop(async (res) => {
      console.log('录音结束', res.tempFilePath);
      wx.showLoading({ title: '识别中...' });
      try {
        const cloudPath = 'voice/' + Date.now() + '.wav';
        const upload = await wx.cloud.uploadFile({
          cloudPath,
          filePath: res.tempFilePath
        });
        const result = await wx.cloud.callFunction({
          name: 'voiceRecognize',
          data: { fileID: upload.fileID }
        });
        wx.hideLoading();
        if (result.result.success) {
          this.addMsg('语音：' + result.result.text, 'right');
          wx.showToast({ title: '识别成功', icon: 'success' });
        } else {
          wx.showToast({ 
            title: result.result.error || '没听清', 
            icon: 'none',
            duration: 3000
          });
        }
      } catch (e) {
        wx.hideLoading();
        console.error('语音识别流程出错：', e);
        wx.showToast({ title: '网络开了小差', icon: 'none' });
      }
    });

    this.recorderManager.onError((err) => {
      console.error('录音错误', err);
      wx.showToast({ title: '录音失败', icon: 'error' });
      this.setData({ isRecording: false, canUse: true });
    });
  },

  // ====================== 获取手势 TOKEN ======================
  getGestureToken() {
    wx.request({
      url: "https://aip.baidubce.com/oauth/2.0/token",
      method: "POST",
      header: { "Content-Type": "application/x-www-form-urlencoded" },
      data: {
        grant_type: "client_credentials",
        client_id: this.data.gestureAK,
        client_secret: this.data.gestureSK
      },
      success: (res) => {
        if (res.data.access_token) {
          this.setData({ gestureToken: res.data.access_token });
          console.log('手势token获取成功');
        }
      },
      fail: (err) => {
        console.error('获取手势token失败:', err);
      }
    });
  },

  // ====================== 手势识别（完整保留）======================
  toggleGestureCamera() {
    if (this.data.showCamera) {
      clearInterval(this.data.recognizeTimer);
      this.setData({ showCamera: false, recognizeTimer: null });
      return;
    }
    
    if (!this.data.gestureToken) {
      wx.showToast({ title: "手势服务未连接", icon: "error" });
      return;
    }
    
    wx.authorize({
      scope: "scope.camera",
      success: () => {
        this.setData({ showCamera: true });
        let timer = setInterval(() => {
          if (!this.data.isCapturing) {
            this.setData({ isCapturing: true });
            this.gesture().finally(() => this.setData({ isCapturing: false }));
          }
        }, 2000);
        this.setData({ recognizeTimer: timer });
      },
      fail: () => {
        wx.showToast({ title: "需要相机权限", icon: "error" });
      }
    });
  },

  gesture() {
    return new Promise((resolve) => {
      wx.createCameraContext().takePhoto({
        quality: "low",
        success: (res) => {
          wx.getFileSystemManager().readFile({
            filePath: res.tempImagePath,
            encoding: "base64",
            success: (file) => {
              wx.request({
                url: `https://aip.baidubce.com/rest/2.0/image-classify/v1/gesture?access_token=${this.data.gestureToken}`,
                method: "POST",
                header: { "Content-Type": "application/x-www-form-urlencoded" },
                data: { image: file.data },
                success: (r) => {
                  if (r.data.result_num > 0 && r.data.result[0].classname !== "Face") {
                    let name = this.map(r.data.result[0].classname);
                    this.addMsg("手语：" + name, "left");
                  }
                  resolve();
                },
                fail: (err) => {
                  console.error('手势识别失败:', err);
                  resolve();
                }
              });
            },
            fail: () => resolve()
          });
        },
        fail: () => resolve()
      });
    });
  },

  // ====================== 录音功能 ======================
  startRecord() {
    if (!this.data.canUse) return;
    this.setData({ canUse: false });

    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.record'] === false) {
          wx.showModal({
            title: '提示',
            content: '需要麦克风权限才能录音，请去设置页面开启',
            confirmText: '去设置',
            success: (m) => {
              if (m.confirm) {
                wx.openSetting({
                  success: (settingRes) => {
                    if (settingRes.authSetting['scope.record']) {
                      this.setData({ canUse: true });
                      wx.showToast({ title: '权限已开启，请再试一次', icon: 'none' });
                    }
                  }
                });
              } else {
                this.setData({ canUse: true });
              }
            }
          });
        } else if (res.authSetting['scope.record'] === undefined) {
          wx.authorize({
            scope: 'scope.record',
            success: () => { this.doRecord(); },
            fail: () => {
              wx.showToast({ title: '需要麦克风权限', icon: 'error' });
              this.setData({ canUse: true });
            }
          });
        } else {
          this.doRecord();
        }
      },
      fail: () => {
        wx.showToast({ title: '检查设置失败', icon: 'error' });
        this.setData({ canUse: true });
      }
    });
  },

  doRecord() {
    console.log('开始录音');
    this.setData({ isRecording: true });
    wx.showToast({ title: '录音中...松开识别', icon: 'none', duration: 60000 });
    this.recorderManager.start({
      format: 'wav',
      sampleRate: 16000,
      numberOfChannels: 1
    });

    setTimeout(() => {
      if (this.data.isRecording) {
        this.recorderManager.stop();
        this.setData({ isRecording: false, canUse: true });
      }
    }, 10000);
  },

  stopRecord() {
    console.log('停止录音');
    if (!this.data.isRecording) {
      this.setData({ canUse: true });
      return;
    }
    wx.hideToast();
    this.setData({ isRecording: false, canUse: true });
    setTimeout(() => {
      this.recorderManager.stop();
    }, 500);
  },

  // ====================== 文字输入 ======================
  openInput() {
    wx.showModal({
      title: "文字输入",
      editable: true,
      placeholderText: "请输入文字",
      success: (r) => {
        if (r.confirm && r.content && r.content.trim()) {
          this.addMsg("文字：" + r.content.trim(), "right");
        }
      }
    });
  },

  // ====================== 工具函数 ======================
  addMsg(text, side) {
    let list = this.data.chatList;
    list.push({ 
      id: Date.now(), 
      text, 
      side,
      time: this.formatTime(new Date())
    });
    this.setData({ chatList: list });
    
    setTimeout(() => {
      wx.pageScrollTo({
        scrollTop: 99999,
        duration: 300
      });
    }, 100);
  },

  map(name) {
    const map = {
      One: "1", Two: "2", Three: "3", Four: "4", Five: "5",
      Six: "6", Seven: "7", Eight: "8", Nine: "9",
      Fist: "拳头", OK: "OK", Heart: "比心", ThumbUp: "点赞"
    };
    return map[name] || name;
  },

  formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  onUnload() {
    clearInterval(this.data.recognizeTimer);
    if (this.recorderManager) {
      this.recorderManager.stop();
    }
  }
});