const express = require('express');
const multer = require('multer');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

let categories = [];
let videos = [];

app.get('/', (req, res) => {
  res.send('服务器正常运行');
});

// 分类列表
app.get('/api/category/list', (req, res) => {
  res.json({ code: 200, data: categories });
});

// 添加分类
app.post('/api/category/add', (req, res) => {
  categories.push({
    id: Date.now(),
    name: req.body.name
  });
  res.json({ code: 200, msg: "成功" });
});

// 删除分类
app.get('/api/category/del', (req, res) => {
  categories = categories.filter(c => c.id != req.query.id);
  res.json({ code: 200, msg: "删除成功" });
});

// 上传视频
app.post('/api/upload-video', upload.single('video'), (req, res) => {
  videos.push({
    id: Date.now(),
    category_id: req.body.category_id,
    word_name: req.body.word_name,
    video_path: "video.mp4"
  });
  res.json({ code: 200, msg: "上传成功" });
});

// 所有视频
app.get('/api/all-words', (req, res) => {
  res.json({ code: 200, data: videos });
});

// 删除视频
app.get('/api/video/del', (req, res) => {
  videos = videos.filter(v => v.id != req.query.id);
  res.json({ code: 200, msg: "删除成功" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log("✅ 服务器启动成功，端口：" + PORT);
});
