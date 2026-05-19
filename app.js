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

// 配置静态文件目录（公网可直接访问）
app.use("/videos", express.static(path.join(__dirname, "public/videos")));

// 创建视频存储目录
const videoDir = path.join(__dirname, "public/videos");
if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir, { recursive: true });
}

// 配置 multer 存储到 public/videos 目录
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, videoDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// 上传视频接口（自动生成公网地址）
app.post("/api/upload-video", upload.single("video"), async (req, res) => {
  const { category_id, word_name } = req.body;
  const file = req.file;

  if (!file || !category_id || !word_name) {
    return res.json({ code: 400, msg: "参数不完整" });
  }

  // 生成完整公网可访问地址
  const baseUrl = `https://mini-backend--cxy2069577743.replit.app`;
  const publicVideoUrl = `${baseUrl}/videos/${file.filename}`;

  try {
    await db.query(
      "INSERT INTO videos (category_id, word_name, video_path) VALUES ($1, $2, $3)",
      [category_id, word_name, publicVideoUrl],
    );
    res.json({ code: 200, msg: "上传成功", url: publicVideoUrl });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, msg: "数据库写入失败" });
  }
});

// 视频列表接口
app.get("/api/all-words", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM videos ORDER BY id DESC");
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 按分类获取视频
app.get("/api/all-words/category", async (req, res) => {
  const { category_id } = req.query;
  if (!category_id) return res.json({ code: 400, msg: "缺少分类ID" });

  try {
    const result = await db.query(
      "SELECT * FROM videos WHERE category_id = $1",
      [category_id],
    );
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    res.json({ code: 500, msg: "获取失败" });
  }
});

// 删除视频接口（同时删除服务器上的文件）
app.get("/api/video/del", async (req, res) => {
  const { id } = req.query;
  try {
    // 先获取视频地址
    const video = await db.query(
      "SELECT video_path FROM videos WHERE id = $1",
      [id],
    );
    if (video.rows.length > 0) {
      const url = video.rows[0].video_path;
      const filename = url.split("/videos/")[1];
      const filePath = path.join(videoDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    await db.query("DELETE FROM videos WHERE id = $1", [id]);
    res.json({ code: 200, msg: "删除成功" });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("✅ 服务启动成功，端口：" + PORT);
});
