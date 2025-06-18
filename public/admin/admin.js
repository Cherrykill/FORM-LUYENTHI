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
        // Đóng navbar khi mở form
        document.querySelector(".navbar").classList.remove("active");
    });

    document.getElementById("favorite-toggle-btn").addEventListener("click", () => {
        showFavoritesOnly = !showFavoritesOnly;
        currentPage = 1;
        renderQuestions();
    });

    document.getElementById("close-form").addEventListener("click", () => {
        document.getElementById("slide-form").style.display = "none";
        // Mở lại navbar khi đóng form (nếu trước đó đã mở)
        if (document.querySelector(".menu-toggle").classList.contains("active")) {
            document.querySelector(".navbar").classList.add("active");
        }
    });

    document.getElementById("missing-answer-btn").addEventListener("click", () => {
        const missing = questions.filter(q =>
            q.correct === undefined || q.correct === "undefined" || q.correct.trim() === ""
        );
        currentPage = 1;
        renderSearchResults(missing);
    });

    document.querySelector(".search-input").addEventListener("input", handleSearch);
    document.querySelector(".search-input2").addEventListener("input", handleSearch2);

    // Lọc các câu lỗi theo thứ tự từ nhiều đến ít
    document.getElementById("wrongcount-btn").addEventListener("click", () => {
        const filtered = questions
            .filter(q => typeof q.wrongCount === "number")
            .sort((a, b) => b.wrongCount - a.wrongCount);

        currentPage = 1;
        renderSearchResults(filtered);
    });

    // Reset dữ liệu các câu sai
    document.getElementById("reset-wrongcount-btn").addEventListener("click", async () => {
        if (!confirm("Bạn có chắc muốn đặt lại số lần sai về 0 cho tất cả câu hỏi?")) return;

        questions.forEach(q => {
            if (typeof q.wrongCount === "number") q.wrongCount = 0;
        });

        await saveToFile();
        renderQuestions();
    });

    // Thêm nút menu mới để toggle navbar
    const menuToggle = document.createElement("button");
    menuToggle.textContent = "☰";
    menuToggle.className = "menu-toggle";
    document.querySelector(".hamburger").parentNode.insertBefore(menuToggle, document.querySelector(".hamburger"));
    menuToggle.addEventListener("click", () => {
        const navbar = document.querySelector(".navbar");
        navbar.classList.toggle("active");
        // Đóng form khi mở navbar
        if (navbar.classList.contains("active")) {
            document.getElementById("slide-form").classList.remove("active");
        }
    });

    // Hamburger toggle form
    document.querySelector(".hamburger").addEventListener("click", () => {
        const slideForm = document.getElementById("slide-form");
        slideForm.classList.toggle("active");
        // Đóng navbar khi mở form
        if (slideForm.classList.contains("active")) {
            document.querySelector(".navbar").classList.remove("active");
        }
    });

    // Toggle search box
    const toggleBtn = document.getElementById("mobile-search-toggle");
    const searchBox = document.getElementById("mobile-search-box");
    toggleBtn.addEventListener("click", () => {
        searchBox.classList.toggle("show");
    });

    // Đóng form và navbar khi nhấp ra ngoài
    document.addEventListener("click", (event) => {
        const slideForm = document.getElementById("slide-form");
        const navbar = document.querySelector(".navbar");
        const hamburger = document.querySelector(".hamburger");
        const menuToggle = document.querySelector(".menu-toggle");

        const isClickInsideForm = slideForm.contains(event.target);
        const isClickInsideNavbar = navbar.contains(event.target);
        const isClickOnHamburger = hamburger.contains(event.target);
        const isClickOnMenuToggle = menuToggle.contains(event.target);

        if (!isClickInsideForm && !isClickOnHamburger && slideForm.classList.contains("active")) {
            slideForm.classList.remove("active");
        }
        if (!isClickInsideNavbar && !isClickOnMenuToggle && navbar.classList.contains("active")) {
            navbar.classList.remove("active");
        }
    });

    // Đặt chế độ tối làm mặc định khi tải trang
    document.body.classList.add('dark');
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        themeToggle.textContent = document.body.classList.contains('dark') ? 'Chế độ Sáng' : 'Chế độ Tối';
    });
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

        // Ảnh + nút xoá ảnh (nếu có ảnh)
        const imageHtml = q.image
            ? `
            <div class="image-container">
                <img src="${q.image}" class="thumbnail" onclick="enlargeImage('${q.image}')"/>
                <button class="remove-image-btn" onclick="removeImage(${realIndex})">🗑 Xóa ảnh</button>
            </div>
            `
            : "";

        div.innerHTML = `
            <strong>${start + index + 1}. ${q.question}</strong><br>
            ${imageHtml}
            ${q.answers.map((a, i) => `<div>${String.fromCharCode(65 + i)}: ${a}</div>`).join('')}
            <div>Đáp án đúng: ${q.correct}</div>
            <button onclick="editQuestion(${realIndex})">✏ Sửa</button>
            <button onclick="deleteQuestion(${realIndex})">🗑 Xóa</button>
            <button class="fav-btn" onclick="toggleFavorite(${realIndex})">${q.favorite ? "⭐" : "☆"}</button>
            ${typeof q.wrongCount === "number" ? `<div class="wrong-count">Sai: ${q.wrongCount} lần</div>` : ""}
        `;

        container.appendChild(div);
    });

    renderPagination(totalPages);
}

function renderSearchResults(list) {
    const container = document.getElementById("questions-container");
    container.innerHTML = "";

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
            ${typeof q.wrongCount === "number" ? `<div class="wrong-count">Sai: ${q.wrongCount} lần</div>` : ""}
        `;
        container.appendChild(div);
    });

    renderCustomPagination(totalPages, list);
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

function renderCustomPagination(totalPages, currentList) {
    const pagination = document.getElementById("pagination-controls");
    pagination.innerHTML = "";

    if (totalPages <= 1) return;

    const maxVisible = 3;
    const createButton = (label, page = null, disabled = false) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        if (page !== null) {
            btn.onclick = () => {
                currentPage = page;
                renderSearchResults(currentList);  // sử dụng lại danh sách hiện tại
            };
        }
        if (disabled) btn.disabled = true;
        if (page === currentPage) btn.classList.add("active-page");
        return btn;
    };

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
    const imageInput = document.getElementById("imageInput");

    const newQuestion = {
        question: document.getElementById("question-text").value.trim(),
        answers: [
            document.getElementById("answer-A").value.trim(),
            document.getElementById("answer-B").value.trim(),
            document.getElementById("answer-C").value.trim(),
            document.getElementById("answer-D").value.trim(),
        ],
        correct: document.getElementById("correct-answer").value.trim(),
        favorite: false
    };

    // 👉 Nếu có chọn ảnh, thêm key image
    if (imageInput.files.length > 0) {
        const fileName = imageInput.files[0].name;
        newQuestion.image = `/admin/images/${fileName}`;
    }

    if (index) {
        // Nếu sửa và có ảnh mới thì ghi đè, không thì giữ ảnh cũ
        if (!newQuestion.image && questions[index].image) {
            newQuestion.image = questions[index].image;
        }
        questions[index] = { ...questions[index], ...newQuestion };
    } else {
        const duplicate = questions.find(q => q.question === newQuestion.question);
        if (duplicate) {
            const confirmAdd = confirm("Câu hỏi đã tồn tại. Bạn có muốn thêm bản sao?");
            if (!confirmAdd) return;
        }
        questions.push(newQuestion);
    }

    await saveToFile();         // ghi vào file baomat.json
    resetForm();                // reset form
    document.getElementById("slide-form").style.display = "none";
    renderQuestions();          // cập nhật lại danh sách
}

async function deleteQuestion(index) {
    if (!confirm("Bạn có chắc muốn xóa câu hỏi này?")) return;
    questions.splice(index, 1);
    await saveToFile();
    renderQuestions();
}

// ====== 7. TÌM KIẾM (Search) ======
function handleSearch() {
    const keyword = removeVietnameseTones(document.querySelector(".search-input").value.trim().toLowerCase());

    if (!keyword) {
        renderQuestions(); // Nếu ô tìm kiếm rỗng -> render toàn bộ như bình thường
        return;
    }

    const list = showFavoritesOnly ? questions.filter(q => q.favorite) : questions;

    const filtered = list.filter(q => {
        const text = removeVietnameseTones(q.question.toLowerCase());
        const answers = q.answers.map(a => removeVietnameseTones(a.toLowerCase())).join(" ");
        const correct = removeVietnameseTones((q.correct || "").toLowerCase());
        return text.includes(keyword) || answers.includes(keyword) || correct.includes(keyword);
    });

    currentPage = 1;
    renderSearchResults(filtered);
}
function handleSearch2() {
    const keyword = removeVietnameseTones(document.querySelector(".search-input2").value.trim().toLowerCase());

    if (!keyword) {
        renderQuestions(); // Nếu ô tìm kiếm rỗng -> render toàn bộ như bình thường
        return;
    }

    const list = showFavoritesOnly ? questions.filter(q => q.favorite) : questions;

    const filtered = list.filter(q => {
        const text = removeVietnameseTones(q.question.toLowerCase());
        const answers = q.answers.map(a => removeVietnameseTones(a.toLowerCase())).join(" ");
        const correct = removeVietnameseTones((q.correct || "").toLowerCase());
        return text.includes(keyword) || answers.includes(keyword) || correct.includes(keyword);
    });

    currentPage = 1;
    renderSearchResults(filtered);
}


// ====== 8. CUỘN TRANG & QUAY TRO LAI & RESET FORM ======
function scrollToTop() {
    const content = document.getElementById("content-area");
    content.scrollTo({ top: 0, behavior: "smooth" });
}

function scrollToBottom() {
    const content = document.getElementById("content-area");
    content.scrollTo({ top: content.scrollHeight, behavior: "smooth" });
}

function goBack() {
    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get('from');

    // Nếu có from thì quay lại đúng đường dẫn gốc
    if (from) {
        window.location.href = from;
    } else {
        // Nếu không có from, fallback về trang chủ mặc định
        window.location.href = '/';
    }
}


function resetForm() {
    document.getElementById("edit-index").value = "";
    document.getElementById("question-text").value = "";
    ["A", "B", "C", "D"].forEach(l => document.getElementById("answer-" + l).value = "");
    document.getElementById("correct-answer").value = "A";
}

// ====== 9. XUẤT PDF ======
async function exportToPDF(includeAnswers = false) {
    const container = document.createElement('div');
    container.style.padding = '20px';
    container.style.backgroundColor = 'white';
    container.style.color = 'black';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.fontSize = '14px';
    container.style.width = '800px'; // fix độ rộng để canh trang tốt hơn

    questions.forEach((q, index) => {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        let html = `<b>${index + 1}. ${q.question}</b><br>`;
        q.answers.forEach((ans, i) => {
            const letter = String.fromCharCode(65 + i);
            html += `${letter}. ${ans}<br>`;
        });
        if (includeAnswers && q.correct) {
            html += `<i>Đáp án đúng: ${q.correct}</i>`;
        }
        div.innerHTML = html;
        container.appendChild(div);
    });

    document.body.appendChild(container);

    const opt = {
        margin: 0.5,
        filename: includeAnswers ? 'Cau_hoi_CO_dap_an.pdf' : 'Cau_hoi_KHONG_dap_an.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    await html2pdf().from(container).set(opt).save();
    document.body.removeChild(container);
}

// ====== 10. PHONG TO THU NHO ẢNH ======
function enlargeImage(src) {
    const overlay = document.getElementById("imgOverlay");
    const modalImg = document.getElementById("modalImage");
    modalImg.src = src;
    overlay.style.display = "block";
    modalImg.style.display = "block";
}

function closeImage() {
    document.getElementById("imgOverlay").style.display = "none";
    document.getElementById("modalImage").style.display = "none";
}

// ====== 11. XÓA ẢNH ======
function removeImage(index) {
    questions[index].image = ""; // Reset giá trị ảnh
    renderQuestions();           // Cập nhật lại UI
    saveToFile();                // Lưu lại file JSON
}