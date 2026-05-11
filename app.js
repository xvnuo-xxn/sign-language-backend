const express = require('express')
const mysql = require('mysql2')
const multer = require('multer')
const path = require('path')
const cors = require('cors')
const fs = require('fs')

const app = express()
const port = 3000

// 跨域配置
app.use(cors({origin:true,credentials:true}))
app.use(express.json())
app.use(express.urlencoded({extended:true}))

// 静态托管视频
app.use('/video', express.static(path.join(__dirname, 'uploads/video')))

// 建文件夹
const uploadDir = path.join(__dirname, 'uploads/video')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, {recursive:true})

// 数据库连接
const db = mysql.createConnection({
  host:'localhost',
  user:'root',
  password:'123456',
  database:'sign_language'
})
db.connect(err=>{
  if(err) console.log('数据库连接失败 - app.js:31',err)
  else console.log('✅ 数据库连接成功 - app.js:32')
})

// 上传配置
const storage = multer.diskStorage({
  destination:(req,file,cb)=>cb(null,uploadDir),
  filename:(req,file,cb)=>cb(null,Date.now()+path.extname(file.originalname))
})
const upload = multer({storage})

// 管理员登录
app.post('/api/login',(req,res)=>{
  let {account,pwd} = req.body
  let sql = 'select * from admin where account=? and pwd=?'
  db.query(sql,[account,pwd],(err,rows)=>{
    if(err || rows.length===0) return res.json({code:401,msg:'账号密码错误'})
    res.json({code:200,msg:'登录成功'})
  })
})

// 修改密码
app.post('/api/admin/modifyPwd',(req,res)=>{
  let {oldPwd,newPwd} = req.body
  db.query('select * from admin where pwd=?',[oldPwd],(e,r1)=>{
    if(e||r1.length===0) return res.json({code:400,msg:'原密码错误'})
    db.query('update admin set pwd=?',[newPwd],e=>{
      if(e) return res.json({code:500,msg:'修改失败'})
      res.json({code:200,msg:'修改成功'})
    })
  })
})

// 【关键】分类管理接口
app.get('/api/category/list',(req,res)=>{
  db.query('select * from video_category order by id desc',(err,data)=>{
    res.json({code:200,data})
  })
})
app.post('/api/category/add',(req,res)=>{
  let {name} = req.body
  db.query('insert into video_category(name) values(?)',[name],err=>{
    if(err) return res.json({code:500,msg:'添加失败'})
    res.json({code:200,msg:'分类添加成功'})
  })
})
app.post('/api/category/del',(req,res)=>{
  let {id} = req.body
  db.query('delete from video_category where id=?',[id],err=>{
    if(err) return res.json({code:500,msg:'删除失败'})
    res.json({code:200,msg:'删除成功'})
  })
})

// 视频管理接口
app.post('/api/upload/video',upload.single('file'),(req,res)=>{
  if(!req.file) return res.json({code:400,msg:'请选择视频'})
  let {category_id} = req.body
  let name = req.file.originalname
  let videoPath = 'video/'+req.file.filename
  db.query('insert into video(name,path,category_id) values(?,?,?)',[name,videoPath,category_id],err=>{
    if(err) return res.json({code:500,msg:'写入失败'})
    res.json({code:200,msg:'上传成功'})
  })
})
app.get('/api/video/list',(req,res)=>{
  let cid = req.query.category_id
  let sql = cid ? 'select * from video where category_id=?' : 'select * from video order by id desc'
  let params = cid ? [cid] : []
  db.query(sql,params,(err,data)=>{
    res.json({code:200,data})
  })
})
app.post('/api/video/del',(req,res)=>{
  let {id} = req.body
  db.query('delete from video where id=?',[id],err=>{
    if(err) return res.json({code:500,msg:'删除失败'})
    res.json({code:200,msg:'已删除'})
  })
})

// 用户管理接口
app.get('/api/user/list',(req,res)=>{
  db.query('select * from app_user order by id desc',(err,data)=>{
    res.json({code:200,data})
  })
})

// 反馈管理接口
app.get('/api/feedback/list',(req,res)=>{
  db.query('select * from feedback order by id desc',(err,data)=>{
    res.json({code:200,data})
  })
})
app.post('/api/feedback/handle',(req,res)=>{
  let {id} = req.body
  db.query('update feedback set status=1 where id=?',[id],err=>{
    if(err) return res.json({code:500,msg:'操作失败'})
    res.json({code:200,msg:'已处理'})
  })
})

// 统计接口
app.get('/api/stat',(req,res)=>{
  db.query('select count(*) as cnt from app_user',(e1,u)=>{
    db.query('select count(*) as cnt from video',(e2,v)=>{
      db.query('select count(*) as cnt from feedback where status=0',(e3,f)=>{
        res.json({
          code:200,
          data:{
            userCount:u[0].cnt,
            videoCount:v[0].cnt,
            feedCount:f[0].cnt
          }
        })
      })
    })
  })
})

app.listen(port,()=>{
  console.log(`✅ 后端运行在 http://127.0.0.1:3000 - app.js:152`)
})