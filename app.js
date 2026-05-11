const express = require('express')
const { Pool } = require('pg')
const multer = require('multer')
const path = require('path')
const cors = require('cors')
const fs = require('fs')

const app = express()
const port = 5000

app.use(cors({origin:true,credentials:true}))
app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use('/video', express.static(path.join(__dirname, 'uploads/video')))

const uploadDir = path.join(__dirname, 'uploads/video')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, {recursive:true})

const db = new Pool({
  connectionString: process.env.DATABASE_URL
})

db.connect()
  .then(() => console.log('✅ 数据库连接成功 - app.js'))
  .catch(err => console.log('数据库连接失败 - app.js', err))

const storage = multer.diskStorage({
  destination:(req,file,cb)=>cb(null,uploadDir),
  filename:(req,file,cb)=>cb(null,Date.now()+path.extname(file.originalname))
})
const upload = multer({storage})

app.post('/api/login', async (req,res)=>{
  let {account,pwd} = req.body
  try {
    const result = await db.query('SELECT * FROM admin WHERE account=$1 AND pwd=$2',[account,pwd])
    if(result.rows.length===0) return res.json({code:401,msg:'账号密码错误'})
    res.json({code:200,msg:'登录成功'})
  } catch(err) {
    res.json({code:500,msg:'服务器错误'})
  }
})

app.post('/api/admin/modifyPwd', async (req,res)=>{
  let {oldPwd,newPwd} = req.body
  try {
    const r1 = await db.query('SELECT * FROM admin WHERE pwd=$1',[oldPwd])
    if(r1.rows.length===0) return res.json({code:400,msg:'原密码错误'})
    await db.query('UPDATE admin SET pwd=$1',[newPwd])
    res.json({code:200,msg:'修改成功'})
  } catch(err) {
    res.json({code:500,msg:'修改失败'})
  }
})

app.get('/api/category/list', async (req,res)=>{
  try {
    const result = await db.query('SELECT * FROM video_category ORDER BY id DESC')
    res.json({code:200,data:result.rows})
  } catch(err) {
    res.json({code:500,msg:'查询失败'})
  }
})

app.post('/api/category/add', async (req,res)=>{
  let {name} = req.body
  try {
    await db.query('INSERT INTO video_category(name) VALUES($1)',[name])
    res.json({code:200,msg:'分类添加成功'})
  } catch(err) {
    res.json({code:500,msg:'添加失败'})
  }
})

app.post('/api/category/del', async (req,res)=>{
  let {id} = req.body
  try {
    await db.query('DELETE FROM video_category WHERE id=$1',[id])
    res.json({code:200,msg:'删除成功'})
  } catch(err) {
    res.json({code:500,msg:'删除失败'})
  }
})

app.post('/api/upload/video', upload.single('file'), async (req,res)=>{
  if(!req.file) return res.json({code:400,msg:'请选择视频'})
  let {category_id} = req.body
  let name = req.file.originalname
  let videoPath = 'video/'+req.file.filename
  try {
    await db.query('INSERT INTO video(name,path,category_id) VALUES($1,$2,$3)',[name,videoPath,category_id])
    res.json({code:200,msg:'上传成功'})
  } catch(err) {
    res.json({code:500,msg:'写入失败'})
  }
})

app.get('/api/video/list', async (req,res)=>{
  let cid = req.query.category_id
  try {
    let result
    if(cid) {
      result = await db.query('SELECT * FROM video WHERE category_id=$1',[cid])
    } else {
      result = await db.query('SELECT * FROM video ORDER BY id DESC')
    }
    res.json({code:200,data:result.rows})
  } catch(err) {
    res.json({code:500,msg:'查询失败'})
  }
})

app.post('/api/video/del', async (req,res)=>{
  let {id} = req.body
  try {
    await db.query('DELETE FROM video WHERE id=$1',[id])
    res.json({code:200,msg:'已删除'})
  } catch(err) {
    res.json({code:500,msg:'删除失败'})
  }
})

app.get('/api/user/list', async (req,res)=>{
  try {
    const result = await db.query('SELECT * FROM app_user ORDER BY id DESC')
    res.json({code:200,data:result.rows})
  } catch(err) {
    res.json({code:500,msg:'查询失败'})
  }
})

app.get('/api/feedback/list', async (req,res)=>{
  try {
    const result = await db.query('SELECT * FROM feedback ORDER BY id DESC')
    res.json({code:200,data:result.rows})
  } catch(err) {
    res.json({code:500,msg:'查询失败'})
  }
})

app.post('/api/feedback/handle', async (req,res)=>{
  let {id} = req.body
  try {
    await db.query('UPDATE feedback SET status=1 WHERE id=$1',[id])
    res.json({code:200,msg:'已处理'})
  } catch(err) {
    res.json({code:500,msg:'操作失败'})
  }
})

app.get('/api/stat', async (req,res)=>{
  try {
    const [u, v, f] = await Promise.all([
      db.query('SELECT COUNT(*) AS cnt FROM app_user'),
      db.query('SELECT COUNT(*) AS cnt FROM video'),
      db.query('SELECT COUNT(*) AS cnt FROM feedback WHERE status=0')
    ])
    res.json({
      code:200,
      data:{
        userCount: parseInt(u.rows[0].cnt),
        videoCount: parseInt(v.rows[0].cnt),
        feedCount:  parseInt(f.rows[0].cnt)
      }
    })
  } catch(err) {
    res.json({code:500,msg:'统计失败'})
  }
})

app.listen(port, '0.0.0.0', ()=>{
  console.log(`✅ 后端运行在 http://0.0.0.0:${port} - app.js`)
})
