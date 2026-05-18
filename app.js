const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// 数据库连接（Replit PostgreSQL）
const db = new Pool({
  connectionString: process.env.DATABASE_URL
});
db.connect()
  .then(() => console.log('✅ 数据库连接成功'))
  .catch(err => console.error('❌ 数据库连接失败:', err.message));

db.on('error', (err) => {
  console.error('数据库连接池错误（已捕获）:', err.message);
});

// 创建上传目录
if (!fs.existsSync('uploads/video')) {
  fs.mkdirSync('uploads/video', { recursive: true });
}

// 配置文件上传（保存到磁盘）
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/video'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.get('/', (req, res) => {
  res.send('✅ 后端运行正常，可以上传视频啦');
});

// 分类列表
app.get('/api/category/list', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categories ORDER BY id DESC');
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 添加分类
app.post('/api/category/add', async (req, res) => {
  const { name } = req.body;
  try {
    await db.query('INSERT INTO categories (name) VALUES ($1)', [name]);
    res.json({ code: 200, msg: '添加成功' });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 删除分类
app.get('/api/category/del', async (req, res) => {
  const { id } = req.query;
  try {
    await db.query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ code: 200, msg: '删除成功' });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 上传视频
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  const { category_id, word_name } = req.body;
  const video_path = 'uploads/video/' + req.file.filename;
  try {
    await db.query(
      'INSERT INTO videos (category_id, word_name, video_path) VALUES ($1, $2, $3)',
      [category_id, word_name, video_path]
    );
    res.json({ code: 200, msg: '上传成功' });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, msg: '数据库写入失败' });
  }
});

// 视频列表
app.get('/api/all-words', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM videos ORDER BY id DESC');
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 删除视频
app.get('/api/video/del', async (req, res) => {
  const { id } = req.query;
  try {
    await db.query('DELETE FROM videos WHERE id = $1', [id]);
    res.json({ code: 200, msg: '删除成功' });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ 服务器启动成功，端口：' + PORT);
});
