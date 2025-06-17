require('dotenv').config();
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

require('dotenv').config();

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
});
const User = mongoose.model('User', userSchema);

// ===== 2. Routes ===== //

// API: Danh sách câu hỏi
app.get('/questions', (req, res) => {
  fs.readFile(DATA_PATH, 'utf-8', (err, data) => {
    if (err) return res.status(500).send('Lỗi đọc file');
    res.json(JSON.parse(data));
  });
});

// API: Ghi lại danh sách câu hỏi
app.post('/save-questions', (req, res) => {
  const questions = req.body;
  fs.writeFile(DATA_PATH, JSON.stringify(questions, null, 2), (err) => {
    if (err) return res.status(500).send('Lỗi ghi file');
    res.sendStatus(200);
  });
});

// API: Cập nhật câu hỏi
app.post('/update-questions', (req, res) => {
  const updatedQuestions = req.body;
  fs.writeFile(DATA_PATH, JSON.stringify(updatedQuestions, null, 2), 'utf8', (err) => {
    if (err) return res.status(500).json({ message: 'Không thể ghi file' });
    res.json({ message: 'Đã cập nhật thành công' });
  });
});

// API: Đăng kí người dùng
app.post('/api/register', async (req, res) => {
  const { username, password, email } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, password: hashedPassword, email });
    await newUser.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Lỗi khi xử lý đăng ký:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// API:  Đăng nhập người dùng
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.json({ success: false });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false });
    }

    // Nếu là admin, trả về thông tin chuyển hướng
    if (username === 'admin') {
      return res.json({ success: true, isAdmin: true, redirect: '/admin/admin.html' });
    }

    // Người dùng thường
    res.json({ success: true, isAdmin: false });

  } catch (error) {
    console.error('Lỗi khi xử lý đăng nhập:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});




// API: Khởi động Server 
app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});
