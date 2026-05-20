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
});
db.connect()
  .then(() => console.log("✅ 数据库连接成功"))
  .catch((err) => console.error("❌ 数据库连接失败:", err.message));

// 静态资源：视频目录
app.use("/videos", express.static(path.join(__dirname, "public/videos")));

// 创建视频存储目录
const videoDir = path.join(__dirname, "public/videos");
if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir, { recursive: true });
}

// 上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, videoDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// 1. 上传视频接口（后台管理用）
app.post("/api/upload-video", upload.single("video"), async (req, res) => {
  const { category_id, word_name } = req.body;
  const file = req.file;

  if (!file || !category_id || !word_name) {
    return res.json({
      code: 400,
      msg: "请完整填写分类、词汇名称并选择视频文件",
    });
  }

  const baseUrl = `https://mini-backend--cxy2069577743.replit.app`;
  const videoPath = `${baseUrl}/videos/${file.filename}`;

  try {
    await db.query(
      "INSERT INTO videos (category_id, word_name, video_path) VALUES ($1, $2, $3)",
      [category_id, word_name, videoPath],
    );
    res.json({ code: 200, msg: "上传成功" });
  } catch (err) {
    res.json({ code: 500, msg: "上传失败：" + err.message });
  }
});

// 2. 获取所有视频接口（后台管理用）
app.get("/api/all-words", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM videos ORDER BY id DESC");
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    res.json({ code: 500, msg: "获取失败：" + err.message });
  }
});

// 3. 按分类获取视频接口（小程序核心用，修复版）
app.get("/api/all-words/category", async (req, res) => {
  const { category_id } = req.query;
  if (!category_id) {
    return res.json({ code: 400, msg: "缺少 category_id 参数" });
  }

  try {
    const result = await db.query(
      "SELECT * FROM videos WHERE category_id = $1",
      [category_id],
    );
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    res.json({ code: 500, msg: "获取失败：" + err.message });
  }
});

// 4. 删除视频接口（后台管理用）
app.get("/api/video/del", async (req, res) => {
  const { id } = req.query;
  try {
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
    res.json({ code: 500, msg: "删除失败：" + err.message });
  }
});

// 启动服务
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("✅ 后端服务启动成功，端口：" + PORT);
});
