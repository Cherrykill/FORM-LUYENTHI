// ====== 1. BIẾN TOÀN CỤC ======
let questions = [];
let currentPage = 1;
const pageSize = 15;
let showFavoritesOnly = false;

// ====== 2. TIỆN ÍCH CHUNG ======
// Loại bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu
function removeVietnameseTones(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}

// ====== 3. HÀM KHỞI TẠO DOM ======
document.addEventListener("DOMContentLoaded", () => {
    loadQuestions();

    // Gán các sự kiện nút
    document.getElementById("toggle-form-btn").addEventListener("click", () => {
        const form = document.getElementById("slide-form");
        form.style.display = form.style.display === "flex" ? "none" : "flex";
        resetForm();
        document.getElementById("form-title").innerText = "Thêm / Sửa Câu hỏi";
    });

    document.getElementById("favorite-toggle-btn").addEventListener("click", () => {
        showFavoritesOnly = !showFavoritesOnly;
        currentPage = 1;
        renderQuestions();
    });

    document.getElementById("close-form").addEventListener("click", () => {
        document.getElementById("slide-form").style.display = "none";
    });

    document.getElementById("missing-answer-btn").addEventListener("click", () => {
        const missing = questions.filter(q =>
            q.correct === undefined || q.correct === "undefined" || q.correct.trim() === ""
        );
        currentPage = 1;
        renderSearchResults(missing);
    });

    document.getElementById("search-input").addEventListener("input", handleSearch);
});

// ====== 4. DỮ LIỆU: TẢI & LƯU FILE ======
async function loadQuestions() {
    const res = await fetch('/questions');
    questions = await res.json();

    // Đảm bảo mỗi câu hỏi đều có thuộc tính favorite
    questions.forEach(q => {
        if (typeof q.favorite === "undefined") q.favorite = false;
    });

    renderQuestions();
}

async function saveToFile() {
    await fetch('/save-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questions),
    });
}

// ====== 5. HIỂN THỊ GIAO DIỆN (Render) ======
function renderQuestions() {
    const container = document.getElementById("questions-container");
    container.innerHTML = "";

    let list = showFavoritesOnly ? questions.filter(q => q.favorite) : questions;
    const totalPages = Math.ceil(list.length / pageSize);
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * pageSize;
    const pageItems = list.slice(start, start + pageSize);

    pageItems.forEach((q, index) => {
        const realIndex = questions.indexOf(q);
        const div = document.createElement("div");
        div.className = "question";
        div.innerHTML = `
            <strong>${start + index + 1}. ${q.question}</strong><br>
            ${q.answers.map((a, i) => `<div>${String.fromCharCode(65 + i)}: ${a}</div>`).join('')}
            <div>Đáp án đúng: ${q.correct}</div>
            <button onclick="editQuestion(${realIndex})">✏ Sửa</button>
            <button onclick="deleteQuestion(${realIndex})">🗑 Xóa</button>
            <button class="fav-btn" onclick="toggleFavorite(${realIndex})">${q.favorite ? "⭐" : "☆"}</button>
        `;
        container.appendChild(div);
    });

    renderPagination(totalPages);
}

function renderSearchResults(list) {
    const container = document.getElementById("questions-container");
    const pagination = document.getElementById("pagination-controls");
    container.innerHTML = "";
    pagination.innerHTML = "";

    list.forEach((q, index) => {
        const realIndex = questions.indexOf(q);
        const div = document.createElement("div");
        div.className = "question";
        div.innerHTML = `
            <strong>${index + 1}. ${q.question}</strong><br>
            ${q.answers.map((a, i) => `<div>${String.fromCharCode(65 + i)}: ${a}</div>`).join('')}
            <div>Đáp án đúng: ${q.correct}</div>
            <button onclick="editQuestion(${realIndex})">✏ Sửa</button>
            <button onclick="deleteQuestion(${realIndex})">🗑 Xóa</button>
            <button class="fav-btn" onclick="toggleFavorite(${realIndex})">${q.favorite ? "⭐" : "☆"}</button>
        `;
        container.appendChild(div);
    });
}

function renderPagination(totalPages) {
    const pagination = document.getElementById("pagination-controls");
    pagination.innerHTML = "";

    const maxVisible = 3;

    const createButton = (label, page = null, disabled = false) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        if (page !== null) {
            btn.onclick = () => {
                currentPage = page;
                renderQuestions();
            };
        }
        if (disabled) btn.disabled = true;
        if (page === currentPage) btn.classList.add("active-page");
        return btn;
    };

    if (totalPages <= 1) return;
    pagination.appendChild(createButton("1", 1));

    const start = Math.max(2, currentPage - maxVisible);
    const end = Math.min(totalPages - 1, currentPage + maxVisible);

    if (start > 2) pagination.appendChild(createButton("...", null, true));
    for (let i = start; i <= end; i++) {
        pagination.appendChild(createButton(i, i));
    }
    if (end < totalPages - 1) pagination.appendChild(createButton("...", null, true));
    if (totalPages > 1) pagination.appendChild(createButton(totalPages, totalPages));
}

// ====== 6. XỬ LÝ CÂU HỎI ======
function toggleFavorite(index) {
    questions[index].favorite = !questions[index].favorite;
    saveToFile();
    renderQuestions();
}

function editQuestion(index) {
    const q = questions[index];
    const form = document.getElementById("slide-form");
    form.style.display = "flex";

    document.getElementById("edit-index").value = index;
    document.getElementById("question-text").value = q.question;
    document.getElementById("answer-A").value = q.answers[0];
    document.getElementById("answer-B").value = q.answers[1];
    document.getElementById("answer-C").value = q.answers[2];
    document.getElementById("answer-D").value = q.answers[3];
    document.getElementById("correct-answer").value = q.correct;
    document.getElementById("form-title").innerText = "Chỉnh sửa Câu hỏi";
}

async function saveQuestion() {
    const index = document.getElementById("edit-index").value;
    const newQuestion = {
        question: document.getElementById("question-text").value.trim(),
        answers: [
            document.getElementById("answer-A").value.trim(),
            document.getElementById("answer-B").value.trim(),
            document.getElementById("answer-C").value.trim(),
            document.getElementById("answer-D").value.trim(),
        ],
        correct: document.getElementById("correct-answer").value.trim(),
        favorite: false,
    };

    if (index) {
        questions[index] = { ...questions[index], ...newQuestion };
    } else {
        const duplicate = questions.find(q => q.question === newQuestion.question);
        if (duplicate) {
            const confirmAdd = confirm("Câu hỏi đã tồn tại. Bạn có muốn thêm bản sao?");
            if (!confirmAdd) return;
        }
        questions.push(newQuestion);
    }

    await saveToFile();
    resetForm();
    document.getElementById("slide-form").style.display = "none";
    renderQuestions();
}

async function deleteQuestion(index) {
    if (!confirm("Bạn có chắc muốn xóa câu hỏi này?")) return;
    questions.splice(index, 1);
    await saveToFile();
    renderQuestions();
}

// ====== 7. TÌM KIẾM (Search) ======
function handleSearch() {
    const keyword = removeVietnameseTones(document.getElementById("search-input").value.trim().toLowerCase());

    if (!keyword) {
        renderQuestions(); // Nếu không nhập gì thì hiển thị lại toàn bộ
        return;
    }

    const filtered = questions.filter(q =>
        removeVietnameseTones(q.question.toLowerCase()).includes(keyword)
    );

    currentPage = 1;
    renderSearchResults(filtered);
}

// ====== 8. CUỘN TRANG & RESET FORM ======
function scrollToTop() {
    const content = document.getElementById("content-area");
    content.scrollTo({ top: 0, behavior: "smooth" });
}

function scrollToBottom() {
    const content = document.getElementById("content-area");
    content.scrollTo({ top: content.scrollHeight, behavior: "smooth" });
}

function resetForm() {
    document.getElementById("edit-index").value = "";
    document.getElementById("question-text").value = "";
    ["A", "B", "C", "D"].forEach(l => document.getElementById("answer-" + l).value = "");
    document.getElementById("correct-answer").value = "A";
}


