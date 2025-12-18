const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// API endpoint to save CSV data
app.post("/api/save-dataset", (req, res) => {
  try {
    const { data, YEARS } = req.body;

    if (!data || !YEARS) {
      return res.status(400).json({ error: "Missing data or YEARS" });
    }

    // Convert data object to CSV format
    const headers = ["Country Name", ...YEARS.map(String)];
    const rows = [headers.join(",")];

    Object.entries(data).forEach(([country, yearData]) => {
      const values = [
        `"${country}"`,
        ...YEARS.map((year) => yearData[year] ?? ""),
      ];
      rows.push(values.join(","));
    });

    const csvContent = rows.join("\n");

    // Save to public folder
    const filePath = path.join(__dirname, "public", "global_life_expectancy.csv");

    fs.writeFileSync(filePath, csvContent, "utf8");

    res.json({
      success: true,
      message: "Dataset saved successfully to global_life_expectancy.csv",
    });
  } catch (error) {
    console.error("Error saving dataset:", error);
    res.status(500).json({ error: "Failed to save dataset", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`POST /api/save-dataset - Save edited data to CSV file`);
});
