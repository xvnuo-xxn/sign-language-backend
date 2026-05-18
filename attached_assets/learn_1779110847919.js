const API_BASE = "https://mini-backend--cxy2069577743.replit.app";

Page({
  data: {
    wordList: [],
    groupedWords: [],
    indexLetters: [],
    searchKeyword: ""
  },

  onLoad() {
    this.loadAllWords();
  },

  // 内置拼音首字母工具，不需要外部文件，不会报错！
  getFirstLetter(str) {
    const letterMap = {
      'A': ['啊', '阿', '爱', '安', '按'],
      'B': ['吧', '巴', '白', '百', '帮', '报', '北', '被', '本', '比', '边', '标', '别', '兵', '病', '波', '不'],
      'C': ['擦', '才', '参', '餐', '草', '测', '层', '曾', '查', '差', '产', '长', '常', '超', '朝', '车', '成', '吃', '充', '出', '初', '除', '川', '传', '床', '次', '从', '存'],
      'D': ['搭', '打', '大', '带', '代', '单', '当', '到', '道', '得', '德', '地', '的', '等', '低', '第', '电', '点', '店', '调', '丢', '东', '动', '都', '读', '对', '多'],
      'E': ['额', '俄', '而', '儿', '耳', '二'],
      'F': ['发', '法', '反', '饭', '方', '放', '飞', '非', '分', '风', '封', '佛', '服'],
      'G': ['嘎', '噶', '该', '改', '干', '刚', '高', '哥', '个', '给', '跟', '更', '工', '公', '共', '够', '古', '关', '光', '广', '贵', '国'],
      'H': ['哈', '海', '含', '汉', '好', '合', '和', '黑', '很', '红', '后', '花', '话', '坏', '欢', '黄', '回', '会', '混'],
      'J': ['机', '几', '及', '急', '集', '记', '加', '家', '间', '见', '江', '将', '交', '角', '叫', '接', '街', '节', '金', '进', '近', '京', '经', '九', '就', '句', '绝'],
      'K': ['卡', '开', '看', '考', '可', '课', '肯', '空', '口', '哭', '苦', '快', '宽', '困'],
      'L': ['拉', '来', '蓝', '老', '乐', '了', '里', '理', '立', '利', '连', '脸', '两', '亮', '了', '料', '列', '林', '零', '领', '流', '楼', '路', '露', '绿'],
      'M': ['妈', '麻', '马', '买', '满', '慢', '忙', '毛', '没', '每', '美', '门', '们', '米', '面', '秒', '民', '明', '末', '莫', '母'],
      'N': ['那', '拿', '哪', '奶', '男', '难', '脑', '内', '你', '年', '念', '娘', '牛', '农', '女'],
      'O': ['哦', '欧'],
      'P': ['怕', '拍', '排', '盘', '跑', '朋', '皮', '片', '票', '平', '破', '普'],
      'Q': ['七', '其', '奇', '起', '气', '千', '前', '钱', '强', '桥', '切', '且', '亲', '清', '情', '请', '秋', '球', '去', '全'],
      'R': ['然', '让', '热', '人', '日', '如', '入'],
      'S': ['撒', '三', '散', '色', '森', '杀', '山', '上', '少', '设', '生', '声', '省', '师', '十', '时', '实', '使', '世', '事', '是', '手', '首', '书', '树', '数', '双', '谁', '水', '说', '丝', '死', '四', '送', '算'],
      'T': ['他', '她', '它', '塔', '台', '太', '谈', '汤', '堂', '特', '疼', '提', '天', '田', '条', '跳', '铁', '听', '停', '同', '头', '土'],
      'W': ['挖', '哇', '外', '玩', '晚', '万', '王', '往', '望', '为', '位', '文', '问', '我', '无', '五'],
      'X': ['西', '吸', '希', '习', '下', '先', '鲜', '闲', '现', '线', '想', '向', '像', '小', '校', '笑', '些', '心', '新', '信', '星', '行', '性', '休', '学', '雪'],
      'Y': ['呀', '压', '烟', '言', '眼', '演', '羊', '阳', '要', '也', '夜', '一', '衣', '医', '依', '已', '以', '义', '艺', '因', '音', '银', '引', '应', '英', '硬', '用', '优', '由', '友', '有', '又', '鱼', '雨', '语', '元', '原', '远', '月', '云'],
      'Z': ['杂', '在', '咱', '早', '造', '则', '怎', '占', '站', '张', '找', '照', '这', '着', '真', '正', '之', '中', '钟', '种', '重', '周', '主', '住', '注', '抓', '专', '转', '装', '准', '桌', '子', '字', '自', '走', '总', '最', '左', '做']
    };
    const firstChar = str.charAt(0);
    for (let letter in letterMap) {
      if (letterMap[letter].includes(firstChar)) {
        return letter;
      }
    }
    return '#';
  },

  // 加载所有词汇
  loadAllWords() {
    wx.request({
      url: API_BASE + "/api/all-words",
      success: res => {
        if (res.data.code === 200) {
          const words = res.data.data;
          this.processWords(words);
        }
      }
    });
  },

  // 按首字母分组排序
  processWords(words) {
    const grouped = {};
    words.forEach(word => {
      const letter = this.getFirstLetter(word.word_name);
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(word);
    });

    const sortedLetters = Object.keys(grouped).sort();
    const groupedWords = sortedLetters.map(letter => ({
      letter,
      words: grouped[letter]
    }));

    this.setData({
      wordList: words,
      groupedWords,
      indexLetters: sortedLetters
    });
  },

  // 搜索功能
  onSearch(e) {
    const keyword = e.detail.value.trim();
    this.setData({ searchKeyword: keyword });
    if (!keyword) {
      this.processWords(this.data.wordList);
      return;
    }
    const filtered = this.data.wordList.filter(word =>
      word.word_name.includes(keyword)
    );
    this.processWords(filtered);
  },

  // 跳转到分类视频页
  goToCategory(e) {
    const categoryId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/wordList/wordList?category_id=${categoryId}`
    });
  },

  // 直接播放词汇视频
  playWordVideo(e) {
    const path = e.currentTarget.dataset.path;
    wx.navigateTo({
      url: `/pages/wordList/wordList?directPath=${encodeURIComponent(path)}`
    });
  },

  // 右侧字母索引跳转
  scrollToLetter(e) {
    const letter = e.currentTarget.dataset.letter;
    wx.pageScrollTo({
      selector: `#letter-${letter}`,
      duration: 300
    });
  }
});