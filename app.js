const express = require("express");
const { Pool } = require("pg");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// ========== 拼音首字母工具函数 ==========
function getFirstLetter(word) {
  if (!word) return "#";
  const firstChar = word.charAt(0);

  // 如果是英文，直接返回大写首字母
  if (/[a-zA-Z]/.test(firstChar)) {
    return firstChar.toUpperCase();
  }

  // 中文转拼音首字母（简单映射，覆盖常用汉字）
  const charCode = firstChar.charCodeAt(0);

  // 拼音首字母分区表（基于GB2312编码）
  const pinyinMap = [
    { letter: "A", min: 0xb0a1, max: 0xb0c4 },
    { letter: "B", min: 0xb0c5, max: 0xb2c0 },
    { letter: "C", min: 0xb2c1, max: 0xb4ed },
    { letter: "D", min: 0xb4ee, max: 0xb6e9 },
    { letter: "E", min: 0xb6ea, max: 0xb7a1 },
    { letter: "F", min: 0xb7a2, max: 0xb8c0 },
    { letter: "G", min: 0xb8c1, max: 0xb9fd },
    { letter: "H", min: 0xb9fe, max: 0xbbf6 },
    { letter: "J", min: 0xbbf7, max: 0xbfa5 },
    { letter: "K", min: 0xbfa6, max: 0xc0ab },
    { letter: "L", min: 0xc0ac, max: 0xc2e7 },
    { letter: "M", min: 0xc2e8, max: 0xc4c2 },
    { letter: "N", min: 0xc4c3, max: 0xc5b5 },
    { letter: "O", min: 0xc5b6, max: 0xc5bd },
    { letter: "P", min: 0xc5be, max: 0xc6d9 },
    { letter: "Q", min: 0xc6da, max: 0xc8ba },
    { letter: "R", min: 0xc8bb, max: 0xc8f5 },
    { letter: "S", min: 0xc8f6, max: 0xcbf9 },
    { letter: "T", min: 0xcbfa, max: 0xcdd9 },
    { letter: "W", min: 0xcdda, max: 0xcef3 },
    { letter: "X", min: 0xcef4, max: 0xd1b8 },
    { letter: "Y", min: 0xd1b9, max: 0xd4d0 },
    { letter: "Z", min: 0xd4d1, max: 0xd7f9 },
  ];

  for (const range of pinyinMap) {
    if (charCode >= range.min && charCode <= range.max) {
      return range.letter;
    }
  }

  return "#";
}

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

// 3. 按分类获取视频接口（小程序核心用）- 新增拼音首字母字段
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

    // 给每个视频加上拼音首字母
    const data = result.rows.map((item) => ({
      ...item,
      pinyin_first: getFirstLetter(item.word_name),
    }));

    res.json({ code: 200, data: data });
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

// ========== 5. 新增：搜索词汇接口 ==========
app.get("/api/words/search", async (req, res) => {
  const { keyword } = req.query;

  if (!keyword || keyword.trim() === "") {
    return res.json({ code: 200, data: [] });
  }

  try {
    // 模糊搜索词汇名称
    const result = await db.query(
      "SELECT * FROM videos WHERE word_name LIKE $1 ORDER BY word_name ASC",
      [`%${keyword}%`],
    );

    // 加上分类名称和拼音首字母
    const data = result.rows.map((item) => ({
      ...item,
      pinyin_first: getFirstLetter(item.word_name),
      // 根据 category_id 返回分类名称
      category_name: getCategoryName(item.category_id),
    }));

    res.json({ code: 200, data: data });
  } catch (err) {
    res.json({ code: 500, msg: "搜索失败：" + err.message });
  }
});

// 辅助函数：根据 category_id 获取分类名称
function getCategoryName(categoryId) {
  const categories = {
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
  return categories[categoryId] || "未知分类";
}

// 启动服务
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("✅ 后端服务启动成功，端口：" + PORT);
});
