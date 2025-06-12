// ======== 1. XỬ LÝ SỰ KIỆN KHỞI TẠO ========
document.getElementById("toggleDarkModeBtn").addEventListener("click", toggleDarkMode);
document.getElementById("scrollUpBtn").addEventListener("click", scrollToTop);
document.getElementById("scrollDownBtn").addEventListener("click", scrollToBottom);
document.getElementById("filterSelect").addEventListener("change", filterResult);
document.getElementById("checkBtn").addEventListener("click", checkAnswers);
document.getElementById("showPopupBtn").addEventListener("click", showDetailedPopup);
document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("detailedModal").style.display = "none";
});

// ======== 2. HÀM CHUNG ========

// Xóa dữ liệu làm bài và quay về trang chính
function resetAnswers() {
  localStorage.removeItem("userAnswers");
  alert("Đã xóa dữ liệu, quay lại làm bài mới.");
  location.href = "index.html";
}

// Chuyển đổi chế độ sáng/tối
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const btn = document.getElementById("toggleDarkModeBtn");
  btn.textContent = document.body.classList.contains("dark-mode") ? "Chế độ sáng" : "Chế độ tối";
}

// Cuộn lên đầu trang
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Cuộn xuống cuối trang
function scrollToBottom() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

// Lọc kết quả hiển thị theo điều kiện đã chọn
function filterResult() {
  const filter = document.getElementById("filterSelect").value;
  const rows = document.querySelectorAll("tbody tr");

  rows.forEach((row) => {
    const userAnswer = row.children[2].textContent.trim();
    const correctAnswer = row.children[1].textContent.trim();
    let show = true;

    if (filter === "notAnswered") {
      show = userAnswer === "Không chọn";
    } else if (filter.startsWith("wrong")) {
      const wrongLetter = filter.slice(-1);
      show = userAnswer === wrongLetter && userAnswer !== correctAnswer;
    }

    row.style.display = show ? "" : "none";
  });
}

// ======== 3. ĐỌC FILE ĐÁP ÁN VÀ HIỂN THỊ KẾT QUẢ ========

function checkAnswers() {
  const file = document.getElementById("answerFile").files[0];
  if (!file) {
    alert("Vui lòng chọn file đáp án (.xlsx).");
    return;
  }

  const userAnswers = JSON.parse(localStorage.getItem("userAnswers")) || {};

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const answerData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const correctAnswers = {};
    for (let i = 1; i < answerData.length; i++) {
      const [number, answer] = answerData[i];
      if (number && answer) {
        correctAnswers[number] = answer.toString().trim().toUpperCase();
      }
    }

    showResultTable(userAnswers, correctAnswers);
    showDoughnutChart(userAnswers, correctAnswers);
    showLevelText(userAnswers, correctAnswers);
  };

  reader.readAsArrayBuffer(file);
}

// ======== 4. HIỂN THỊ KẾT QUẢ DƯỚI DẠNG BẢNG VÀ BIỂU ĐỒ ========

function showResultTable(userAnswers, correctAnswers) {
  const resultDiv = document.getElementById("result");
  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Câu số</th>
        <th>Đáp án đúng</th>
        <th>Đáp án đã chọn</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");
  Object.keys(correctAnswers).forEach((num) => {
    const correct = correctAnswers[num];
    const user = userAnswers[num] || "Không chọn";
    const row = document.createElement("tr");

    row.classList.add(user === correct ? "correct" : "incorrect");
    row.innerHTML = `<td>${num}</td><td>${correct}</td><td>${user}</td>`;
    tbody.appendChild(row);
  });

  resultDiv.innerHTML = "";
  resultDiv.appendChild(table);
}

function showDoughnutChart(userAnswers, correctAnswers) {
  const correctCount = Object.keys(correctAnswers).filter(num => userAnswers[num] === correctAnswers[num]).length;
  const total = Object.keys(correctAnswers).length;

  const ctx = document.getElementById("chartCanvas").getContext("2d");
  if (window.myChart) window.myChart.destroy();

  window.myChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Đúng", "Sai"],
      datasets: [
        {
          data: [correctCount, total - correctCount],
          backgroundColor: ["#28a745", "#dc3545"],
        },
      ],
    },
    options: {
      responsive: false,
      plugins: { legend: { position: "bottom" } },
    },
  });
}

function showLevelText(userAnswers, correctAnswers) {
  const total = Object.keys(correctAnswers).length;
  const correctCount = Object.keys(correctAnswers).filter(num => userAnswers[num] === correctAnswers[num]).length;
  const percent = Math.round((correctCount / total) * 100);

  let level = "";
  if (percent >= 90) {
    level = "🎓 Xuất sắc – Bạn đạt chuẩn sinh viên giỏi.";
  } else if (percent >= 75) {
    level = "👍 Khá tốt – Bạn đang học ổn, nên luyện thêm.";
  } else if (percent >= 50) {
    level = "📘 Trung bình – Cần ôn lại kiến thức căn bản.";
  } else {
    level = "⚠️ Yếu – Bạn nên học lại toàn bộ nội dung.";
  }

  document.getElementById("levelText").textContent = `Kết quả: ${percent}% – ${level}`;
}

// ======== 5. HIỂN THỊ POPUP PHÂN TÍCH CHI TIẾT ========

function showDetailedPopup() {
  const tableRows = document.querySelectorAll("#result tbody tr");
  if (tableRows.length === 0) {
    alert("Bạn cần bấm 'So sánh kết quả' trước.");
    return;
  }

  let correct = 0, wrong = 0, skipped = 0;

  tableRows.forEach((row) => {
    const correctAnswer = row.children[1].textContent.trim();
    const userAnswer = row.children[2].textContent.trim();

    if (userAnswer === "Không chọn") skipped++;
    else if (userAnswer === correctAnswer) correct++;
    else wrong++;
  });

  const total = correct + wrong + skipped;
  const score10 = ((correct / total) * 10).toFixed(2);

  const ctx = document.getElementById("detailedChartCanvas").getContext("2d");
  if (window.detailedChart) window.detailedChart.destroy();

  window.detailedChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Đúng", "Sai", "Chưa làm"],
      datasets: [
        {
          data: [correct, wrong, skipped],
          backgroundColor: ["#28a745", "#dc3545", "#ffc107"],
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { position: "bottom" },
        title: { display: true, text: "Tỷ lệ đúng / sai / bỏ qua" },
      },
    },
  });

  document.getElementById("score10Text").textContent = `Điểm quy đổi (thang diem 10): ${score10}/10`;
  document.getElementById("detailedModal").style.display = "block";
}
