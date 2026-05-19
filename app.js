const express = require("express");
const { Pool } = require("pg");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const { Storage } = require("@google-cloud/storage");

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

db.on("error", (err) => {
  console.error("数据库错误:", err.message);
});

// Replit 持久化存储
const storage = new Storage();
const bucketName = process.env.REPLIT_APP_STORAGE_BUCKET;
const bucket = storage.bucket(bucketName);

// 上传配置
const upload = multer({ storage: multer.memoryStorage() });

// 首页
app.get("/", (req, res) => {
  res.send("✅ 视频后端服务运行正常");
});

// ==============================================
// 🔥 只删除了【分类管理】代码，视频分类 category_id 完全保留！
// ==============================================

// 1. 上传视频（保留 category_id）
app.post("/api/upload-video", upload.single("video"), async (req, res) => {
  const { category_id, word_name } = req.body;
  const file = req.file;

  if (!file || !word_name || !category_id) {
    return res.json({ code: 400, msg: "参数不完整" });
  }

  try {
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    const blob = bucket.file(fileName);

    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: file.mimetype,
    });

    blobStream.on("error", () => {
      res.json({ code: 500, msg: "上传失败" });
    });

    blobStream.on("finish", async () => {
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

      await db.query(
        "INSERT INTO videos (category_id, word_name, video_path) VALUES ($1, $2, $3)",
        [category_id, word_name, publicUrl],
      );

      res.json({ code: 200, msg: "上传成功" });
    });

    blobStream.end(file.buffer);
  } catch (err) {
    res.json({ code: 500, msg: "服务器异常" });
  }
});

// 2. 视频列表（小程序用）
app.get("/api/all-words", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM videos ORDER BY id DESC");
    res.json({ code: 200, data: result.rows });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 3. 删除视频
app.get("/api/video/del", async (req, res) => {
  const { id } = req.query;
  try {
    await db.query("DELETE FROM videos WHERE id = $1", [id]);
    res.json({ code: 200, msg: "删除成功" });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

// 启动服务
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("✅ 服务启动成功，端口：" + PORT);
});
