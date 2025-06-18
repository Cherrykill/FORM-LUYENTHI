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
let originalQuestions = []; // Lưu danh sách câu hỏi gốc
let isWrongQuestionsMode = false; // Cờ để xác định chế độ làm lại câu sai
const API_BASE = 'http://localhost:3001/api';

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

    // Auto check xem có đăng nhập không
    const username = sessionStorage.getItem("username");
    if (username) {
        renderApp(); // Đã login → hiển thị giao diện chính
    } else {
        renderLoginForm(); // Chưa login → hiển thị form đăng nhập
    }
};

// =========================================================================
// 2. 📦 XỬ LÝ DỮ LIỆU & TRẠNG THÁI
// =========================================================================

// Tải danh sách câu hỏi từ server
async function loadQuestions() {
    try {
        const res = await fetch('/questions');
        questions = await res.json();
        originalQuestions = JSON.parse(JSON.stringify(questions)); // Sao lưu câu hỏi gốc
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

    const questionTextEl = document.getElementById('question-text');

    // Xóa nội dung cũ
    questionTextEl.innerHTML = '';

    // Nếu có ảnh thì hiển thị ảnh
    if (question.image) {
        const img = document.createElement('img');
        img.src = question.image;
        img.alt = 'Question Image';
        img.classList.add('question-image');
        img.onclick = () => img.classList.toggle('zoomed'); // Nhấn vào để phóng to/thu nhỏ
        questionTextEl.appendChild(img);
    }

    // Thêm nội dung câu hỏi
    const text = document.createElement('div');
    text.innerText = `${currentQuestionIndex + 1}. ${question.question}`;
    questionTextEl.appendChild(text);

    // Xử lý các lựa chọn
    const optionsEl = document.getElementById('options');
    optionsEl.innerHTML = '';

    question.answers.forEach((answer, i) => {
        const btn = document.createElement('button');
        btn.innerText = answer;
        btn.onclick = () => selectAnswer(i);

        if (selectedAnswers[currentQuestionIndex] === i) {
            btn.classList.add('selected');
        }

        if (showAnswerMode && selectedAnswers[currentQuestionIndex] !== null) {
            if (i === getCorrectIndex(question.correct)) {
                btn.style.border = '2px solid green';
            } else if (i === selectedAnswers[currentQuestionIndex] && i !== getCorrectIndex(question.correct)) {
                btn.style.border = '2px solid red';
            }
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
    renderQuestion(); // Cập nhật lại giao diện để hiển thị viền màu nếu ở chế độ showAnswerMode
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
    isWrongQuestionsMode = false; // Tắt chế độ câu sai
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
// 5.1 🎯 CHẾ ĐỘ LÀM LẠI CÂU SAI
// =========================================================================

// Bắt đầu quiz với các câu hỏi sai
function startWrongQuestionsQuiz() {
    const wrongQuestions = originalQuestions.filter(q => q.wrongCount && q.wrongCount > 0);
    if (wrongQuestions.length === 0) {
        alert("🎉 Không có câu hỏi nào bạn làm sai!");
        closeScorePopup();
        return;
    }

    questions = JSON.parse(JSON.stringify(wrongQuestions));
    isWrongQuestionsMode = true;
    document.getElementById("mode-label").innerText = "Làm lại câu sai";
    showAnswerMode = false;

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

    document.getElementById("score-popup").classList.add("hidden");
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
        submitQuiz(false, false, false); // Nộp bài với các tùy chọn mặc định

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

    // Tạo bản đồ ánh xạ câu hỏi hiện tại sang câu hỏi gốc
    const questionMap = new Map();
    questions.forEach((q, i) => {
        const originalIndex = originalQuestions.findIndex(oq => oq.question === q.question);
        if (originalIndex !== -1) {
            questionMap.set(i, originalIndex);
        }
    });

    // Đánh giá câu trả lời và cập nhật wrongCount
    questions.forEach((q, i) => {
        if (!q.correct) return;
        const userAnswer = selectedAnswers[i];
        const originalIndex = questionMap.get(i);

        if (userAnswer === null) {
            unanswered++;
        } else if (userAnswer === getCorrectIndex(q.correct)) {
            correct++;
        } else {
            // Cập nhật wrongCount cho câu hỏi gốc
            if (originalIndex !== -1) {
                const originalQ = originalQuestions[originalIndex];
                if (!originalQ.wrongCount) {
                    originalQ.wrongCount = 1; // Thêm wrongCount nếu chưa có
                } else {
                    originalQ.wrongCount += 1; // Tăng wrongCount
                }
            }
        }
    });

    const wrong = questions.length - correct - unanswered;

    // Hiển thị kết quả
    document.getElementById('score-detail').innerText =
        `Đúng: ${correct}, Sai: ${wrong}, Bỏ qua: ${unanswered}`;
    drawChart(correct, wrong, unanswered);

    const feedbackEl = document.getElementById("score-feedback");
    const total = questions.length;
    const percent = ((correct / total) * 100).toFixed(2);


    let feedback = "";
    if (percent === 100) feedback = "Xuất sắc! Bạn đã trả lời đúng tất cả các câu.";
    else if (percent >= 80) feedback = "Rất tốt! Bạn có kiến thức vững.";
    else if (percent >= 50) feedback = "Khá ổn! Cần luyện tập thêm.";
    else feedback = "Cần cố gắng hơn. Hãy ôn tập lại nhé!";

    feedbackEl.textContent = feedback;
    document.getElementById('score-popup').classList.remove('hidden');

    // Reset wrongCount về 0 nếu ở chế độ câu sai và trả lời đúng
    if (isWrongQuestionsMode) {
        questions.forEach((q, i) => {
            const originalIndex = originalQuestions.findIndex(oq => oq.question === q.question);
            if (originalIndex !== -1 && selectedAnswers[i] === getCorrectIndex(q.correct)) {
                originalQuestions[originalIndex].wrongCount = 0; // Reset wrongCount nếu trả lời đúng
            }
        });
        isWrongQuestionsMode = false;
    }

    // Gửi dữ liệu cập nhật về server
    fetch('/update-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(originalQuestions) // Gửi danh sách gốc đã cập nhật
    })
        .then(res => {
            if (!res.ok) throw new Error('Lỗi khi gửi yêu cầu');
            return res.json();
        })
        .then(data => {
            console.log('✅ Đã cập nhật file:', data.message);
            // Cập nhật questions từ originalQuestions để đồng bộ
            questions = JSON.parse(JSON.stringify(originalQuestions));
        })
        .catch(err => {
            console.error('❌ Lỗi khi gửi dữ liệu:', err);
            alert('Không thể cập nhật dữ liệu câu hỏi. Vui lòng thử lại.');
        });

    // Gửi thống kê kết quả về MongoDB
    const username = sessionStorage.getItem('username');
    if (!username) {
        console.warn("Không có username trong sessionStorage.");
        alert("Bạn cần đăng nhập trước khi làm bài.");
        return;
    }

    fetch("/submit-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username,
            correct,
            wrong,
            unanswered,
            percent,
            total: questions.length,
            timestamp: new Date().toISOString()
        })
    })
        .then(res => {
            if (!res.ok) throw new Error('Gửi thống kê thất bại');
            return res.json();
        })
        .then(data => {
            console.log('✅ Đã lưu thống kê vào MongoDB:', data.message);
        })
        .catch(err => {
            console.error('❌ Lỗi khi gửi thống kê:', err);
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
    startQuiz(false, false, false); // Bắt đầu lại quiz với chế độ bình thường
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
// Cài đặt tự động chuyển câu hỏi
function setupAutoNext() {
    const sidebarSelect = document.getElementById('sidebar-auto-next');
    const popupSelect = document.getElementById('popup-auto-next');

    // Đặt giá trị mặc định cho các select elements là 1000ms
    sidebarSelect.value = '1000';
    popupSelect.value = '1000';

    // Khởi tạo autoNextDelay với giá trị mặc định là 1000ms
    autoNextDelay = 1000;

    const updateDelay = () => {
        autoNextDelay = parseInt(sidebarSelect.value);
        popupSelect.value = sidebarSelect.value;
    };

    sidebarSelect.onchange = updateDelay;
    popupSelect.onchange = () => {
        sidebarSelect.value = popupSelect.value;
        updateDelay();
    };
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


// Đăng nhập tài khoản
function handleLogin() {
    const API_BASE = '/api';
    const usernameInput = document.getElementById('admin-username') || document.getElementById('username');
    const passwordInput = document.getElementById('admin-password') || document.getElementById('password');
    const showUsername = document.querySelector('#user-name');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.querySelector('.logout-btn');
    const loginBtn = document.querySelector('.login-btn');

    const username = usernameInput?.value.trim();
    const password = passwordInput?.value.trim();

    // ✅ Hardcode tạm thời cho tài khoản admin
    if (username === 'admin' && password === '123') {
        const from = window.location.pathname || '/';
        window.location.href = `/admin/admin.html?from=${encodeURIComponent(from)}`;
        return; // dừng luôn, không gọi API nữa
    }

    fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                if (showUsername) {
                    showUsername.innerText = `Xin chào, ${username}!`;
                    logoutBtn?.classList.remove('hidden');
                    loginBtn?.classList.add('hidden');
                }

                if (data.isAdmin) {
                    const from = window.location.pathname || '/';
                    window.location.href = `/admin/admin.html?from=${encodeURIComponent(from)}`;
                } else {
                    closeLoginPopup?.();
                    console.log('Đăng nhập thành công!');
                }
            } else {
                loginError
                    ? loginError.innerText = 'Sai tên đăng nhập hoặc mật khẩu!'
                    : alert('Sai tên đăng nhập hoặc mật khẩu!');
            }
        })
        .catch(() => {
            loginError
                ? loginError.innerText = 'Lỗi kết nối tới server!'
                : alert('Lỗi kết nối tới server!');
        });
}




// Dăng ký tài khoản mới
function handleRegister() {
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const timestamp = new Date().toISOString();

    fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, timestamp }),
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.success) {
                alert('Đăng ký thành công! Hãy đăng nhập.');
                showLoginForm();
            } else {
                document.getElementById('register-error').innerText = data.message;
            }
        })
        .catch(() => {
            document.getElementById('register-error').innerText = 'Lỗi kết nối tới server!';
        });
}

// Xử lý đăng xuất
function handleLogout() {
    sessionStorage.clear(); // Xoá toàn bộ session client-side
    const showUsername = document.querySelector('#user-name');
    const logoutBtn = document.querySelector('.logout-btn');
    const loginBtn = document.querySelector('.login-btn');

    showUsername.innerText = ''; // Xoá tên người dùng hiển thị
    logoutBtn.classList.add('hidden'); // Ẩn nút đăng xuất
    loginBtn.classList.remove('hidden'); // Hiển thị lại nút đăng nhập
    showLoginForm(); // Gọi lại hàm hiển thị form đăng nhập
}

// 

// Hiển thị form đăng ký
function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

// Hiển thị form đăng nhập
function showLoginForm() {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('login-popup').classList.remove('hidden');

}

// Đóng popup đăng nhập
function closeLoginPopup() {
    document.getElementById('login-popup').classList.add('hidden');
    const logoutBtn = document.querySelector('.logout-btn');
    // logoutBtn.classList.add('hidden');
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