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

// 托管管理员前端页面
app.use(express.static('public'));

// 数据库连接（Replit PostgreSQL）
const db = new Pool({
  connectionString: process.env.DATABASE_URL
});
db.connect()
  .then(() => {
    console.log('✅ 数据库连接成功');
    return seedCategories();
  })
  .catch(err => console.error('❌ 数据库连接失败:', err.message));

db.on('error', (err) => {
  console.error('数据库连接池错误（已捕获）:', err.message);
});

// 启动时确保固定分类存在（开发和生产数据库都会执行）
async function seedCategories() {
  const fixed = [
    '数字0-9', '26个字母', '称谓家人', '时间日期',
    '就医场景', '政务场景', '购物场景', '职场场景', '其他词汇'
  ];
  try {
    for (const name of fixed) {
      await db.query(
        `INSERT INTO categories (name, is_fixed)
         VALUES ($1::varchar, TRUE)
         ON CONFLICT (name) DO NOTHING`,
        [name]
      );
    }
    const result = await db.query('SELECT id, name FROM categories ORDER BY id');
    console.log('✅ 分类数据已就绪：', result.rows.map(r => r.name).join(', '));
  } catch (err) {
    console.error('❌ 分类初始化失败:', err.message);
  }
}

// 创建上传目录
if (!fs.existsSync('uploads/video')) {
  fs.mkdirSync('uploads/video', { recursive: true });
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/video'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 最大100MB
});

// 根路由 → 跳转到登录页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 管理员登录
app.post('/api/login', async (req, res) => {
  const { account, pwd } = req.body;
  try {
    const result = await db.query('SELECT * FROM admin WHERE account=$1 AND pwd=$2', [account, pwd]);
    if (result.rows.length === 0) return res.json({ code: 401, msg: '账号或密码错误' });
    res.json({ code: 200, msg: '登录成功' });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 分类列表
app.get('/api/category/list', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM categories ORDER BY is_fixed DESC, id ASC'
    );
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

// 删除分类（固定分类不可删）
app.get('/api/category/del', async (req, res) => {
  const { id } = req.query;
  try {
    const check = await db.query('SELECT is_fixed FROM categories WHERE id = $1', [id]);
    if (check.rows[0]?.is_fixed) {
      return res.json({ code: 403, msg: '固定分类不可删除' });
    }
    await db.query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ code: 200, msg: '删除成功' });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 上传视频
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  const { category_id, word_name, description } = req.body;
  const video_path = 'uploads/video/' + req.file.filename;
  try {
    await db.query(
      'INSERT INTO videos (category_id, word_name, video_path, description) VALUES ($1, $2, $3, $4)',
      [category_id, word_name, video_path, description || '']
    );
    res.json({ code: 200, msg: '上传成功' });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, msg: '数据库写入失败' });
  }
});

// 全部视频列表
app.get('/api/all-words', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM videos ORDER BY id DESC');
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 按分类获取视频（小程序 wordList 页用）
app.get('/api/words-by-category', async (req, res) => {
  const { category_id } = req.query;
  try {
    let result;
    if (category_id) {
      result = await db.query('SELECT * FROM videos WHERE category_id = $1 ORDER BY id DESC', [category_id]);
    } else {
      result = await db.query('SELECT * FROM videos ORDER BY id DESC');
    }
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 视频列表（兼容旧接口名）
app.get('/api/video/list', async (req, res) => {
  const { category_id } = req.query;
  try {
    let result;
    if (category_id) {
      result = await db.query('SELECT * FROM videos WHERE category_id = $1 ORDER BY id DESC', [category_id]);
    } else {
      result = await db.query('SELECT * FROM videos ORDER BY id DESC');
    }
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 小程序提交反馈
app.post('/api/feedback/add', async (req, res) => {
  const { type, contact, content } = req.body;
  try {
    await db.query(
      'INSERT INTO feedback (type, contact, content, status) VALUES ($1, $2, $3, 0)',
      [type || '其他', contact || '', content]
    );
    res.json({ code: 200, msg: '提交成功' });
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

// 用户列表
app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users ORDER BY id DESC');
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 反馈列表
app.get('/api/admin/feedback', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM feedback ORDER BY id DESC');
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 处理反馈
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
  console.log('✅ 服务器启动成功，端口：' + PORT);
});
