// 数据库连接
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

db.on("error", (err) => {
  console.error("数据库连接池错误: - server.js:8", err.message);
});

// 自动创建数据库表
async function initDatabase() {
  try {
    await db.connect();
    console.log("数据库连接成功 - server.js:15");

    // 创建分类表
    await db.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        is_fixed BOOLEAN DEFAULT false
      )
    `);

    // 创建视频表
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

    // 创建反馈表
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

    // 创建管理员表
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id SERIAL PRIMARY KEY,
        account VARCHAR(50),
        pwd VARCHAR(50)
      )
    `);

    // 插入默认管理员
    const adminResult = await db.query("SELECT COUNT(*) FROM admin");
    if (parseInt(adminResult.rows[0].count) === 0) {
      await db.query("INSERT INTO admin (account, pwd) VALUES ('admin', 'admin123')");
    }

    // 插入固定分类
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

    console.log("数据库表初始化完成 - server.js:84");
  } catch (err) {
    console.error("数据库初始化失败: - server.js:86", err.message);
  }
}

initDatabase();