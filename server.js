const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser'); 

const app = express();
app.use(cors());
app.use(express.json());

// 1. KẾT NỐI DATABASE
const dbPath = path.resolve(__dirname, 'life.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Lỗi DB:', err.message);
    else console.log('✅ Đã kết nối SQLite');
});

// 2. TẠO BẢNG VÀ IMPORT DỮ LIỆU TỪ CSV
db.serialize(() => {
    // Tạo bảng nếu chưa có
    db.run(`CREATE TABLE IF NOT EXISTS LifeData (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        country_name TEXT,
        country_code TEXT,
        year INTEGER,
        value REAL,
        UNIQUE(country_code, year)
    )`);

    // Kiểm tra dữ liệu, nếu trống thì Import từ CSV
    db.get("SELECT count(*) as count FROM LifeData", (err, row) => {
        if (row && row.count === 0) {
            console.log("⚠️ Database đang trống. Đang tiến hành Import từ CSV...");
            const csvFilePath = path.resolve(__dirname, 'global_life_expectancy.csv');
            
            if (fs.existsSync(csvFilePath)) {
                const stmt = db.prepare("INSERT OR IGNORE INTO LifeData (country_name, country_code, year, value) VALUES (?, ?, ?, ?)");
                let count = 0;

                fs.createReadStream(csvFilePath)
                    .pipe(csv({ skipLines: 4 }))
                    .on('data', (row) => {
                        // File CSV của bạn dạng ngang (Wide), cần chuyển sang dọc (Long)
                        const countryName = row['Country Name'];
                        const countryCode = row['Country Code'];
                        
                        // Duyệt qua các cột năm (1960 -> 2023)
                        Object.keys(row).forEach(key => {
                            if (!isNaN(key) && key.length === 4) { // Nếu key là năm (VD: 1960)
                                const year = parseInt(key);
                                const value = parseFloat(row[key]);
                                if (!isNaN(value)) {
                                    stmt.run(countryName, countryCode, year, value);
                                    count++;
                                }
                            }
                        });
                    })
                    .on('end', () => {
                        stmt.finalize();
                        console.log(`✅ Đã Import thành công ${count} dòng dữ liệu!`);
                    });
            } else {
                console.log("❌ Không tìm thấy file CSV để import. Hãy copy file vào cùng thư mục server.js");
            }
        } else {
            console.log("✅ Database đã có dữ liệu. Sẵn sàng phục vụ!");
        }
    });
});

// --- API ---

// Lấy dữ liệu
app.get('/data', (req, res) => {
    db.all("SELECT * FROM LifeData", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const lifeSeries = {};
        rows.forEach(row => {
            const normName = row.country_name.toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]/g, "");
            if (!lifeSeries[normName]) lifeSeries[normName] = {};
            lifeSeries[normName][row.year] = row.value;
        });
        res.json(lifeSeries);
    });
});

// Thêm, Sửa, Xóa (Giữ nguyên logic cũ)
app.post('/add', (req, res) => {
    const { name, code, year, value } = req.body;
    db.run("INSERT INTO LifeData (country_name, country_code, year, value) VALUES (?, ?, ?, ?)", 
        [name, code, year, value], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Added" });
    });
});

app.put('/update', (req, res) => {
    const { code, year, value } = req.body;
    db.run("UPDATE LifeData SET value = ? WHERE country_code = ? AND year = ?", 
        [value, code, year], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Updated" });
    });
});

app.delete('/delete', (req, res) => {
    const { code, year } = req.body;
    db.run("DELETE FROM LifeData WHERE country_code = ? AND year = ?", 
        [code, year], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Deleted" });
    });
});

app.listen(5000, () => console.log('🚀 Server đang chạy tại http://localhost:5000'));