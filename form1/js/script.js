// Cấu hình số lượng câu hỏi và lựa chọn
const totalQuestions = 1000;
const options = ["A", "B", "C", "D"];
const answers = new Array(totalQuestions).fill(null);

// Truy xuất các phần tử DOM chính
const quizContainer = document.getElementById("quiz");
const submitBtn = document.getElementById("submitBtn");
const statsDiv = document.getElementById("stats");
const filterSelect = document.getElementById("filterSelect");
const toggleThemeBtn = document.getElementById("toggleThemeBtn");
const numRowsInput = document.getElementById("numRows");

// Hàm lấy số câu hỏi cần hiển thị dựa trên input
function getVisibleCount() {
  const value = parseInt(numRowsInput.value);
  return isNaN(value) ? totalQuestions : Math.min(value, totalQuestions);
}

// Render danh sách câu hỏi theo filter và số lượng hiển thị
function renderQuiz() {
  quizContainer.innerHTML = "";
  const numToRender = parseInt(numRowsInput.value) || totalQuestions;

  for (let i = 0; i < totalQuestions && i < numToRender; i++) {
    const answer = answers[i];
    const questionDiv = document.createElement("div");
    questionDiv.className = "question";
    if (answer === null) questionDiv.classList.add("unselected");

    questionDiv.dataset.index = i;
    questionDiv.dataset.answer = answer || "null";

    const filterValue = filterSelect.value;
    if (
      filterValue !== "all" &&
      !(
        (filterValue === "null" && answer === null) ||
        (answer === filterValue)
      )
    ) {
      questionDiv.style.display = "none";
    }

    questionDiv.innerHTML = `
      <p>Câu ${i + 1}: <span id="answer-${i}">${answer ? answer : "Chưa chọn"}</span></p>
    `;

    const optionsDiv = document.createElement("div");
    optionsDiv.className = "options";

    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.textContent = opt;
      btn.dataset.question = i;
      btn.className = answer === opt ? "selected" : "";
      btn.onclick = () => selectAnswer(i, opt);
      optionsDiv.appendChild(btn);
    });

    questionDiv.appendChild(optionsDiv);
    quizContainer.appendChild(questionDiv);
  }

  // Cập nhật tiêu đề sau khi render
  document.getElementById("questionTitle").textContent = `Bài kiểm tra ${numToRender} câu`;
}

// Xử lý chọn đáp án cho từng câu hỏi
function selectAnswer(questionIndex, answer) {
  answers[questionIndex] = answer;
  renderQuiz();
}

// Nộp bài và xuất file kết quả Excel
function submitAnswers() {
  const result = answers.map((answer, index) => [index + 1, answer || ""]);
  const ws = XLSX.utils.aoa_to_sheet([["Câu hỏi", "Đáp án"], ...result]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Kết quả");
  XLSX.writeFile(wb, "ket_qua_kiem_tra_lan.xlsx");
  showStatistics();

  const popup = document.getElementById("congratsPopup");
  if (popup) popup.style.display = "flex";

  const closeBtn = document.getElementById("closePopupBtn");
  if (closeBtn) {
    closeBtn.onclick = () => {
      popup.style.display = "none";
    };
  }
}

// Hiển thị thống kê kết quả chọn
function showStatistics() {
  const stats = { A: 0, B: 0, C: 0, D: 0 };
  let totalAnswered = 0;

  answers.forEach((ans) => {
    if (options.includes(ans)) {
      stats[ans]++;
      totalAnswered++;
    }
  });

  let html = `<h3>📊 Thống kê kết quả:</h3><ul>`;
  options.forEach((opt) => {
    const count = stats[opt];
    const percent = totalAnswered
      ? ((count / totalAnswered) * 100).toFixed(1)
      : 0;
    html += `<li>Đáp án ${opt}: ${count} câu (${percent}%)</li>`;
  });
  html += `</ul><p>Tổng số câu đã chọn: ${totalAnswered}/${totalQuestions}</p>`;
  statsDiv.innerHTML = html;
}

// Áp dụng bộ lọc filter
function applyFilter() {
  renderQuiz();
}

// Chuyển đổi chế độ sáng/tối và lưu vào localStorage
function toggleTheme() {
  document.body.classList.toggle("dark-theme");
  const isDark = document.body.classList.contains("dark-theme");
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

// Khởi tạo theme theo localStorage
function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
  } else {
    document.body.classList.remove("dark-theme");
  }
}

// Nút cuộn lên / xuống
const scrollUpBtn = document.getElementById("scrollUpBtn");
const scrollDownBtn = document.getElementById("scrollDownBtn");

scrollUpBtn.onclick = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

scrollDownBtn.onclick = () => {
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
};

// Lưu đáp án và chuyển trang để kiểm tra kết quả
document.getElementById("goToCheckBtn").addEventListener("click", function () {
  const userAnswers = {};
  answers.forEach((ans, index) => {
    if (ans !== null) {
      userAnswers[index + 1] = ans;
    }
  });
  localStorage.setItem("userAnswers", JSON.stringify(userAnswers));
  window.location.href = "check.html";
});

// Khởi chạy khi load trang
window.onload = () => {
  initTheme();
  renderQuiz();
  showStatistics();

  filterSelect.onchange = applyFilter;
  submitBtn.onclick = submitAnswers;
  toggleThemeBtn.onclick = toggleTheme;
  numRowsInput.oninput = renderQuiz;
};

// Biến lưu interval đếm ngược thời gian làm bài
let countdownInterval;

// Bắt đầu làm bài với thời gian nhập vào
function startExam() {
  const inputMinutes = parseInt(document.getElementById("examTimeInput").value, 10);
  if (isNaN(inputMinutes) || inputMinutes <= 0) {
    alert("Vui lòng nhập thời gian hợp lệ (phút).");
    return;
  }

  const endTime = Date.now() + inputMinutes * 60 * 1000;

  countdownInterval = setInterval(() => {
    const now = Date.now();
    const distance = endTime - now;

    if (distance <= 0) {
      clearInterval(countdownInterval);
      document.getElementById("countdownTimer").innerText = "Hết giờ!";
      showTimeoutModal();
      return;
    }

    const minutes = Math.floor(distance / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById("countdownTimer").innerText = `Thời gian còn lại: ${minutes} phút ${seconds < 10 ? '0' : ''}${seconds} giây`;
  }, 1000);
}

// Hiển thị modal hết giờ và tự chuyển trang sau 3s
function showTimeoutModal() {
  const modal = document.getElementById("timeoutModal");
  modal.style.display = "block";
  setTimeout(() => {
    window.location.href = "check.html";
  }, 3000);
}
