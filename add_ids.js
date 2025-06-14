require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');

console.log('🔍 Kiểm tra môi trường:');
console.log('  - QUESTION_FILE:', process.env.QUESTION_FILE);
console.log('  - Thư mục hiện tại:', process.cwd());

const dataDir = path.join(__dirname, 'data');
const questionFileName = process.env.QUESTION_FILE || 'questions.json';
const questionFile = path.join(dataDir, questionFileName);

async function addIdsToQuestions() {
    try {
        if (!process.env.QUESTION_FILE && !fs.existsSync(questionFile)) {
            throw new Error('🚨 QUESTION_FILE chưa được định nghĩa trong .env, và file questions.json mặc định không tồn tại.');
        }

        const absolutePath = path.resolve(questionFile);
        console.log(`📍 Đường dẫn file: ${absolutePath}`);

        await fs.mkdir(dataDir, { recursive: true });

        try {
            await fs.access(absolutePath);
        } catch {
            throw new Error(`🚨 File không tồn tại: ${absolutePath}.`);
        }

        console.log(`📖 Đang đọc file: ${absolutePath}`);
        const data = await fs.readFile(absolutePath, 'utf8');
        const questions = JSON.parse(data);

        if (!Array.isArray(questions)) {
            throw new Error('🚨 File JSON không phải mảng câu hỏi hợp lệ.');
        }

        let modified = false;
        questions.forEach((q) => {
            if (q.id !== undefined) {
                q.id = "";
                modified = true;
                console.log(`🔄 Reset id của: "${q.question || 'Không có nội dung'}"`);
            }
        });

        questions.forEach((q, i) => {
            if (q.id === "") {
                q.id = `${i + 1}`;
                modified = true;
                console.log(`➕ Thêm id: ${q.id} cho: "${q.question || 'Không có nội dung'}"`);
            }
        });

        if (modified) {
            await fs.writeFile(absolutePath, JSON.stringify(questions, null, 2), 'utf8');
            console.log(`✅ Đã ghi đè file: ${absolutePath} với id mới`);
        } else {
            console.log('ℹ️ Không có thay đổi.');
        }
    } catch (err) {
        console.error('❌ Lỗi:', err.message);
        process.exit(1);
    }
}

addIdsToQuestions();