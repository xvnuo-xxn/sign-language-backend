const express = require('express');
const multer = require('multer');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

let categories = [];
let videos = [];

app.get('/', (req, res) => {
  res.send('✅ 后端运行正常，可以上传视频啦');
});

// 分类接口
app.get('/api/category/list', (req, res) => {
  res.json({ code: 200, data: categories });
});

app.post('/api/category/add', (req, res) => {
  categories.push({ id: Date.now(), name: req.body.name });
  res.json({ code: 200, msg: "添加成功" });
});

app.get('/api/category/del', (req, res) => {
  categories = categories.filter(c => c.id != req.query.id);
  res.json({ code: 200, msg: "删除成功" });
});

// 视频上传
app.post('/api/upload-video', upload.single('video'), (req, res) => {
  videos.push({
    id: Date.now(),
    category_id: req.body.category_id,
    word_name: req.body.word_name,
    video_path: "test.mp4"
  });
  res.json({ code: 200, msg: "上传成功" });
});

// 视频列表
app.get('/api/all-words', (req, res) => {
  res.json({ code: 200, data: videos });
});

app.get('/api/video/del', (req, res) => {
  videos = videos.filter(v => v.id != req.query.id);
  res.json({ code: 200, msg: "删除成功" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ 服务器启动成功');
});
