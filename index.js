require('dotenv').config();
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 50001;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const getDataPath = () => {
  return path.join(__dirname, 'data', process.env.QUESTION_FILE || 'questions.json');
};

// Đổi file dữ liệu câu hỏi
app.post('/set-question-file', (req, res) => {
  const { filename } = req.body;

  if (!filename || !filename.endsWith('.json')) {
    return res.status(400).json({ error: 'Tên file không hợp lệ' });
  }

  const newPath = path.join(__dirname, 'data', filename);
  if (!fs.existsSync(newPath)) {
    return res.status(404).json({ error: 'File không tồn tại' });
  }

  process.env.QUESTION_FILE = filename;
  console.log(`[SET FILE] QUESTION_FILE = ${process.env.QUESTION_FILE}`);
  res.json({ message: 'Đã cập nhật QUESTION_FILE', current: process.env.QUESTION_FILE });
});

// Lấy danh sách file .json
app.get('/list-question-files', (req, res) => {
  const dataFolder = path.join(__dirname, 'data');
  fs.readdir(dataFolder, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Không đọc được thư mục data' });
    }

    const jsonFiles = files.filter(file => file.endsWith('.json'));
    res.json(jsonFiles);
  });
});

// ===== MongoDB setup ===== //
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ Đã kết nối MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB lỗi:', err));

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  email: String,
  timestamp: Date
});
const User = mongoose.model('User', userSchema);

const statsSchema = new mongoose.Schema({
  username: String,
  correct: Number,
  wrong: Number,
  unanswered: Number,
  percent: Number,
  total: Number,
  timestamp: Date,
});
const Stats = mongoose.model('Stats', statsSchema);

// ===== Routes ===== //

// Danh sách câu hỏi
app.get('/questions', (req, res) => {
  const DATA_PATH = getDataPath();
  fs.readFile(DATA_PATH, 'utf-8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Không thể đọc file' });
    }

    try {
      const questions = JSON.parse(data);
      res.json(questions);
    } catch (e) {
      res.status(500).send('Lỗi định dạng file JSON');
    }
  });
});

// Ghi lại danh sách câu hỏi
app.post('/save-questions', (req, res) => {
  const DATA_PATH = getDataPath();
  const questions = req.body;
  if (!Array.isArray(questions)) return res.status(400).send('Dữ liệu không hợp lệ');

  fs.writeFile(DATA_PATH, JSON.stringify(questions, null, 2), (err) => {
    if (err) return res.status(500).send('Lỗi ghi file');
    res.sendStatus(200);
  });
});

// Cập nhật câu hỏi
app.post('/update-questions', (req, res) => {
  const DATA_PATH = getDataPath();
  const updatedQuestions = req.body;
  if (!Array.isArray(updatedQuestions)) return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });

  fs.writeFile(DATA_PATH, JSON.stringify(updatedQuestions, null, 2), 'utf8', (err) => {
    if (err) return res.status(500).json({ message: 'Không thể ghi file' });
    res.json({ message: 'Đã cập nhật thành công' });
  });
});

// Đăng ký người dùng
app.post('/api/register', async (req, res) => {
  const { username, password, email, timestamp } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, email, timestamp: new Date() });
    await newUser.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Lỗi khi xử lý đăng ký:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// Đăng nhập người dùng
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.json({ success: false });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.json({ success: false });

    if (username === 'admin') {
      return res.json({ success: true, isAdmin: true, redirect: '/admin/admin.html' });
    }

    res.json({ success: true, isAdmin: false });
  } catch (error) {
    console.error('Lỗi khi xử lý đăng nhập:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// Lưu kết quả làm bài
app.post('/submit-stats', async (req, res) => {
  const { username, correct, wrong, unanswered, percent, total, timestamp } = req.body;

  if (!username || typeof correct !== 'number') {
    return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
  }

  try {
    const result = await Stats.create({
      username,
      correct,
      wrong,
      unanswered,
      percent,
      total,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });

    res.json({ message: 'Đã lưu thống kê', id: result._id });
  } catch (err) {
    console.error('❌ Lỗi khi lưu thống kê:', err);
    res.status(500).json({ message: 'Lỗi khi lưu thống kê' });
  }
});

// Khởi động Server 
app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});
