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
        if (document.querySelector(".menu-toggle") && document.querySelector(".menu-toggle").classList.contains("active")) {
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

    // Thêm sự kiện cho nút tìm câu giống nhau
    const findSimilarBtn = document.getElementById("find-similar-btn");
    if (findSimilarBtn) {
        findSimilarBtn.addEventListener("click", () => {
            const input = prompt("Nhập ngưỡng tỷ lệ giống nhau tối thiểu (0.0 đến 1.0, mặc định 0.8):", "0.8");
            if (input === null) return;

            const threshold = parseFloat(input.trim()) || 0.8;
            if (threshold < 0 || threshold > 1) {
                alert("Ngưỡng không hợp lệ. Vui lòng nhập giá trị từ 0.0 đến 1.0.");
                return;
            }
            findSimilarQuestions(threshold); // Gọi hàm tìm kiếm
        });
    }

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
    // Kiểm tra xem .hamburger có tồn tại trước khi chèn
    const hamburgerBtn = document.querySelector(".hamburger");
    if (hamburgerBtn) {
        hamburgerBtn.parentNode.insertBefore(menuToggle, hamburgerBtn);
        menuToggle.addEventListener("click", () => {
            const navbar = document.querySelector(".navbar");
            navbar.classList.toggle("active");
            // Đóng form khi mở navbar
            if (navbar.classList.contains("active")) {
                document.getElementById("slide-form").classList.remove("active");
            }
        });
    }


    // Hamburger toggle form
    if (hamburgerBtn) { // Kiểm tra lần nữa
        hamburgerBtn.addEventListener("click", () => {
            const slideForm = document.getElementById("slide-form");
            slideForm.classList.toggle("active");
            // Đóng navbar khi mở form
            if (slideForm.classList.contains("active")) {
                document.querySelector(".navbar").classList.remove("active");
            }
        });
    }

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
        const isClickOnHamburger = hamburger ? hamburger.contains(event.target) : false;
        const isClickOnMenuToggle = menuToggle ? menuToggle.contains(event.target) : false;


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
    try {
        const res = await fetch('/questions');
        if (!res.ok) {
            if (res.status === 404) {
                console.warn("Không tìm thấy file questions.json. Khởi tạo danh sách câu hỏi rỗng.");
                questions = [];
            } else {
                throw new Error(`Lỗi tải câu hỏi: ${res.statusText}`);
            }
        } else {
            questions = await res.json();
        }

    } catch (error) {
        console.error("Lỗi khi tải câu hỏi:", error);
        questions = []; // Đảm bảo questions là một mảng rỗng nếu có lỗi
    }


    // Đảm bảo mỗi câu hỏi đều có thuộc tính favorite và chuẩn hóa xuống dòng
    questions.forEach(q => {
        if (typeof q.favorite === "undefined") q.favorite = false;
        // Chuẩn hóa: Đảm bảo tất cả câu hỏi trong bộ nhớ dùng \n thay vì <br>
        q.question = q.question.replace(/<br>/g, '\n');
    });

    renderQuestions();
}

async function saveToFile() {
    try {
        const res = await fetch('/save-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(questions),
        });
        if (!res.ok) {
            throw new Error(`Lỗi lưu câu hỏi: ${res.statusText}`);
        }
    } catch (error) {
        console.error("Lỗi khi lưu câu hỏi:", error);
        alert("Lỗi khi lưu câu hỏi. Vui lòng kiểm tra server.");
    }
}

// ====== 5. HIỂN THỊ GIAO DIỆN (Render) ======
function renderQuestions() {
    const container = document.getElementById("questions-container");
    container.innerHTML = "";

    // Xóa thông báo tìm kiếm giống nhau khi trở về chế độ xem thường
    const infoArea = document.getElementById("info-area");
    if (infoArea) infoArea.innerHTML = "";

    let list = showFavoritesOnly ? questions.filter(q => q.favorite) : questions;
    const totalPages = Math.ceil(list.length / pageSize);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    if (currentPage < 1 && totalPages > 0) currentPage = 1; // Khắc phục trường hợp currentPage = 0 khi không có câu hỏi

    const start = (currentPage - 1) * pageSize;
    const pageItems = list.slice(start, start + pageSize);

    if (pageItems.length === 0 && list.length > 0 && currentPage > 1) {
        // Nếu không có item nào trên trang hiện tại nhưng vẫn có list (do xoá item cuối của trang)
        currentPage--;
        renderQuestions(); // Render lại trang trước đó
        return;
    }


    pageItems.forEach((q, index) => {
        const realIndex = questions.indexOf(q);
        const div = document.createElement("div");
        div.className = "question";

        // CHỈ CHUYỂN \n SANG <br> KHI HIỂN THỊ RA HTML
        const formattedQuestion = q.question.replace(/\n/g, '<br>');

        // Ảnh + nút xoá ảnh (nếu có ảnh)
        const imageHtml = q.image
            ? `
            <div class="image-container">
                <img src="${q.image}" class="thumbnail" onclick="enlargeImage('${q.image}')"/>
                <button class="remove-image-btn" onclick="removeImage(${realIndex})">🗑 Xóa ảnh</button>
            </div>
            `
            : "";

        // SỬ DỤNG THẺ <strong> BÌNH THƯỜNG VỚI NỘI DUNG ĐÃ FORMAT
        div.innerHTML = `
            <strong>${start + index + 1}. ${formattedQuestion}</strong><br>
            ${imageHtml}
            ${q.answers.map((a, i) => `<div>${String.fromCharCode(65 + i)}: ${a}</div>`).join('')}
            <div>Đáp án đúng: ${q.correct || ''}</div>
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

    // Xóa thông báo tìm kiếm giống nhau khi ở chế độ xem kết quả tìm kiếm thường
    const infoArea = document.getElementById("info-area");
    if (infoArea) infoArea.innerHTML = "";

    const totalPages = Math.ceil(list.length / pageSize);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    if (currentPage < 1 && totalPages > 0) currentPage = 1; // Khắc phục trường hợp currentPage = 0 khi không có câu hỏi

    const start = (currentPage - 1) * pageSize;
    const pageItems = list.slice(start, start + pageSize);

    if (pageItems.length === 0 && list.length > 0 && currentPage > 1) {
        currentPage--;
        renderSearchResults(list); // Render lại trang trước đó
        return;
    }


    pageItems.forEach((q, index) => {
        const realIndex = questions.indexOf(q);
        const div = document.createElement("div");
        div.className = "question";

        // CHỈ CHUYỂN \n SANG <br> KHI HIỂN THỊ RA HTML
        const formattedQuestion = q.question.replace(/\n/g, '<br>');

        // Ảnh + nút xoá ảnh (nếu có ảnh) - Cần thêm cả vào search results nếu muốn hiển thị
        const imageHtml = q.image
            ? `
            <div class="image-container">
                <img src="${q.image}" class="thumbnail" onclick="enlargeImage('${q.image}')"/>
                <button class="remove-image-btn" onclick="removeImage(${realIndex})">🗑 Xóa ảnh</button>
            </div>
            `
            : "";

        // SỬ DỤNG THẺ <strong> BÌNH THƯỜNG VỚI NỘI DUNG ĐÃ FORMAT
        div.innerHTML = `
            <strong>${start + index + 1}. ${formattedQuestion}</strong><br>
            ${imageHtml}
            ${q.answers.map((a, i) => `<div>${String.fromCharCode(65 + i)}: ${a}</div>`).join('')}
            <div>Đáp án đúng: ${q.correct || ''}</div>
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

    // Nút Trang đầu
    pagination.appendChild(createButton("«", 1, currentPage === 1));

    // Nút Trang trước
    pagination.appendChild(createButton("<", currentPage - 1, currentPage === 1));


    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, currentPage + Math.floor(maxVisible / 2));

    if (endPage - startPage + 1 < maxVisible) {
        if (startPage === 1) {
            endPage = Math.min(totalPages, startPage + maxVisible - 1);
        } else if (endPage === totalPages) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
    }

    if (startPage > 1) {
        pagination.appendChild(createButton("...", null, true));
    }

    for (let i = startPage; i <= endPage; i++) {
        pagination.appendChild(createButton(i, i));
    }

    if (endPage < totalPages) {
        pagination.appendChild(createButton("...", null, true));
    }

    // Nút Trang sau
    pagination.appendChild(createButton(">", currentPage + 1, currentPage === totalPages));

    // Nút Trang cuối
    pagination.appendChild(createButton("»", totalPages, currentPage === totalPages));
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

                // Kiểm tra xem có đang ở chế độ xem kết quả tìm kiếm giống nhau không
                if (currentList && currentList.length > 0 && currentList[0].similarity !== undefined) {
                    renderSimilarResults(currentList);
                } else {
                    renderSearchResults(currentList);  // sử dụng lại danh sách hiện tại cho tìm kiếm thường
                }
            };
        }
        if (disabled) btn.disabled = true;
        if (page === currentPage) btn.classList.add("active-page");
        return btn;
    };

    // Nút Trang đầu
    pagination.appendChild(createButton("«", 1, currentPage === 1));

    // Nút Trang trước
    pagination.appendChild(createButton("<", currentPage - 1, currentPage === 1));

    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, currentPage + Math.floor(maxVisible / 2));

    if (endPage - startPage + 1 < maxVisible) {
        if (startPage === 1) {
            endPage = Math.min(totalPages, startPage + maxVisible - 1);
        } else if (endPage === totalPages) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
    }

    if (startPage > 1) {
        pagination.appendChild(createButton("...", null, true));
    }

    for (let i = startPage; i <= endPage; i++) {
        pagination.appendChild(createButton(i, i));
    }

    if (endPage < totalPages) {
        pagination.appendChild(createButton("...", null, true));
    }

    // Nút Trang sau
    pagination.appendChild(createButton(">", currentPage + 1, currentPage === totalPages));

    // Nút Trang cuối
    pagination.appendChild(createButton("»", totalPages, currentPage === totalPages));
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
    // q.question đã chứa \n sau khi loadQuestions() chuẩn hóa
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

    // Lấy nội dung từ textarea, nó đã chứa \n nếu người dùng nhập
    const rawQuestion = document.getElementById("question-text").value.trim();

    const newQuestion = {
        question: rawQuestion, // LƯU TRỰC TIẾP rawQuestion (có \n)
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
        // Giả định ảnh được lưu ở đây
        newQuestion.image = `/admin/images/${fileName}`;
    }

    if (index) {
        // Nếu sửa và có ảnh mới thì ghi đè, không thì giữ ảnh cũ
        if (!newQuestion.image && questions[index].image) {
            newQuestion.image = questions[index].image;
        }
        // Đảm bảo các thuộc tính khác (wrongCount) được giữ lại khi chỉnh sửa
        questions[index] = { ...questions[index], ...newQuestion };
    } else {
        const duplicate = questions.find(q => q.question === newQuestion.question);
        if (duplicate) {
            const confirmAdd = confirm("Câu hỏi đã tồn tại. Bạn có muốn thêm bản sao?");
            if (!confirmAdd) return;
        }
        questions.push(newQuestion);
    }

    await saveToFile();         // ghi vào file baomat.json
    resetForm();                // reset form
    document.getElementById("slide-form").style.display = "none";
    renderQuestions();          // cập nhật lại danh sách
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
        // q.question đã chứa \n
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
        // q.question đã chứa \n
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
    document.getElementById("imageInput").value = ""; // Xóa file đã chọn
    document.getElementById("form-title").innerText = "Thêm / Sửa Câu hỏi";
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

        // q.question đã chứa \n, white-space: pre-wrap sẽ xử lý đúng
        let html = `<div style="white-space: pre-wrap;"><b>${index + 1}. ${q.question}</b></div>`; // Dùng div với white-space: pre-wrap

        // Thêm ảnh nếu có
        if (q.image) {
            html += `<img src="${q.image}" style="max-width: 100%; height: auto; margin-top: 5px; margin-bottom: 10px;"/><br>`;
        }

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

    // Thêm vào body để html2pdf có thể xử lý, sau đó loại bỏ
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
    renderQuestions();           // Cập nhật lại UI
    saveToFile();                // Lưu lại file JSON
}

// ====== 12. TÌM CÁC CÂU GIỐNG NHAU ======

/**
 * Tính Sorensen-Dice Coefficient để đo độ giống nhau giữa hai chuỗi.
 * @param {string} s1 Chuỗi thứ nhất.
 * @param {string} s2 Chuỗi thứ hai.
 * @returns {number} Tỷ lệ giống nhau (0 đến 1).
 */
function diceCoefficient(s1, s2) {
    s1 = removeVietnameseTones(s1).toLowerCase().trim();
    s2 = removeVietnameseTones(s2).toLowerCase().trim();

    // Xử lý chuỗi rỗng
    if (!s1 || !s2) return s1 === s2 ? 1 : 0;

    // Tạo tập hợp các bigram (cặp ký tự)
    const bigrams1 = new Set();
    for (let i = 0; i < s1.length - 1; i++) {
        bigrams1.add(s1.substring(i, i + 2));
    }
    const bigrams2 = new Set();
    for (let i = 0; i < s2.length - 1; i++) {
        bigrams2.add(s2.substring(i, i + 2));
    }

    if (bigrams1.size === 0 && bigrams2.size === 0) return 1;
    if (bigrams1.size === 0 || bigrams2.size === 0) return 0;

    // Tính toán số lượng bigram chung (Intersection)
    let intersectionSize = 0;
    bigrams1.forEach(bigram => {
        if (bigrams2.has(bigram)) {
            intersectionSize++;
        }
    });

    // Công thức Dice: 2 * |Intersection| / (|A| + |B|)
    const coefficient = (2 * intersectionSize) / (bigrams1.size + bigrams2.size);
    return coefficient;
}

/**
 * Lọc và xếp hạng các cặp câu hỏi có nội dung giống nhau.
 * @param {number} threshold Ngưỡng tỷ lệ giống nhau tối thiểu (ví dụ: 0.8 cho 80%).
 */
function findSimilarQuestions(threshold = 0.8) {
    const similarPairs = [];
    const n = questions.length;

    // Duyệt qua tất cả các cặp (i, j) với i < j
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const q1 = questions[i];
            const q2 = questions[j];

            // Chỉ so sánh câu hỏi (q.question)
            const similarity = diceCoefficient(q1.question, q2.question);

            if (similarity >= threshold) {
                similarPairs.push({
                    q1: q1,
                    q2: q2,
                    similarity: similarity,
                    index1: i, // Lưu trữ chỉ mục thực tế trong mảng questions
                    index2: j
                });
            }
        }
    }

    // Sắp xếp theo tỷ lệ giống nhau giảm dần
    similarPairs.sort((a, b) => b.similarity - a.similarity);

    currentPage = 1;
    renderSimilarResults(similarPairs);
}

/**
 * Hiển thị các cặp câu hỏi giống nhau.
 * @param {Array<Object>} similarPairs Danh sách các cặp câu hỏi giống nhau.
 */
function renderSimilarResults(similarPairs) {
    const container = document.getElementById("questions-container");
    container.innerHTML = "";

    const list = similarPairs;
    const totalPages = Math.ceil(list.length / pageSize);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    if (currentPage < 1 && totalPages > 0) currentPage = 1;

    const start = (currentPage - 1) * pageSize;
    const pageItems = list.slice(start, start + pageSize);

    // Cập nhật tiêu đề hiển thị
    const infoArea = document.getElementById("info-area");
    if (infoArea) {
        infoArea.innerHTML = `Đã tìm thấy <strong>${similarPairs.length} cặp</strong> câu hỏi có độ giống nhau từ ${(similarPairs[0]?.similarity * 100).toFixed(2) || 0}% trở lên.`;
    }

    pageItems.forEach((pair, index) => {
        const div = document.createElement("div");
        div.className = "similar-pair";
        // Thay vì chỉ mục trang, hiển thị vị trí trong danh sách cặp giống nhau
        const displayIndex = start + index + 1;

        // Hàm hỗ trợ render một câu hỏi đơn lẻ
        const renderQuestionBlock = (q, realIndex, tag) => {
            const formattedQuestion = q.question.replace(/\n/g, '<br>');
            const imageHtml = q.image ? `<img src="${q.image}" class="thumbnail" onclick="enlargeImage('${q.image}')"/>` : "";

            return `
                <div class="similar-question-item">
                    <div class="question-header">
                        <strong>[${tag}] Câu #${realIndex + 1}: ${formattedQuestion}</strong>
                    </div>
                    ${imageHtml}
                    ${q.answers.map((a, i) => `<div>${String.fromCharCode(65 + i)}: ${a}</div>`).join('')}
                    <div>Đáp án đúng: ${q.correct || ''}</div>
                    <div class="question-actions">
                        <button onclick="editQuestion(${realIndex})">✏ Sửa</button>
                        <button onclick="deleteQuestion(${realIndex})">🗑 Xóa</button>
                    </div>
                </div>
            `;
        };

        div.innerHTML = `
            <div class="similarity-info">
                <strong>Cặp ${displayIndex}</strong>: Độ giống nhau: 
                <span class="similarity-score">${(pair.similarity * 100).toFixed(2)}%</span>
            </div>
            <div class="pair-content">
                ${renderQuestionBlock(pair.q1, pair.index1, 'A')}
                ${renderQuestionBlock(pair.q2, pair.index2, 'B')}
            </div>
        `;
        container.appendChild(div);
    });

    renderCustomPagination(totalPages, list); // Sử dụng lại hàm phân trang tùy chỉnh
}


// ====== 13. NHẬN DIỆN GIỌNG NÓI (Speech Recognition) ======
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN'; // Ngôn ngữ tiếng Việt
    recognition.interimResults = false; // Chỉ lấy kết quả cuối cùng
    recognition.maxAlternatives = 1;

    // Hàm xử lý nhận diện giọng nói và điền vào input
    function startSpeechRecognition(inputElement) {
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            inputElement.value = transcript; // Điền kết quả vào ô input
            // Kích hoạt sự kiện tìm kiếm sau khi điền
            const inputEvent = new Event('input', { bubbles: true });
            inputElement.dispatchEvent(inputEvent);
        };

        recognition.onerror = (event) => {
            console.error("Lỗi nhận diện giọng nói:", event.error);
            alert("Lỗi nhận diện giọng nói: " + event.error);
        };

        recognition.onend = () => {
            console.log("Kết thúc nhận diện giọng nói");
        };

        recognition.start();
    }

    // Gán sự kiện cho nút micro
    document.getElementById("voice-search-btn").addEventListener("click", () => {
        const searchInput = document.querySelector(".search-input2");
        startSpeechRecognition(searchInput);
    });

    document.getElementById("voice-search-btn2").addEventListener("click", () => {
        const searchInput = document.querySelector(".search-input");
        startSpeechRecognition(searchInput);
    });
} else {
    console.warn("Trình duyệt không hỗ trợ SpeechRecognition API.");
    document.getElementById("voice-search-btn").disabled = true;
    document.getElementById("voice-search-btn2").disabled = true;
    alert("Trình duyệt không hỗ trợ nhận diện giọng nói. Vui lòng sử dụng trình duyệt khác (như Chrome).");
}