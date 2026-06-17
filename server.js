const express = require("express");
const { Pool } = require("pg");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const pinyin = require("pinyin");

const app = express();
app.use(cors());
app.use(express.json());

// BASE_URL - Railway 分配的域名
const BASE_URL = process.env.BASE_URL || "https://sign-language-backend-production-e518.up.railway.app";

// 分类名称映射
const CATEGORY_NAMES = {
  2: "数字 0-9",
  3: "26个字母",
  4: "称谓家人",
  5: "时间日期",
  6: "就医场景",
  7: "政务场景",
  8: "购物场景",
  9: "职场场景",
  10: "其他词汇",
};

// 拼音首字母
function getFirstLetter(word) {
  if (!word) return "#";
  try {
    const first = pinyin(word[0], {
      style: pinyin.STYLE_FIRST_LETTER,
      heteronym: false,
    });
    if (first && first[0] && first[0][0]) {
      const letter = first[0][0].toUpperCase();
      if (/[A-Z]/.test(letter)) return letter;
    }
  } catch (e) {}
  return "#";
}

function getFullVideoUrl(videoPath) {
  if (!videoPath) return "";
  if (videoPath.startsWith("http")) return videoPath;
  return `${BASE_URL}/${videoPath}`;
}

// 数据库连接
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

db.on("error", (err) => {
  console.error("数据库连接池错误: - server.js:58", err.message);
});

// 自动创建数据库表
async function initDatabase() {
  try {
    await db.connect();
    console.log("数据库连接成功 - server.js:65");

    await db.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        is_fixed BOOLEAN DEFAULT false
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        category_id INTEGER,
        word_name VARCHAR(255),
        video_path VARCHAR(500),
        description TEXT,
        pinyin VARCHAR(100),
        is_favorite BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50),
        contact VARCHAR(50),
        content TEXT,
        status INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id SERIAL PRIMARY KEY,
        account VARCHAR(50),
        pwd VARCHAR(50)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        openid VARCHAR(100) UNIQUE,
        nickName VARCHAR(100),
        avatarUrl VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const adminResult = await db.query("SELECT COUNT(*) FROM admin");
    if (parseInt(adminResult.rows[0].count) === 0) {
      await db.query("INSERT INTO admin (account, pwd) VALUES ('admin', 'admin123')");
    }

    const catResult = await db.query("SELECT COUNT(*) FROM categories");
    if (parseInt(catResult.rows[0].count) === 0) {
      await db.query(`
        INSERT INTO categories (id, name, is_fixed) VALUES
        (2, '数字 0-9', true),
        (3, '26个字母', true),
        (4, '称谓家人', true),
        (5, '时间日期', true),
        (6, '就医场景', true),
        (7, '政务场景', true),
        (8, '购物场景', true),
        (9, '职场场景', true),
        (10, '其他词汇', true)
      `);
    }

    console.log("数据库表初始化完成 - server.js:138");
  } catch (err) {
    console.error("数据库初始化失败: - server.js:140", err.message);
  }
}

initDatabase();

// 静态资源
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static("public"));

// 创建上传目录
if (!fs.existsSync("uploads/video")) {
  fs.mkdirSync("uploads/video", { recursive: true });
}

// 文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/video"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// 根路由
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// 管理员登录
app.post("/api/login", async (req, res) => {
  const { account, pwd } = req.body;
  try {
    const result = await db.query("SELECT * FROM admin WHERE account=$1 AND pwd=$2", [account, pwd]);
    if (!result.rows.length) return res.json({ code: 401, msg: "账号或密码错误" });
    res.json({ code: 200, msg: "登录成功" });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 用户登录（微信授权）
app.post("/api/user/login", async (req, res) => {
  const { openid, nickName, avatarUrl } = req.body;
  try {
    const check = await db.query("SELECT * FROM users WHERE openid = $1", [openid]);
    if (check.rows.length > 0) {
      await db.query("UPDATE users SET nickName=$1, avatarUrl=$2 WHERE openid=$3", [nickName, avatarUrl, openid]);
      res.json({ code: 200, msg: "登录成功", data: check.rows[0] });
    } else {
      const result = await db.query(
        "INSERT INTO users (openid, nickName, avatarUrl) VALUES ($1, $2, $3) RETURNING *",
        [openid, nickName, avatarUrl]
      );
      res.json({ code: 200, msg: "注册成功", data: result.rows[0] });
    }
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 获取用户信息
app.get("/api/user/info", async (req, res) => {
  const { openid } = req.query;
  try {
    const result = await db.query("SELECT * FROM users WHERE openid = $1", [openid]);
    if (result.rows.length > 0) {
      res.json({ code: 200, data: result.rows[0] });
    } else {
      res.json({ code: 404, msg: "用户不存在" });
    }
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 分类列表
app.get("/api/category/list", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM categories ORDER BY is_fixed DESC, id ASC");
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 添加分类
app.post("/api/category/add", async (req, res) => {
  const { name } = req.body;
  try {
    await db.query("INSERT INTO categories (name) VALUES ($1)", [name]);
    res.json({ code: 200, msg: "添加成功" });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 删除分类
app.get("/api/category/del", async (req, res) => {
  const { id } = req.query;
  try {
    const check = await db.query("SELECT is_fixed FROM categories WHERE id = $1", [id]);
    if (check.rows[0]?.is_fixed) return res.json({ code: 403, msg: "固定分类不可删除" });
    await db.query("DELETE FROM categories WHERE id = $1", [id]);
    res.json({ code: 200, msg: "删除成功" });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 上传视频
app.post("/api/upload-video", upload.single("video"), async (req, res) => {
  const { category_id, word_name, description } = req.body;
  const video_path = "uploads/video/" + req.file.filename;
  try {
    await db.query(
      "INSERT INTO videos (category_id, word_name, video_path, description) VALUES ($1, $2, $3, $4)",
      [category_id, word_name, video_path, description || ""]
    );
    res.json({ code: 200, msg: "上传成功" });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, msg: "数据库写入失败" });
  }
});

// 全部视频列表
app.get("/api/all-words", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM videos ORDER BY id DESC");
    const data = result.rows.map((item) => ({
      id: item.id,
      word: item.word_name,
      word_name: item.word_name,
      pinyin: item.pinyin || "",
      pinyin_first: getFirstLetter(item.word_name),
      video_url: getFullVideoUrl(item.video_path),
      video_path: item.video_path,
      category_id: item.category_id,
      category_name: CATEGORY_NAMES[item.category_id] || "未知分类",
      is_favorite: item.is_favorite || false,
    }));
    res.json({ code: 200, data });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 按分类获取视频
app.get("/api/words-by-category", async (req, res) => {
  const { category_id } = req.query;
  try {
    let result;
    if (category_id) {
      result = await db.query("SELECT * FROM videos WHERE category_id = $1 ORDER BY id DESC", [category_id]);
    } else {
      result = await db.query("SELECT * FROM videos ORDER BY id DESC");
    }
    const data = result.rows.map((item) => ({
      id: item.id,
      word: item.word_name,
      word_name: item.word_name,
      pinyin: item.pinyin || "",
      pinyin_first: getFirstLetter(item.word_name),
      video_url: getFullVideoUrl(item.video_path),
      video_path: item.video_path,
      category_id: item.category_id,
      category_name: CATEGORY_NAMES[item.category_id] || "未知分类",
      is_favorite: item.is_favorite || false,
    }));
    res.json({ code: 200, data });
  } catch (err) {
    res.status(500).json({ code: 500, msg: err.message });
  }
});

// 搜索词汇
app.get("/api/words/search", async (req, res) => {
  const { keyword } = req.query;
  if (!keyword || keyword.trim() === "") return res.json({ code: 200, data: [] });
  try {
    const result = await db.query("SELECT * FROM videos WHERE word_name LIKE $1 ORDER BY word_name ASC", [`%${keyword}%`]);
    const data = result.rows.map((item) => ({
      id: item.id,
      word: item.word_name,
      word_name: item.word_name,
      pinyin_first: getFirstLetter(item.word_name),
      video_url: getFullVideoUrl(item.video_path),
      category_id: item.category_id,
      category_name: CATEGORY_NAMES[item.category_id] || "未知分类",
    }));
    res.json({ code: 200, data });
  } catch (err) {
    res.json({ code: 500, msg: "搜索失败：" + err.message });
  }
});

// 删除视频
app.get("/api/video/del", async (req, res) => {
  const { id } = req.query;
  try {
    await db.query("DELETE FROM videos WHERE id = $1", [id]);
    res.json({ code: 200, msg: "删除成功" });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 编辑视频信息
app.get("/api/video/edit", async (req, res) => {
  const { id, word_name, description } = req.query;
  try {
    await db.query(
      "UPDATE videos SET word_name=$1, description=$2 WHERE id=$3",
      [word_name, description || "", id]
    );
    res.json({ code: 200, msg: "修改成功" });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 管理员获取用户列表
app.get("/api/admin/users", async (req, res) => {
  try {
    const result = await db.query("SELECT id, openid, nickName, avatarUrl, created_at FROM users ORDER BY id DESC");
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 反馈列表
app.get("/api/admin/feedback", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM feedback ORDER BY id DESC");
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 提交反馈
app.post("/api/feedback/add", async (req, res) => {
  const { type, contact, content } = req.body;
  try {
    await db.query("INSERT INTO feedback (type, contact, content, status) VALUES ($1, $2, $3, 0)", [
      type || "其他", contact || "", content,
    ]);
    res.json({ code: 200, msg: "提交成功" });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 处理反馈
app.get("/api/admin/feedback/deal", async (req, res) => {
  const { id } = req.query;
  try {
    await db.query("UPDATE feedback SET status = 1 WHERE id = $1", [id]);
    res.json({ code: 200, msg: "已处理" });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 收藏功能
app.post("/api/favorite", async (req, res) => {
  const { word_id, is_favorite } = req.body;
  try {
    await db.query("UPDATE videos SET is_favorite = $1 WHERE id = $2", [is_favorite, word_id]);
    res.json({ code: 200, msg: "收藏状态更新成功" });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 获取收藏列表
app.get("/api/favorites", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM videos WHERE is_favorite = true ORDER BY id DESC");
    const data = result.rows.map((item) => ({
      id: item.id,
      word: item.word_name,
      word_name: item.word_name,
      pinyin: item.pinyin || "",
      pinyin_first: getFirstLetter(item.word_name),
      video_url: getFullVideoUrl(item.video_path),
      video_path: item.video_path,
      category_id: item.category_id,
      category_name: CATEGORY_NAMES[item.category_id] || "未知分类",
      is_favorite: true,
    }));
    res.json({ code: 200, data });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 启动服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`服务器启动成功，端口：${PORT} - server.js:443`);
});
