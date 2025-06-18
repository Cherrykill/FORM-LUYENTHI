let lastFilteredStats = [];
const API = '/api';

async function fetchStats() {
    const res = await fetch('/get-stats'); // Bạn cần tạo API này nếu chưa có
    return res.json();
}

function renderTable(data) {
    const tbody = document.querySelector('#user-table tbody');
    tbody.innerHTML = '';

    data.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
  <td data-label="Tên">${user.username}</td>
  <td data-label="Email">${user.email || '–'}</td>
  <td data-label="Ngày tạo">${new Date(user.timestamp).toLocaleDateString('vi-VN')}</td>
  <td data-label="Phần trăm đúng">${user.percent}%</td>
  <td data-label="Số câu">${user.total}</td>
`;

        tr.addEventListener('click', () => openModal(user));
        tbody.appendChild(tr);
    });
}

function openModal(user) {
    document.querySelector('#user-modal').classList.remove('hidden');
    document.querySelector('#user-details').innerHTML = `
    <p><strong>Tên:</strong> ${user.username}</p>
    <p><strong>Email:</strong> ${user.email || '–'}</p>
    <p><strong>Ngày:</strong> ${new Date(user.timestamp).toLocaleString()}</p>
    <p><strong>Phần trăm đúng:</strong> ${user.percent}%</p>
    <p><strong>Đúng:</strong> ${user.correct}</p>
    <p><strong>Sai:</strong> ${user.wrong}</p>
    <p><strong>Chưa làm:</strong> ${user.unanswered}</p>
    <p><strong>Tổng:</strong> ${user.total}</p>
  `;
}

document.querySelector('.close-modal').addEventListener('click', () => {
    document.querySelector('#user-modal').classList.add('hidden');
});

function exportToCSV() {
    let rows = [["Tên", "Email", "Ngày", "Phần trăm", "Tổng"]];
    document.querySelectorAll('#user-table tbody tr').forEach(tr => {
        let row = Array.from(tr.children).map(td => td.textContent);
        rows.push(row);
    });

    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'thong_ke.csv';
    a.click();
}

function filterAndSort(stats) {
    const search = document.getElementById('search-user').value.toLowerCase();
    const sort = document.getElementById('sort-option').value;
    const filterTime = document.getElementById('filter-time').value;

    let filtered = stats.filter(user => user.username.toLowerCase().includes(search));

    if (filterTime !== 'all') {
        const now = new Date();
        filtered = filtered.filter(u => {
            const time = new Date(u.timestamp);
            if (filterTime === 'today') {
                return time.toDateString() === now.toDateString();
            } else if (filterTime === 'week') {
                const diff = (now - time) / (1000 * 60 * 60 * 24);
                return diff <= 7;
            }
            return true;
        });
    }

    filtered.sort((a, b) => {
        return sort === 'percent-desc'
            ? b.percent - a.percent
            : a.percent - b.percent;
    });

    lastFilteredStats = filtered; // ✅ đặt đúng vị trí sau khi filtered đã xử lý xong

    renderTable(filtered);
}


window.addEventListener('DOMContentLoaded', async () => {
    const stats = await fetchStats();

    ['search-user', 'sort-option', 'filter-time'].forEach(id =>
        document.getElementById(id).addEventListener('input', () => filterAndSort(stats))
    );

    filterAndSort(stats);

    // Vẽ biểu đồ Top 5 người dùng điểm cao nhất
    const top5 = [...stats]
        .sort((a, b) => b.percent - a.percent)
        .slice(0, 5);
    drawChart(top5);
});



// Bieu do
google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(() => console.log("Google Charts loaded"));

function drawChart(topUsers) {
    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Tên');
    data.addColumn('number', 'Phần trăm đúng');

    topUsers.forEach(user => {
        data.addRow([user.username, user.percent]);
    });

    const options = {
        title: 'Top 5 Người dùng có điểm cao nhất',
        titleTextStyle: { color: '#fff', fontSize: 18 },
        backgroundColor: '#1e1e1e',
        legend: { position: 'none', textStyle: { color: '#fff' } },
        chartArea: { left: 60, top: 50, width: '85%', height: '70%' },
        hAxis: {
            textStyle: { color: '#fff' },
            gridlines: { color: '#444' }
        },
        vAxis: {
            minValue: 0,
            maxValue: 100,
            textStyle: { color: '#fff' },
            gridlines: { color: '#444' }
        },
        colors: ['#00ffe7']
    };

    const chart = new google.visualization.ColumnChart(document.getElementById('chart_div'));
    chart.draw(data, options);
}


// Bat tat bieu do
document.getElementById('toggle-chart').addEventListener('click', () => {
    const chartDiv = document.getElementById('chart_div');
    const isVisible = chartDiv.style.display === 'block';

    if (!isVisible) {
        chartDiv.style.display = 'block'; // 👈 Quan trọng
        const top5 = [...lastFilteredStats]
            .sort((a, b) => b.percent - a.percent)
            .slice(0, 5);
        drawChart(top5);
    } else {
        chartDiv.style.display = 'none';
    }

    document.getElementById('toggle-chart').textContent = isVisible
        ? '🎯 Xem biểu đồ'
        : '❌ Ẩn biểu đồ';
});

