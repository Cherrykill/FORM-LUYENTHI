// ============================
// 🔧 Biến toàn cục & Khởi tạo
// ============================
let questions = [];
let currentQuestionIndex = 0;
let selectedAnswers = [];
let showAnswerMode = false;
let autoNextDelay = 0;
let countdownInterval;
let timeLeftInSeconds = 0;

window.onload = async () => {
    await loadQuestions();
    setupAutoNext();

    // ✅ Kích hoạt nút chọn chế độ sau khi tải câu hỏi
    document.querySelectorAll('button[id^="btn-mode"]').forEach(btn => {
        btn.disabled = false;
    });
};

// ============================
// 📦 Xử lý dữ liệu & trạng thái
// ============================
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

function getCorrectIndex(letter) {
    return letter.charCodeAt(0) - 65;
}

function hasInvalidCorrectAnswers() {
    for (const q of questions) {
        if (!q.correct || typeof q.correct !== 'string' || getCorrectIndex(q.correct) >= q.answers.length) {
            return true;
        }
    }
    return false;
}

// ============================
// 🖼️ Hiển thị câu hỏi & giao diện
// ============================
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

function updateQuestionButtons() {
    const buttons = document.querySelectorAll('#question-list button');
    buttons.forEach((btn, i) => {
        btn.classList.remove("active", "answered");
        if (i === currentQuestionIndex) btn.classList.add("active");
        if (selectedAnswers[i] !== null) btn.classList.add("answered");
    });
}

// ============================
// ✍️ Xử lý chọn đáp án & điều hướng
// ============================
function selectAnswer(index) {
    selectedAnswers[currentQuestionIndex] = index;
    renderQuestion();
    if (autoNextDelay > 0) {
        setTimeout(() => nextQuestion(), autoNextDelay);
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
    }
}

function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    }
}

// ============================
// 🎯 Bắt đầu quiz với tùy chọn chế độ
// ============================
function handleStartQuiz(shuffleQuestions, shuffleAnswers, showAnswers) {
    if (hasInvalidCorrectAnswers()) {
        alert("⚠️ Có câu hỏi chưa được định nghĩa đáp án. Vui lòng sửa trước khi bắt đầu.");
        return;
    }
    startQuiz(shuffleQuestions, shuffleAnswers, showAnswers);
}

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
}

// ============================
// ⏳ Đếm ngược thời gian làm bài
// ============================
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

// ============================
// 📊 Nộp bài & xử lý kết quả
// ============================
function handleSubmit() {
    const unanswered = selectedAnswers.filter(ans => ans === null).length;
    if (unanswered > 0) {
        document.getElementById('confirm-submit-popup').classList.remove('hidden');
    } else {
        submitQuiz();
    }
}

function confirmSubmit() {
    document.getElementById('confirm-submit-popup').classList.add('hidden');
    submitQuiz();
}

function closeConfirmPopup() {
    document.getElementById('confirm-submit-popup').classList.add('hidden');
}

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

    // ✅ Thêm đoạn sau để RESET lại trạng thái:
    selectedAnswers = new Array(questions.length).fill(null);
    currentQuestionIndex = 0;
    renderQuestionButtons();
    renderQuestion();
}


function closeScorePopup() {
    document.getElementById('score-popup').classList.add('hidden');
}

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

// ============================
// ⚙️ Cài đặt tự động chuyển câu hỏi
// ============================
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

// ============================
// 🌙 Chuyển chế độ sáng / tối
// ============================
function toggleTheme() {
    document.body.classList.toggle('dark');
}


// ============================
// Form validation
// ============================
function showLoginPopup() {
    document.getElementById('login-popup').classList.remove('hidden');
}

function closeLoginPopup() {
    document.getElementById('login-popup').classList.add('hidden');
    document.getElementById('login-error').textContent = '';
}

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
