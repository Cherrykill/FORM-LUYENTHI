const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // ✅ load biến môi trường từ .env

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const DATA_PATH = path.join(__dirname, 'data', process.env.QUESTION_FILE || 'questions.json');

// Đọc danh sách câu hỏi
app.get('/questions', (req, res) => {
  fs.readFile(DATA_PATH, 'utf-8', (err, data) => {
    if (err) return res.status(500).send('Lỗi đọc file');
    res.json(JSON.parse(data));
  });
});

// Ghi lại danh sách câu hỏi
app.post('/save-questions', (req, res) => {
  const questions = req.body;

  fs.writeFile(DATA_PATH, JSON.stringify(questions, null, 2), (err) => {
    if (err) {
      console.error('Lỗi khi ghi file:', err);
      return res.status(500).send('Lỗi ghi file');
    }
    res.sendStatus(200);
  });
});

// Thêm số lần làm sai vào file questions.json
app.post('/update-questions', (req, res) => {
  const updatedQuestions = req.body;

  fs.writeFile(DATA_PATH, JSON.stringify(updatedQuestions, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Lỗi khi ghi file:', err);
      return res.status(500).json({ message: 'Không thể ghi file' });
    }
    res.json({ message: 'Đã cập nhật thành công' });
  });
});

// Xu ly form khi truy cap vao admin
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const validUser = process.env.ADMIN_USER;
  const validPass = process.env.ADMIN_PASS;

  if (username === validUser && password === validPass) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});


app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});
