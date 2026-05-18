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

// 1. 数据库连接（Replit PostgreSQL）
const db = new Pool({
  connectionString: process.env.DATABASE_URL
});
db.connect()
  .then(() => console.log('✅ 数据库连接成功'))
  .catch(err => console.error('数据库连接失败:', err.message));

// 捕获连接池错误，防止进程崩溃
db.on('error', (err) => {
  console.error('数据库连接池错误（已捕获）:', err.message);
});

// 2. 创建上传目录
if (!fs.existsSync('uploads/video')) {
  fs.mkdirSync('uploads/video', { recursive: true });
}

// 3. 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/video');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// 根路由健康检查
app.get('/', (req, res) => {
  res.json({ code: 200, msg: 'Server is running' });
});

// 4. 分类接口
app.get('/api/category/list', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categories');
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

app.post('/api/category/add', async (req, res) => {
  const { name } = req.body;
  try {
    await db.query('INSERT INTO categories (name) VALUES ($1)', [name]);
    res.json({ code: 200, msg: '添加成功' });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

app.get('/api/category/del', async (req, res) => {
  const { id } = req.query;
  try {
    await db.query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ code: 200, msg: '删除成功' });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 5. 视频上传接口
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

// 6. 词汇管理接口
app.get('/api/all-words', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM videos');
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

app.get('/api/video/del', async (req, res) => {
  const { id } = req.query;
  try {
    await db.query('DELETE FROM videos WHERE id = $1', [id]);
    res.json({ code: 200, msg: '删除成功' });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 7. 用户/反馈接口
app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users');
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

app.get('/api/admin/feedback', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM feedback');
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

app.get('/api/admin/feedback/deal', async (req, res) => {
  const { id } = req.query;
  try {
    await db.query('UPDATE feedback SET status = 1 WHERE id = $1', [id]);
    res.json({ code: 200, msg: '已处理' });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
