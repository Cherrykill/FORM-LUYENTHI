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
const API_BASE = 'http://localhost:5000/api';

// 🔊 KHAI BÁO CÁC ĐỐI TƯỢNG ÂM THANH MỚI
const correctSound = new Audio('./sounds/correct.mp3'); 
const incorrectSound = new Audio('./sounds/incorrect.mp3'); 

// Hàm khởi tạo khi tải trang
window.onload = async () => {
    await loadQuestions(); // Tải câu hỏi
    setupAutoNext(); // Cài đặt tự động chuyển câu

    // Kích hoạt nút chọn chế độ sau khi tải xong
    document.querySelectorAll('button[id^="btn-mode"]').forEach(btn => {
        btn.disabled = false;
    });

    // 🌙 Đặt chế độ tối làm mặc định khi tải trang
    document.body.classList.add('dark');

    // Auto check xem có đăng nhập không
    const username = sessionStorage.getItem("username");
    if (username) {
        // ✅ Cập nhật giao diện khi đã đăng nhập
        const showUsername = document.querySelector('#user-name');
        const logoutBtn = document.querySelector('.logout-btn');
        const loginBtn = document.querySelector('.login-btn');

        showUsername && (showUsername.innerText = `Xin chào, ${username}!`);
        logoutBtn?.classList.remove('hidden');
        loginBtn?.classList.add('hidden');

        renderApp(); // Hiển thị giao diện quiz
    } else {
        showLoginForm(); // Chưa login → hiển thị form đăng nhập
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
        // Validate and filter questions
        const invalidQuestions = [];
        questions = questions.filter((q, index) => {
            if (!q.correct || typeof q.correct !== 'string' || getCorrectIndex(q.correct) >= q.answers.length) {
                invalidQuestions.push({ index, question: q.question, reason: getInvalidReason(q) });
                return false;
            }
            return true;
        });
        if (invalidQuestions.length > 0) {
            console.error("❌ Danh sách câu hỏi không hợp lệ:");
            invalidQuestions.forEach(q => {
                console.error(`Câu ${q.index + 1}:`);
                console.error(`  Question: ${q.question || "(không có)"}`);
                console.error(`  Lý do: ${q.reason || "Không rõ"}`);
                console.error(`  Full question object:`, questions[q.index]);
                console.error("-----------------------------");
            });
            if (questions.length === 0) {
                alert("⚠️ Không có câu hỏi hợp lệ nào để bắt đầu quiz!\nVui lòng kiểm tra console để xem chi tiết các lỗi và sửa trong admin.");
                return;
            }
            console.warn(`⚠️ Có ${invalidQuestions.length} câu hỏi không hợp lệ. Chỉ sử dụng ${questions.length} câu hỏi hợp lệ.`);
        }
        originalQuestions = JSON.parse(JSON.stringify(questions)); // Sao lưu câu hỏi hợp lệ
        selectedAnswers = new Array(questions.length).fill(null);
    } catch (err) {
        alert('Không thể tải câu hỏi!');
        console.error(err);
    }
}

// Lấy lý do câu hỏi không hợp lệ
function getInvalidReason(q) {
    if (!q.correct) return "Đáp án đúng bị thiếu hoặc rỗng";
    if (typeof q.correct !== 'string') return `Đáp án đúng không phải chuỗi (loại: ${typeof q.correct})`;
    if (getCorrectIndex(q.correct) >= q.answers.length) return `Đáp án đúng '${q.correct}' vượt quá số lượng đáp án (${q.answers.length})`;
    return "Lý do không xác định";
}

// Lấy chỉ số đúng từ ký tự (A=0, B=1, ...)
function getCorrectIndex(letter) {
    if (!letter) return -1; // Xử lý trường hợp correct bị thiếu
    return letter.charCodeAt(0) - 65;
}

// Kiểm tra xem có đáp án đúng nào không hợp lệ
function hasInvalidCorrectAnswers() {
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.correct || typeof q.correct !== 'string' || getCorrectIndex(q.correct) >= q.answers.length) {
            console.error(`Câu hỏi không hợp lệ tại vị trí ${i + 1}:`, {
                question: q.question,
                correct: q.correct,
                answers: q.answers,
                reason: getInvalidReason(q)
            });
            return true;
        }
    }
    return false;
}

// =========================================================================
// 3. 🖼️ HIỂN THỊ CÂU HỎI & GIAO DIỆN
// =========================================================================

// Hàm hiển thị giao diện chính (quiz) và ẩn form đăng nhập
function renderApp() {
    document.getElementById('login-popup').classList.add('hidden');
    renderQuestionButtons();
    renderQuestion();
    updateQuizProgress();
}

// Hiển thị câu hỏi hiện tại
function renderQuestion() {
    const question = questions[currentQuestionIndex];
    if (!question) return;

    const questionTextEl = document.getElementById('question-text');
    questionTextEl.innerHTML = '';

    if (question.image) {
        const img = document.createElement('img');
        img.src = question.image;
        img.alt = 'Question Image';
        img.classList.add('question-image');
        img.onclick = () => img.classList.toggle('zoomed');
        questionTextEl.appendChild(img);
    }

    const text = document.createElement('div');
    const formattedQuestion = question.question.replace(/\n/g, '<br>');
    text.innerHTML = `<strong>${currentQuestionIndex + 1}. ${formattedQuestion}</strong>`;
    questionTextEl.appendChild(text);

    const optionsEl = document.getElementById('options');
    optionsEl.innerHTML = ''; // Xóa các đáp án cũ

    question.answers.forEach((answer, i) => {
        const btn = document.createElement('button');
        btn.innerText = answer;
        btn.onclick = () => selectAnswer(i);

        // Đánh dấu trạng thái "selected" nếu đáp án đã được chọn
        if (selectedAnswers[currentQuestionIndex] === i) {
            btn.classList.add('selected');
        }

        // Nếu ở chế độ hiển thị đáp án, áp dụng style đúng/sai
        if (showAnswerMode && selectedAnswers[currentQuestionIndex] !== null) {
            const correctIndex = getCorrectIndex(question.correct);
            if (i === correctIndex) {
                btn.classList.add('correct');
                btn.style.border = '5px solid #28a745';
                btn.style.boxShadow = '0 0 5px rgba(40, 167, 69, 0.5)';
            } else if (i === selectedAnswers[currentQuestionIndex] && i !== correctIndex) {
                btn.classList.add('incorrect');
                btn.style.border = '5px solid #dc3545';
                btn.style.boxShadow = '0 0 5px rgba(220, 53, 69, 0.5)';
            }
        }

        // Đảm bảo nút luôn hiển thị, không bị ẩn
        btn.style.display = 'block'; // Force hiển thị
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

// Cập nhật trạng thái và màu sắc cho các nút câu hỏi trong sidebar
function updateQuestionButtons() {
    const buttons = document.querySelectorAll('#question-list button');
    buttons.forEach((btn, i) => {
        btn.classList.remove('active', 'answered', 'correct', 'incorrect');
        if (i === currentQuestionIndex) {
            btn.classList.add('active');
        }
        if (selectedAnswers[i] !== null) {
            btn.classList.add('answered');
            if (showAnswerMode) {
                const question = questions[i];
                const correctIndex = getCorrectIndex(question.correct);
                if (selectedAnswers[i] === correctIndex) {
                    btn.classList.add('correct');
                } else {
                    btn.classList.add('incorrect');
                }
            }
        }
    });
}

// =========================================================================
// 4. ✍️ XỬ LÝ CHỌN ĐÁP ÁN & ĐIỀU HƯỚNG
// =========================================================================

function selectAnswer(index) {
    selectedAnswers[currentQuestionIndex] = index;
    
    const question = questions[currentQuestionIndex];
    if (question && question.correct) {
        const correctIndex = getCorrectIndex(question.correct);
        correctSound.pause();
        correctSound.currentTime = 0;
        incorrectSound.pause();
        incorrectSound.currentTime = 0;

        if (index === correctIndex) {
            correctSound.play();
        } else {
            incorrectSound.play();
        }
    }
    
    // Cập nhật giao diện câu hỏi, giữ các đáp án hiển thị
    renderQuestion();
    
    // Chỉ tự động chuyển câu nếu không ở chế độ hiển thị đáp án
    if (autoNextDelay > 0 && !showAnswerMode) {
        setTimeout(() => nextQuestion(), autoNextDelay);
    }
    
    updateQuizProgress();
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

// =========================================================================
// 5. 🎯 BẮT ĐẦU QUIZ VỚI TÙY CHỌN CHẾ ĐỘ
// =========================================================================

function handleStartQuiz(shuffleQuestions, shuffleAnswers, showAnswers) {
    if (questions.length === 0) {
        alert("Không có câu hỏi hợp lệ nào để bắt đầu quiz!");
        return;
    }
    isWrongQuestionsMode = false;
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
    updateQuizProgress();
}

// =========================================================================
// 5.1 🎯 CHẾ ĐỘ LÀM LẠI CÂU SAI
// =========================================================================

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

function handleSubmit() {
    clearInterval(countdownInterval);
    timeLeftInSeconds = 0;
    
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

    const questionMap = new Map();
    questions.forEach((q, i) => {
        const originalIndex = originalQuestions.findIndex(oq => oq.question === q.question);
        if (originalIndex !== -1) {
            questionMap.set(i, originalIndex);
        }
    });

    questions.forEach((q, i) => {
        if (!q.correct) return;
        const userAnswer = selectedAnswers[i];
        const originalIndex = questionMap.get(i);

        if (userAnswer === null) {
            unanswered++;
        } else if (userAnswer === getCorrectIndex(q.correct)) {
            correct++;
            if (isWrongQuestionsMode && originalIndex !== -1) {
                originalQuestions[originalIndex].wrongCount = 0;
            }
        } else {
            if (originalIndex !== -1) {
                const originalQ = originalQuestions[originalIndex];
                originalQ.wrongCount = (originalQ.wrongCount || 0) + 1;
            }
        }
    });

    const wrong = questions.length - correct - unanswered;
    showAnswerMode = true;
    isWrongQuestionsMode = false;

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

    fetch('/update-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(originalQuestions)
    })
        .then(res => {
            if (!res.ok) throw new Error('Lỗi khi gửi yêu cầu');
            return res.json();
        })
        .then(data => {
            console.log('✅ Đã cập nhật file:', data.message);
            questions = JSON.parse(JSON.stringify(originalQuestions));
        })
        .catch(err => {
            console.error('❌ Lỗi khi gửi dữ liệu:', err);
            alert('Không thể cập nhật dữ liệu câu hỏi. Vui lòng thử lại.');
        });

    const username = sessionStorage.getItem('username');
    if (!username) {
        console.warn("Không có username trong sessionStorage.");
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

    renderQuestionButtons();
    renderQuestion();
}

function closeScorePopup() {
    document.getElementById('score-popup').classList.add('hidden');
    showAnswerMode = false;
    isWrongQuestionsMode = false;
    questions = JSON.parse(JSON.stringify(originalQuestions));
    selectedAnswers = new Array(questions.length).fill(null);
    currentQuestionIndex = 0;
    startQuiz(false, false, false);
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

// =========================================================================
// 8. ⚙️ CÀI ĐẶT TỰ ĐỘNG CHUYỂN CÂU HỎI
// =========================================================================

function setupAutoNext() {
    const sidebarSelect = document.getElementById('sidebar-auto-next');
    const popupSelect = document.getElementById('popup-auto-next');

    sidebarSelect.value = '1000';
    popupSelect.value = '1000';
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

function toggleTheme() {
    document.body.classList.toggle('dark');
    renderQuestion();
    updateQuizProgress();
}

// =========================================================================
// 10. 🔑 FORM ĐĂNG NHẬP VÀ XÁC THỰC
// =========================================================================

function handleLogin(defaultRedirect = "admin") {
    const API_BASE = '/api';
    const usernameInput = document.getElementById('admin-username') || document.getElementById('username');
    const passwordInput = document.getElementById('admin-password') || document.getElementById('password');
    const showUsername = document.querySelector('#user-name');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.querySelector('.logout-btn');
    const loginBtn = document.querySelector('.login-btn');
    const fromPage = window.location.pathname || '/';

    if (!usernameInput || !passwordInput) {
        alert("Không tìm thấy ô nhập tài khoản hoặc mật khẩu.");
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const redirectTo = redirectAfterLogin || defaultRedirect;

    if (loginError) loginError.innerText = '';

    if (username === 'admin' && password === '123') {
        sessionStorage.setItem("username", username);
        sessionStorage.setItem("isAdmin", "true");
        window.location.href = `/admin/${redirectTo}.html?from=${encodeURIComponent(fromPage)}`;
        redirectAfterLogin = null;
        return;
    }

    fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                sessionStorage.setItem("username", username);
                showUsername && (showUsername.innerText = `Xin chào, ${username}!`);
                logoutBtn?.classList.remove('hidden');
                loginBtn?.classList.add('hidden');

                if (data.isAdmin) {
                    window.location.href = `/admin/${redirectTo}.html?from=${encodeURIComponent(fromPage)}`;
                    redirectAfterLogin = null;
                } else {
                    closeLoginPopup?.();
                    renderApp();
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

function handleLogout() {
    sessionStorage.clear();
    const showUsername = document.querySelector('#user-name');
    const logoutBtn = document.querySelector('.logout-btn');
    const loginBtn = document.querySelector('.login-btn');

    showUsername.innerText = '';
    logoutBtn.classList.add('hidden');
    loginBtn.classList.remove('hidden');
    showLoginForm();
}

function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function showLoginForm() {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('login-popup').classList.remove('hidden');
}

function closeLoginPopup() {
    document.getElementById('login-popup').classList.add('hidden');
}

let redirectAfterLogin = null;

function loginDashboard() {
    console.log('loginDashboard called');
    redirectAfterLogin = "admin-dashboard";
    showLoginForm();
}

// =========================================================================
// 11. 📏 CẬP NHẬT THANH TIẾN TRÌNH
// =========================================================================

function updateQuizProgress() {
    const total = questions.length;
    const answered = selectedAnswers.filter(a => a !== null).length;
    const percent = Math.round((answered / total) * 100);

    const bar = document.getElementById('quiz-progress-bar');
    const text = document.getElementById('quiz-progress-text');

    bar.style.width = `${percent}%`;

    if (percent < 30) {
        bar.style.background = 'linear-gradient(90deg, #dc3545, #ff6b6b)';
    } else if (percent < 70) {
        bar.style.background = 'linear-gradient(90deg, #ffc107, #ffe066)';
    } else {
        bar.style.background = 'linear-gradient(90deg, #28a745, #85e085)';
    }

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
// 12. 📏 RESPONSIVE & POPUP DANH SÁCH CÂU HỎI
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sidebar = document.getElementById('sidebar');

    hamburgerBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !hamburgerBtn.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });
});

// Hiển thị/ẩn nút dựa trên kích thước màn hình
function toggleQuestionListBtn() {
    const btn = document.getElementById('question-list-btn');
    if (window.innerWidth <= 768) {
        btn.style.display = 'block';
    } else {
        btn.style.display = 'none';
    }
}

// Gọi khi load và resize
window.addEventListener('load', toggleQuestionListBtn);
window.addEventListener('resize', toggleQuestionListBtn);

// Hàm đóng popup
function closeQuestionListPopup() {
    const popup = document.getElementById('question-list-popup');
    popup.classList.add('hidden');
}

// Sự kiện mở popup
document.getElementById('question-list-btn').addEventListener('click', () => {
    const popup = document.getElementById('question-list-popup');
    const popupContent = document.getElementById('question-list-popup-content');
    const questionList = document.getElementById('question-list');

    // Sao chép nội dung từ #question-list
    popupContent.innerHTML = questionList.innerHTML || '<p>Chưa có câu hỏi nào.</p>';

    // Gán lại sự kiện cho các nút trong popup
    const popupButtons = popupContent.querySelectorAll('button');
    popupButtons.forEach((btn, index) => {
        // Xóa sự kiện cũ để tránh trùng lặp
        btn.removeEventListener('click', btn.onclick);
        btn.onclick = null;

        // Gán sự kiện mới
        btn.addEventListener('click', () => {
            currentQuestionIndex = index;
            renderQuestion();
            closeQuestionListPopup();
        });
    });

    // Hiển thị popup
    popup.classList.remove('hidden');
});

// Đóng popup khi nhấn ra ngoài vùng popup
document.getElementById('question-list-popup').addEventListener('click', (event) => {
    if (event.target.classList.contains('popup-overlay')) {
        closeQuestionListPopup();
    }
});