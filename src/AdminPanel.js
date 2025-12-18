import React, { useState, useEffect } from "react";
import {
  Dialog,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tabs,
  Tab,
  Box,
  Alert,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Add as AddIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { Slider } from "@mui/material";
import Papa from "papaparse";

function AdminPanel({ isOpen, onClose, lifeSeriesByName, onDataUpdate, YEARS }) {
  const [tabValue, setTabValue] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [editingData, setEditingData] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [yearStartIndex, setYearStartIndex] = useState(0);
  const YEARS_PER_VIEW = 10;

  const ADMIN_PASSWORD = "admin123"; // TODO: Use proper authentication in production

  // Initialize editing data from localStorage or props
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      const saved = localStorage.getItem("lifeExpectancyEdits");
      if (saved) {
        try {
          setEditingData(JSON.parse(saved));
        } catch (e) {
          setEditingData(JSON.parse(JSON.stringify(lifeSeriesByName)));
        }
      } else {
        setEditingData(JSON.parse(JSON.stringify(lifeSeriesByName)));
      }
      // Build history so undo/redo works across sessions:
      // if there are saved edits, include original state then saved edits
      try {
        const original = JSON.parse(JSON.stringify(lifeSeriesByName));
        if (saved) {
          const parsed = JSON.parse(saved);
          setHistory([original, parsed]);
          setHistoryIndex(1);
        } else {
          setHistory([original]);
          setHistoryIndex(0);
        }
      } catch (e) {
        setHistory([JSON.parse(JSON.stringify(lifeSeriesByName))]);
        setHistoryIndex(0);
      }
    }
  }, [isOpen, isAuthenticated, lifeSeriesByName]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPassword("");
      showMessage("Authenticated successfully!", "success");
    } else {
      showMessage("Invalid password", "error");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword("");
    onClose();
  };

  const showMessage = (msg, type) => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const updateCell = (country, year, value) => {
    const numValue = value === "" ? null : parseFloat(value);
    const newData = JSON.parse(JSON.stringify(editingData));
    if (!newData[country]) {
      newData[country] = {};
    }
    newData[country][year] = numValue;
    setEditingData(newData);
    setEditingCell(null);

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newData)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    saveToLocalStorage(newData);
  };

  const deleteCountry = (country) => {
    if (window.confirm(`Delete all data for ${country}?`)) {
      const newData = JSON.parse(JSON.stringify(editingData));
      delete newData[country];
      setEditingData(newData);

      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newData)));
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      saveToLocalStorage(newData);
      showMessage(`${country} deleted`, "info");
    }
  };

  const addCountry = () => {
    const countryName = prompt("Enter country name:");
    if (countryName && countryName.trim()) {
      const newData = JSON.parse(JSON.stringify(editingData));
      newData[countryName] = {};
      setEditingData(newData);

      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newData)));
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      saveToLocalStorage(newData);
      showMessage(`${countryName} added`, "success");
    }
  };

  const addYear = () => {
    const yearStr = prompt("Enter new year:");
    if (yearStr) {
      const year = parseInt(yearStr);
      if (!isNaN(year) && year > 0) {
        showMessage(
          "Note: Add values for each country individually in the table",
          "info"
        );
      } else {
        showMessage("Invalid year", "error");
      }
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setEditingData(JSON.parse(JSON.stringify(history[newIndex])));
      saveToLocalStorage(history[newIndex]);
      showMessage("Undo successful", "info");
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setEditingData(JSON.parse(JSON.stringify(history[newIndex])));
      saveToLocalStorage(history[newIndex]);
      showMessage("Redo successful", "info");
    }
  };

  const exportData = () => {
    const csvContent = convertToCSV(editingData);
    downloadCSV(csvContent, "life_expectancy_data.csv");
    showMessage("Data exported successfully", "success");
  };

  const convertToCSV = (data) => {
    const headers = ["Country Name", ...YEARS.map(String)];
    const rows = [headers.join(",")];

    Object.entries(data).forEach(([country, yearData]) => {
      const values = [
        `"${country}"`,
        ...YEARS.map((year) => yearData[year] ?? ""),
      ];
      rows.push(values.join(","));
    });

    return rows.join("\n");
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.click();
  };

  const handleImportCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const newData = {};
          results.data.forEach((row) => {
            const countryName = row["Country Name"];
            if (countryName) {
              const countryData = {};
              YEARS.forEach((year) => {
                const val = parseFloat(row[year]);
                if (!isNaN(val)) {
                  countryData[year] = val;
                }
              });
              if (Object.keys(countryData).length > 0) {
                newData[countryName] = countryData;
              }
            }
          });

          setEditingData(newData);
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(JSON.parse(JSON.stringify(newData)));
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
          saveToLocalStorage(newData);
          showMessage("CSV imported successfully", "success");
        } catch (err) {
          showMessage("Error parsing CSV", "error");
          console.error(err);
        }
      },
      error: (err) => {
        showMessage("Error reading file", "error");
        console.error(err);
      },
    });

    event.target.value = "";
  };

  const saveToLocalStorage = (data) => {
    localStorage.setItem("lifeExpectancyEdits", JSON.stringify(data));
  };

  const handleSaveChanges = () => {
    onDataUpdate(editingData);
    showMessage("Changes saved to app!", "success");
    setTimeout(() => {
      onClose();
      setIsAuthenticated(false);
    }, 1500);
  };

  const handleChangeDataset = async () => {
    try {
      showMessage("Saving dataset to CSV file...", "info");
      
      const response = await fetch("http://localhost:5000/api/save-dataset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: editingData,
          YEARS: YEARS,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showMessage("Dataset saved to global_life_expectancy.csv!", "success");
        onDataUpdate(editingData);
        setTimeout(() => {
          onClose();
          setIsAuthenticated(false);
        }, 2000);
      } else {
        showMessage(result.error || "Failed to save dataset", "error");
      }
    } catch (error) {
      console.error("Error:", error);
      showMessage(
        "Failed to connect to server. Make sure backend is running: npm run server",
        "error"
      );
    }
  };

  const handleResetData = () => {
    if (window.confirm("Reset all changes to original data?")) {
      setEditingData(JSON.parse(JSON.stringify(lifeSeriesByName)));
      localStorage.removeItem("lifeExpectancyEdits");
      setHistory([JSON.parse(JSON.stringify(lifeSeriesByName))]);
      setHistoryIndex(0);
      showMessage("Data reset to original", "info");
    }
  };

  const filteredCountries = Object.keys(editingData).filter((country) =>
    country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { maxHeight: "90vh" } }}
    >
      {!isAuthenticated ? (
        // Login Screen
        <Box sx={{ p: 4, textAlign: "center" }}>
          <h2 style={{ marginBottom: "20px" }}>Admin Panel - Authentication</h2>
          <TextField
            type="password"
            label="Enter Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleLogin()}
            sx={{ mb: 2, minWidth: 300 }}
          />
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center", mt: 2 }}>
            <Button variant="contained" onClick={handleLogin}>
              Login
            </Button>
            <Button variant="outlined" onClick={onClose}>
              Cancel
            </Button>
          </Box>
          <p style={{ marginTop: "20px", fontSize: "12px", color: "#666" }}>
            Demo password: <code>admin123</code>
          </p>
        </Box>
      ) : (
        // Admin Panel
        <>
          <Box sx={{ p: 2, borderBottom: "1px solid #ddd", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>Data Management</h2>
            <IconButton onClick={handleLogout} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {message && (
            <Alert severity={message.type} sx={{ m: 2 }}>
              {message.text}
            </Alert>
          )}

          <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} sx={{ px: 2, borderBottom: "1px solid #eee" }}>
            <Tab label="Edit Data" />
            <Tab label="Import/Export" />
            <Tab label="History" />
          </Tabs>

          {/* Edit Data Tab */}
          {tabValue === 0 && (
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
                <TextField
                  placeholder="Search countries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
                  sx={{ flex: 1, minWidth: 200 }}
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={addCountry}
                >
                  Add Country
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<UndoIcon />}
                  onClick={undo}
                  disabled={historyIndex <= 0}
                >
                  Undo
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RedoIcon />}
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                >
                  Redo
                </Button>
              </Box>

              {/* Year Range Slider */}
              <Box sx={{ px: 2, py: 2, backgroundColor: "#f9f9f9", borderRadius: "4px", mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => setYearStartIndex(Math.max(0, yearStartIndex - 1))}
                    disabled={yearStartIndex === 0}
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                  <Box sx={{ flex: 1 }}>
                    <Slider
                      value={yearStartIndex}
                      onChange={(e, newValue) => setYearStartIndex(newValue)}
                      min={0}
                      max={Math.max(0, YEARS.length - YEARS_PER_VIEW)}
                      step={1}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => `${YEARS[value] || 0}`}
                      marks={[
                        { value: 0, label: YEARS[0] },
                        { value: Math.max(0, YEARS.length - YEARS_PER_VIEW), label: YEARS[YEARS.length - 1] }
                      ]}
                    />
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => setYearStartIndex(Math.min(YEARS.length - YEARS_PER_VIEW, yearStartIndex + 1))}
                    disabled={yearStartIndex >= YEARS.length - YEARS_PER_VIEW}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                  <Box sx={{ minWidth: 150, textAlign: "right", fontSize: "12px", color: "#666" }}>
                    Viewing years {YEARS[yearStartIndex]} - {YEARS[Math.min(yearStartIndex + YEARS_PER_VIEW - 1, YEARS.length - 1)]}
                  </Box>
                </Box>
              </Box>

              <TableContainer component={Paper} sx={{ maxHeight: "500px", overflow: "auto" }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell sx={{ fontWeight: "bold", minWidth: 150 }}>Country</TableCell>
                      {YEARS.slice(yearStartIndex, yearStartIndex + YEARS_PER_VIEW).map((year) => (
                        <TableCell
                          key={year}
                          align="center"
                          sx={{ fontWeight: "bold", minWidth: 80 }}
                        >
                          {year}
                        </TableCell>
                      ))}
                      <TableCell align="center" sx={{ fontWeight: "bold" }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCountries.map((country) => (
                      <TableRow key={country}>
                        <TableCell>{country}</TableCell>
                        {YEARS.slice(yearStartIndex, yearStartIndex + YEARS_PER_VIEW).map((year) => (
                          <TableCell
                            key={year}
                            align="center"
                            onDoubleClick={() => setEditingCell(`${country}-${year}`)}
                            sx={{
                              cursor: "pointer",
                              backgroundColor:
                                editingCell === `${country}-${year}`
                                  ? "#e3f2fd"
                                  : "transparent",
                              padding: "4px",
                            }}
                          >
                            {editingCell === `${country}-${year}` ? (
                              <TextField
                                type="number"
                                defaultValue={editingData[country][year] ?? ""}
                                autoFocus
                                size="small"
                                onBlur={(e) =>
                                  updateCell(country, year, e.target.value)
                                }
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") {
                                    updateCell(country, year, e.target.value);
                                  }
                                }}
                                sx={{ width: "60px" }}
                              />
                            ) : (
                              editingData[country][year]?.toFixed(2) ?? "-"
                            )}
                          </TableCell>
                        ))}
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => deleteCountry(country)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: "flex", gap: 2, mt: 3, justifyContent: "flex-end" }}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleResetData}
                >
                  Reset to Original
                </Button>
                <Button
                  variant="contained"
                  onClick={handleChangeDataset}
                  sx={{ backgroundColor: "#2196F3", "&:hover": { backgroundColor: "#1976D2" } }}
                >
                  Change Dataset
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveChanges}
                >
                  Save Changes
                </Button>
              </Box>
            </Box>
          )}

          {/* Import/Export Tab */}
          {tabValue === 1 && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ mb: 3 }}>
                <h3>Export Data</h3>
                <p style={{ color: "#666", marginBottom: "10px" }}>
                  Download current data as CSV file
                </p>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={exportData}
                >
                  Export as CSV
                </Button>
              </Box>

              <Box sx={{ borderTop: "1px solid #ddd", pt: 3 }}>
                <h3>Import Data</h3>
                <p style={{ color: "#666", marginBottom: "10px" }}>
                  Upload a CSV file to replace or merge data
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  id="csv-upload"
                  style={{ display: "none" }}
                />
                <label htmlFor="csv-upload">
                  <Button
                    variant="contained"
                    component="span"
                    startIcon={<UploadIcon />}
                  >
                    Import CSV
                  </Button>
                </label>
              </Box>
            </Box>
          )}

          {/* History Tab */}
          {tabValue === 2 && (
            <Box sx={{ p: 3 }}>
              <h3>Change History</h3>
              <p style={{ color: "#666" }}>
                {history.length} states in history. Current: {historyIndex + 1}
              </p>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<UndoIcon />}
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  fullWidth
                >
                  Undo ({historyIndex})
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RedoIcon />}
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  fullWidth
                >
                  Redo ({history.length - historyIndex - 1})
                </Button>
              </Box>
            </Box>
          )}
        </>
      )}
    </Dialog>
  );
}

export default AdminPanel;
