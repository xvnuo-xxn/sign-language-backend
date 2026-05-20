const express = require("express");
const { Pool } = require("pg");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// 数据库连接
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 创建表（如果不存在）
async function initDB() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL,
        word_name TEXT NOT NULL,
        video_path TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ 数据表初始化成功");
  } catch (err) {
    console.error("❌ 数据表初始化失败:", err.message);
  }
}
initDB();

// 视频目录
const videoDir = path.join(__dirname, "public/videos");
if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir, { recursive: true });
}
app.use("/videos", express.static(videoDir));

// 上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, videoDir),
  filename: (req, file, cb) => {
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

// 1. 上传视频接口
app.post("/api/upload-video", upload.single("video"), async (req, res) => {
  try {
    const { category_id, word_name } = req.body;
    const file = req.file;
    if (!file || !category_id || !word_name) {
      return res.json({ code: 400, msg: "参数不全" });
    }

    const baseUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    const videoPath = `${baseUrl}/videos/${file.filename}`;

    await db.query(
      "INSERT INTO videos (category_id, word_name, video_path) VALUES ($1, $2, $3)",
      [category_id, word_name, videoPath],
    );
    res.json({ code: 200, msg: "上传成功" });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, msg: "上传失败: " + err.message });
  }
});

// 2. 按分类获取视频接口（核心修复）
app.get("/api/all-words/category", async (req, res) => {
  try {
    const { category_id } = req.query;
    if (!category_id) {
      return res.json({ code: 400, msg: "缺少category_id" });
    }

    const result = await db.query(
      "SELECT * FROM videos WHERE category_id = $1 ORDER BY created_at DESC",
      [category_id],
    );
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, msg: "获取失败: " + err.message });
  }
});

// 3. 获取所有视频接口
app.get("/api/all-words", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM videos ORDER BY created_at DESC",
    );
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, msg: "获取失败: " + err.message });
  }
});

// 4. 删除视频接口
app.get("/api/video/del", async (req, res) => {
  try {
    const { id } = req.query;
    const video = await db.query(
      "SELECT video_path FROM videos WHERE id = $1",
      [id],
    );
    if (video.rows.length) {
      const filename = video.rows[0].video_path.split("/").pop();
      const filepath = path.join(videoDir, filename);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    }
    await db.query("DELETE FROM videos WHERE id = $1", [id]);
    res.json({ code: 200, msg: "删除成功" });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, msg: "删除失败: " + err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ 服务启动成功，端口：${PORT}`);
});
