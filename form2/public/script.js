// =========================================================================
// 1. 🔧 BIẾN TOÀN CỤC & KHỞI TẠO
// =========================================================================

// Khai báo biến toàn cục
let questions = [];
let currentQuestionIndex = 0;
let selectedAnswers = [];
let showAnswerMode = false;
let autoNextDelay = 0;
let countdownInterval;
let timeLeftInSeconds = 0;

// Hàm khởi tạo khi tải trang
window.onload = async () => {
    await loadQuestions();          // Tải câu hỏi
    setupAutoNext();                // Cài đặt tự động chuyển câu

    // Kích hoạt nút chọn chế độ sau khi tải xong
    document.querySelectorAll('button[id^="btn-mode"]').forEach(btn => {
        btn.disabled = false;
    });

    // 🌙 Đặt chế độ tối làm mặc định khi tải trang
    document.body.classList.add('dark');
};

// =========================================================================
// 2. 📦 XỬ LÝ DỮ LIỆU & TRẠNG THÁI
// =========================================================================

// Tải danh sách câu hỏi từ server
async function loadQuestions() {
    try {
        const res = await fetch('/questions');
        questions = await res.json();
        selectedAnswers = new Array(questions.length).fill(null);
    } catch (err) {
        alert('Không thể tải câu hỏi!');
        console.error(err);
    }
}

// Lấy chỉ số đúng từ ký tự (A=0, B=1, ...)
function getCorrectIndex(letter) {
    return letter.charCodeAt(0) - 65;
}

// Kiểm tra xem có đáp án đúng nào không hợp lệ
function hasInvalidCorrectAnswers() {
    for (const q of questions) {
        if (!q.correct || typeof q.correct !== 'string' || getCorrectIndex(q.correct) >= q.answers.length) {
            return true;
        }
    }
    return false;
}

// =========================================================================
// 3. 🖼️ HIỂN THỊ CÂU HỎI & GIAO DIỆN
// =========================================================================

// Hiển thị câu hỏi hiện tại
function renderQuestion() {
    const question = questions[currentQuestionIndex];
    if (!question) return;

    document.getElementById('question-text').innerText =
        `${currentQuestionIndex + 1}. ${question.question}`;

    const optionsEl = document.getElementById('options');
    optionsEl.innerHTML = '';

    question.answers.forEach((answer, i) => {
        const btn = document.createElement('button');
        btn.innerText = answer;
        btn.onclick = () => selectAnswer(i);

        if (selectedAnswers[currentQuestionIndex] === i) {
            btn.classList.add('selected');
        }

        if (showAnswerMode && i === getCorrectIndex(question.correct)) {
            btn.style.border = '2px solid green';
        }

        optionsEl.appendChild(btn);
    });

    updateQuestionButtons();
}

// Tạo danh sách nút câu hỏi
function renderQuestionButtons() {
    const list = document.getElementById('question-list');
    list.innerHTML = '';
    questions.forEach((_, i) => {
        const btn = document.createElement('button');
        btn.innerText = i + 1;
        btn.onclick = () => {
            currentQuestionIndex = i;
            renderQuestion();
        };
        list.appendChild(btn);
    });
}

// Cập nhật trạng thái nút câu hỏi
function updateQuestionButtons() {
    const buttons = document.querySelectorAll('#question-list button');
    buttons.forEach((btn, i) => {
        btn.classList.remove("active", "answered");
        if (i === currentQuestionIndex) btn.classList.add("active");
        if (selectedAnswers[i] !== null) btn.classList.add("answered");
    });
}

// =========================================================================
// 4. ✍️ XỬ LÝ CHỌN ĐÁP ÁN & ĐIỀU HƯỚNG
// =========================================================================

// Chọn đáp án
function selectAnswer(index) {
    selectedAnswers[currentQuestionIndex] = index;
    renderQuestion();
    if (autoNextDelay > 0) {
        setTimeout(() => nextQuestion(), autoNextDelay);
    }
    updateQuizProgress();
}

// Chuyển đến câu hỏi trước
function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
    }
}

// Chuyển đến câu hỏi tiếp theo
function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    }
}

// =========================================================================
// 5. 🎯 BẮT ĐẦU QUIZ VỚI TÙY CHỌN CHẾ ĐỘ
// =========================================================================

// Xử lý bắt đầu quiz
function handleStartQuiz(shuffleQuestions, shuffleAnswers, showAnswers) {
    if (hasInvalidCorrectAnswers()) {
        alert("⚠️ Có câu hỏi chưa được định nghĩa đáp án. Vui lòng sửa trước khi bắt đầu.");
        return;
    }
    startQuiz(shuffleQuestions, shuffleAnswers, showAnswers);
}

// Khởi tạo quiz
function startQuiz(shuffleQuestions, shuffleAnswers, showAnswers) {
    if (!questions || questions.length === 0) {
        alert("Câu hỏi chưa được tải xong.");
        return;
    }

    if (shuffleQuestions == false && shuffleAnswers == false && showAnswers == false) {
        document.getElementById("mode-label").innerText = "Bình thường";
    }
    if (shuffleQuestions == true && shuffleAnswers == true && showAnswers == false) {
        document.getElementById("mode-label").innerText = "Trộn câu hỏi và đáp án";
    }
    if (shuffleQuestions == false && shuffleAnswers == true && showAnswers == false) {
        document.getElementById("mode-label").innerText = "Trộn đáp án";
    }
    if (shuffleQuestions == false && shuffleAnswers == true && showAnswers == true) {
        document.getElementById("mode-label").innerText = "Hiển thị đáp án";
    }

    showAnswerMode = showAnswers;

    if (shuffleQuestions) {
        questions = questions.sort(() => Math.random() - 0.5);
    }

    if (shuffleAnswers) {
        questions.forEach(q => {
            const correctIndex = getCorrectIndex(q.correct);
            const correctAnswer = q.answers[correctIndex];
            q.answers = q.answers.sort(() => Math.random() - 0.5);
            q.correct = String.fromCharCode(q.answers.indexOf(correctAnswer) + 65);
        });
    }

    selectedAnswers = new Array(questions.length).fill(null);
    currentQuestionIndex = 0;

    const timeLimitMinutes = parseInt(document.getElementById("time-limit-select").value);
    const countdownDisplay = document.getElementById("countdown");
    const timeInfo = document.getElementById("time-info");

    if (timeLimitMinutes > 0) {
        timeLeftInSeconds = timeLimitMinutes * 60;
        timeInfo.textContent = `${timeLimitMinutes} phút`;
        startCountdown();
    } else {
        timeLeftInSeconds = 0;
        timeInfo.textContent = "Không giới hạn";
        countdownDisplay.textContent = "--:--";
        clearInterval(countdownInterval);
    }

    document.getElementById("settings-popup").classList.add("hidden");
    renderQuestionButtons();
    renderQuestion();
    updateQuizProgress();
}

// =========================================================================
// 6. ⏳ ĐẾM NGƯỢC THỜI GIAN LÀM BÀI
// =========================================================================

// Bắt đầu đếm ngược
function startCountdown() {
    const countdownDisplay = document.getElementById("countdown");
    clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
        if (timeLeftInSeconds <= 0) {
            clearInterval(countdownInterval);
            countdownDisplay.textContent = "00:00";
            alert("Hết thời gian! Bài sẽ được nộp tự động.");
            handleSubmit();
            return;
        }

        const minutes = Math.floor(timeLeftInSeconds / 60);
        const seconds = timeLeftInSeconds % 60;
        countdownDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        timeLeftInSeconds--;
    }, 1000);
}

// =========================================================================
// 7. 📊 NỘP BÀI & XỬ LÝ KẾT QUẢ
// =========================================================================

// Xử lý nộp bài
function handleSubmit() {
    const unanswered = selectedAnswers.filter(ans => ans === null).length;
    if (unanswered > 0) {
        document.getElementById('confirm-submit-popup').classList.remove('hidden');
    } else {
        submitQuiz();
    }
}

// Xác nhận nộp bài
function confirmSubmit() {
    document.getElementById('confirm-submit-popup').classList.add('hidden');
    submitQuiz();
}

// Đóng popup xác nhận
function closeConfirmPopup() {
    document.getElementById('confirm-submit-popup').classList.add('hidden');
}

// Xử lý nộp bài và tính điểm
function submitQuiz() {
    let correct = 0;
    let unanswered = 0;

    questions.forEach((q, i) => {
        if (!q.correct) return;
        const userAnswer = selectedAnswers[i];

        if (userAnswer === null) {
            unanswered++;
        } else if (userAnswer === getCorrectIndex(q.correct)) {
            correct++;
        } else {
            if (!q.wrongCount) q.wrongCount = 1;
            else q.wrongCount += 1;
        }
    });

    const wrong = questions.length - correct - unanswered;

    document.getElementById('score-detail').innerText =
        `Đúng: ${correct}, Sai: ${wrong}, Bỏ qua: ${unanswered}`;
    drawChart(correct, wrong, unanswered);

    const feedbackEl = document.getElementById("score-feedback");
    const total = questions.length;
    const percent = (correct / total) * 100;

    let feedback = "";
    if (percent === 100) feedback = "Xuất sắc! Bạn đã trả lời đúng tất cả các câu.";
    else if (percent >= 80) feedback = "Rất tốt! Bạn có kiến thức vững.";
    else if (percent >= 50) feedback = "Khá ổn! Cần luyện tập thêm.";
    else feedback = "Cần cố gắng hơn. Hãy ôn tập lại nhé!";

    feedbackEl.textContent = feedback;
    document.getElementById('score-popup').classList.remove('hidden');

    // Gửi dữ liệu sai/số lần sai về server
    fetch('/update-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questions)
    })
        .then(res => res.json())
        .then(data => {
            console.log('✅ Đã cập nhật file:', data.message);
        })
        .catch(err => {
            console.error('❌ Lỗi khi gửi dữ liệu:', err);
        });

    // Reset trạng thái sau khi nộp
    selectedAnswers = new Array(questions.length).fill(null);
    currentQuestionIndex = 0;
    renderQuestionButtons();
    renderQuestion();
}

// Đóng popup điểm
function closeScorePopup() {
    document.getElementById('score-popup').classList.add('hidden');
}

// Vẽ biểu đồ kết quả
function drawChart(correct, wrong, skipped) {
    google.charts.load('current', { packages: ['corechart'] });
    google.charts.setOnLoadCallback(() => {
        const data = google.visualization.arrayToDataTable([
            ['Loại', 'Số lượng'],
            ['Đúng', correct],
            ['Sai', wrong],
            ['Bỏ qua', skipped],
        ]);

        const options = {
            title: 'Kết quả bài làm',
            pieHole: 0.4,
            colors: ['#28a745', '#dc3545', '#ffc107'],
        };

        const chart = new google.visualization.PieChart(
            document.getElementById('score-chart')
        );
        chart.draw(data, options);
    });
}

// =========================================================================
// 8. ⚙️ CÀI ĐẶT TỰ ĐỘNG CHUYỂN CÂU HỎI
// =========================================================================

// Cài đặt tự động chuyển câu hỏi
function setupAutoNext() {
    const sidebarSelect = document.getElementById('sidebar-auto-next');
    const popupSelect = document.getElementById('popup-auto-next');

    const updateDelay = () => {
        autoNextDelay = parseInt(sidebarSelect.value);
        popupSelect.value = sidebarSelect.value;
    };

    sidebarSelect.onchange = updateDelay;
    popupSelect.onchange = () => {
        sidebarSelect.value = popupSelect.value;
        updateDelay();
    };

    updateDelay();
}

// =========================================================================
// 9. 🌙 CHUYỂN CHẾ ĐỘ SÁNG / TỐI
// =========================================================================

// Chuyển đổi chế độ sáng/tối
function toggleTheme() {
    document.body.classList.toggle('dark');
    renderQuestion(); // Cập nhật lại câu hỏi và đáp án
    updateQuizProgress(); // Cập nhật thanh tiến trình
}

// =========================================================================
// 10. 🔑 FORM ĐĂNG NHẬP VÀ XÁC THỰC
// =========================================================================

// Hiển thị popup đăng nhập
function showLoginPopup() {
    document.getElementById('login-popup').classList.remove('hidden');
}

// Đóng popup đăng nhập
function closeLoginPopup() {
    document.getElementById('login-popup').classList.add('hidden');
    document.getElementById('login-error').textContent = '';
}

// Xử lý đăng nhập admin
async function handleAdminLogin() {
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const result = await response.json();
        if (result.success) {
            window.location.href = './admin/admin.html';
        } else {
            document.getElementById('login-error').textContent = 'Sai tên đăng nhập hoặc mật khẩu.';
        }
    } catch (error) {
        document.getElementById('login-error').textContent = 'Lỗi khi kết nối server.';
    }
}

// =========================================================================
// 11. 📏 CẬP NHẬT THANH TIẾN TRÌNH
// =========================================================================

// Cập nhật thanh tiến trình
function updateQuizProgress() {
    const total = questions.length;
    const answered = selectedAnswers.filter(a => a !== null).length;
    const percent = Math.round((answered / total) * 100);

    const bar = document.getElementById('quiz-progress-bar');
    const text = document.getElementById('quiz-progress-text');

    bar.style.width = `${percent}%`;

    // Đổi màu theo % tiến độ
    if (percent < 30) {
        bar.style.background = 'linear-gradient(90deg, #dc3545, #ff6b6b)'; // đỏ
    } else if (percent < 70) {
        bar.style.background = 'linear-gradient(90deg, #ffc107, #ffe066)'; // vàng
    } else {
        bar.style.background = 'linear-gradient(90deg, #28a745, #85e085)'; // xanh
    }

    // Nội dung động
    let message = '';
    if (percent === 0) message = '🚀Bắt đầu nhé!';
    else if (percent < 30) message = '🐢Mới khởi động thôi...';
    else if (percent < 60) message = '💪Tiếp tục nào!';
    else if (percent < 90) message = '🏃‍♂️Gần về đích rồi!';
    else if (percent < 100) message = '🎯Sắp hoàn tất!';
    else message = 'Hoàn thành! 🎉';

    text.textContent = `${message} (${answered}/${total})`;
}

// =========================================================================
// 12. 📏 RESPONSIVE
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sidebar = document.getElementById('sidebar');

    hamburgerBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // Tùy chọn: Đóng sidebar khi nhấp ra ngoài
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !hamburgerBtn.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });
});