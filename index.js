require('dotenv').config();
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3002;
const DATA_PATH = path.join(__dirname, 'data', process.env.QUESTION_FILE || 'questions.json');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ===== 1. MongoDB setup ===== //
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

// ===== 2. Routes ===== //

// API: Danh sách câu hỏi
app.get('/questions', (req, res) => {
  fs.readFile(DATA_PATH, 'utf-8', (err, data) => {
    if (err) return res.status(500).send('Lỗi đọc file');
    try {
      const questions = JSON.parse(data);
      res.json(questions);
    } catch (e) {
      res.status(500).send('Lỗi định dạng file JSON');
    }
  });
});

// API: Ghi lại danh sách câu hỏi
app.post('/save-questions', (req, res) => {
  const questions = req.body;
  if (!Array.isArray(questions)) return res.status(400).send('Dữ liệu không hợp lệ');

  fs.writeFile(DATA_PATH, JSON.stringify(questions, null, 2), (err) => {
    if (err) return res.status(500).send('Lỗi ghi file');
    res.sendStatus(200);
  });
});

// API: Cập nhật câu hỏi
app.post('/update-questions', (req, res) => {
  const updatedQuestions = req.body;
  if (!Array.isArray(updatedQuestions)) return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });

  fs.writeFile(DATA_PATH, JSON.stringify(updatedQuestions, null, 2), 'utf8', (err) => {
    if (err) return res.status(500).json({ message: 'Không thể ghi file' });
    res.json({ message: 'Đã cập nhật thành công' });
  });
});

// API: Đăng ký người dùng
app.post('/api/register', async (req, res) => {
  const { username, password, email, timestamp } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, email, timestamp: timestamp ? new Date(timestamp) : new Date(), });
    await newUser.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Lỗi khi xử lý đăng ký:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// API: Đăng nhập người dùng
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

// API: Lưu kết quả làm bài
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

// API: Khởi động Server 
app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});
