import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { geoMercator } from "d3-geo";
import { scaleSequential, scaleDiverging } from "d3-scale";
import { interpolateGreens, interpolateRdYlGn } from "d3-scale-chromatic";
import { Button, MenuItem, Select } from "@mui/material";
import { ZoomIn, ZoomOut, RestartAlt, Settings as SettingsIcon } from "@mui/icons-material";
import "./App.css";
import * as topojson from "topojson-client";
import Papa from "papaparse";
import AdminPanel from "./AdminPanel";

const PUBLIC_URL = process.env.PUBLIC_URL || "";
const GEO_URL = `${PUBLIC_URL}/countries-110m.json`;
const LIFE_CSV_URL = `${PUBLIC_URL}/global_life_expectancy.csv`;
const META_COUNTRY_CSV_URL = `${PUBLIC_URL}/Metadata_Country_API_SP.DYN.LE00.IN_DS2_en_csv_v2_130058.csv`;
const META_INDICATOR_CSV_URL = `${PUBLIC_URL}/Metadata_Indicator_API_SP.DYN.LE00.IN_DS2_en_csv_v2_130058.csv`;

const START_YEAR = 1960;
const END_YEAR = 2023;
const COLOR_START_YEAR = 2000;
const COLOR_END_YEAR = 2023;

const YEARS = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);
const COLOR_YEARS = YEARS.filter((y) => y >= COLOR_START_YEAR && y <= COLOR_END_YEAR);

function normalizeName(name) {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu tiếng Việt/Pháp, v.v.
    .replace(/[\s,.'()\-"]/g, "");
}

// Map một số tên nước đặc biệt trong topojson sang tên trong CSV
const NAME_ALIASES = {
  // topo: "United States of America" → csv: "United States"
  [normalizeName("United States of America")]: normalizeName("United States"),
  // topo: "Russia" → csv: "Russian Federation"
  [normalizeName("Russia")]: normalizeName("Russian Federation"),
  // topo: "Dem. Rep. Congo" → csv: "Congo, Dem. Rep."
  [normalizeName("Dem. Rep. Congo")]: normalizeName("Congo, Dem. Rep."),
  // topo: "Dominican Rep." → csv: "Dominican Republic"
  [normalizeName("Dominican Rep.")]: normalizeName("Dominican Republic"),
  // topo: "Bahamas" → csv: "Bahamas, The"
  [normalizeName("Bahamas")]: normalizeName("Bahamas, The"),
  // topo: "Central African Rep." → csv: "Central African Republic"
  [normalizeName("Central African Rep.")]: normalizeName("Central African Republic"),
  // topo: "Congo" → csv: "Congo, Rep."
  [normalizeName("Congo")]: normalizeName("Congo, Rep."),
  // topo: "Eq. Guinea" → csv: "Equatorial Guinea"
  [normalizeName("Eq. Guinea")]: normalizeName("Equatorial Guinea"),
  // topo: "Gambia" → csv: "Gambia, The"
  [normalizeName("Gambia")]: normalizeName("Gambia, The"),
  // topo: "Laos" → csv: "Lao PDR"
  [normalizeName("Laos")]: normalizeName("Lao PDR"),
  // topo: "North Korea" → csv: "Korea, Dem. People's Rep."
  [normalizeName("North Korea")]: normalizeName("Korea, Dem. People's Rep."),
  // topo: "South Korea" → csv: "Korea, Rep."
  [normalizeName("South Korea")]: normalizeName("Korea, Rep."),
  // topo: "Kyrgyzstan" → csv: "Kyrgyz Republic"
  [normalizeName("Kyrgyzstan")]: normalizeName("Kyrgyz Republic"),
  // topo: "Iran" → csv: "Iran, Islamic Rep."
  [normalizeName("Iran")]: normalizeName("Iran, Islamic Rep."),
  // topo: "Syria" → csv: "Syrian Arab Republic"
  [normalizeName("Syria")]: normalizeName("Syrian Arab Republic"),
  // topo: "Turkey" → csv: "Türkiye" (World Bank naming)
  [normalizeName("Turkey")]: normalizeName("Türkiye"),
  // topo: "Solomon Is." → csv: "Solomon Islands"
  [normalizeName("Solomon Is.")]: normalizeName("Solomon Islands"),
  // topo: "Brunei" → csv: "Brunei Darussalam"
  [normalizeName("Brunei")]: normalizeName("Brunei Darussalam"),
  // topo: "Slovakia" → csv: "Slovak Republic"
  [normalizeName("Slovakia")]: normalizeName("Slovak Republic"),
  // topo: "Yemen" → csv: "Yemen, Rep."
  [normalizeName("Yemen")]: normalizeName("Yemen, Rep."),
  // topo: "Bosnia and Herz." → csv: "Bosnia and Herzegovina"
  [normalizeName("Bosnia and Herz.")]: normalizeName("Bosnia and Herzegovina"),
  // topo: "Macedonia" → csv: "North Macedonia"
  [normalizeName("Macedonia")]: normalizeName("North Macedonia"),
  // topo: "S. Sudan" → csv: "South Sudan"
  [normalizeName("S. Sudan")]: normalizeName("South Sudan"),
  // topo: "Egypt" → csv: "Egypt, Arab Rep."
  [normalizeName("Egypt")]: normalizeName("Egypt, Arab Rep."),
  // topo: "Venezuela" → csv: "Venezuela, RB"
  [normalizeName("Venezuela")]: normalizeName("Venezuela, RB"),
  // topo: "Puerto Rico" → csv: "Puerto Rico" (territory)
  [normalizeName("Puerto Rico")]: normalizeName("Puerto Rico"),
};

export default function App() {
  const [tooltip, setTooltip] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [lifeSeriesByName, setLifeSeriesByName] = useState({});
  const [lifeByYearForMap, setLifeByYearForMap] = useState({});
  const [allCountries, setAllCountries] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState([0, 0]);
  const [selectedYear, setSelectedYear] = useState(COLOR_END_YEAR);
  const [indicatorDescription, setIndicatorDescription] = useState("");
  const [chartType, setChartType] = useState("line");
  const [chartRange, setChartRange] = useState("after2000"); // all, before2000, after2000
  const [colorStats, setColorStats] = useState({ min: 30, mean: 50, max: 80 });
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const mapRef = useRef(null);

  // Load topojson + real life expectancy data
  useEffect(() => {
    async function loadData() {
      try {
        const [topoRes, lifeRes, metaCountryRes, metaIndicatorRes] = await Promise.all([
          fetch(GEO_URL),
          fetch(LIFE_CSV_URL),
          fetch(META_COUNTRY_CSV_URL),
          fetch(META_INDICATOR_CSV_URL),
        ]);

        const topoJson = await topoRes.json();
        const topoCountries = topoJson.objects.countries
          ? topojson.feature(topoJson, topoJson.objects.countries).features
          : [];
        setAllCountries(topoCountries);

        const lifeText = await lifeRes.text();
        const metaCountryText = await metaCountryRes.text();
        const metaIndicatorText = await metaIndicatorRes.text();

        const lifeHeaderMarker = '"Country Name","Country Code"';
        const lifeStartIndex = lifeText.indexOf(lifeHeaderMarker);
        const lifeCleanText = lifeStartIndex !== -1 ? lifeText.slice(lifeStartIndex) : lifeText;

        const lifeParsed = Papa.parse(lifeCleanText, {
          header: true,
          skipEmptyLines: true,
        });

        const metaCountryParsed = Papa.parse(metaCountryText, {
          header: true,
          skipEmptyLines: true,
        });

        const metaIndicatorParsed = Papa.parse(metaIndicatorText, {
          header: true,
          skipEmptyLines: true,
        });

        const countryNameToCode = {};
        const tableNameToCode = {};

        metaCountryParsed.data.forEach((row) => {
          const code = row["Country Code"];
          const tableName = row["TableName"];
          const normTableName = normalizeName(tableName);
          if (code && normTableName) {
            tableNameToCode[normTableName] = code;
          }
          const fullName = row["TableName"];
          const normFull = normalizeName(fullName);
          if (code && normFull) {
            countryNameToCode[normFull] = code;
          }
        });

        const lifeSeries = {};

        lifeParsed.data.forEach((row) => {
          const name = row["Country Name"];
          if (!name) return;
          const normName = normalizeName(name);

          const series = {};
          YEARS.forEach((year) => {
            const valRaw = row[String(year)];
            const val = valRaw === undefined || valRaw === null || valRaw === "" ? null : parseFloat(valRaw);
            if (!Number.isNaN(val) && val !== null) {
              series[year] = val;
            }
          });

          if (Object.keys(series).length > 0) {
            lifeSeries[normName] = series;
          }
        });

        const indicatorRow = metaIndicatorParsed.data.find(
          (r) => r["INDICATOR_CODE"] === "SP.DYN.LE00.IN"
        );
        if (indicatorRow) {
          setIndicatorDescription(indicatorRow["INDICATOR_NAME"] || "");
        }

        // Check for localStorage edits
        const savedEdits = localStorage.getItem("lifeExpectancyEdits");
        const finalLifeSeries = savedEdits
          ? JSON.parse(savedEdits)
          : lifeSeries;

        setLifeSeriesByName(finalLifeSeries);

        setLifeByYearForMap((prev) => {
          const byYear = { ...prev };
          COLOR_YEARS.forEach((year) => {
            const lifeForYear = {};
            Object.entries(finalLifeSeries).forEach(([normName, series]) => {
              if (series[year] !== undefined) {
                lifeForYear[normName] = series[year];
              }
            });
            byYear[year] = lifeForYear;
          });
          return byYear;
        });
      } catch (e) {
        console.error(e);
      }
    }

    loadData();
  }, []);

  const colorScale = useMemo(() => {
    const values = Object.values(lifeByYearForMap[selectedYear] || {});
    if (values.length === 0) {
      return () => "#dcdcdc";
    }

    let min = Math.min(...values);
    let max = Math.max(...values);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

    if (min === max) {
      min = Math.max(0, min - 5);
      max = max + 5;
    }

    setColorStats({ min, mean, max });

    // Diverging scale: thấp hơn trung bình → tone ấm, quanh trung bình → vàng nhạt,
    // cao hơn trung bình → xanh lá đậm, mỗi phía gradient theo giá trị.
    return scaleDiverging(interpolateRdYlGn).domain([min, mean, max]);
  }, [lifeByYearForMap, selectedYear]);

  const legendGradient = useMemo(() => {
    const { min, max } = colorStats;
    if (min === undefined || max === undefined || !Number.isFinite(min) || !Number.isFinite(max)) {
      return "linear-gradient(to right, #dcdcdc, #dcdcdc)";
    }
    if (min === max) {
      const c = colorScale(min);
      return `linear-gradient(to right, ${c}, ${c})`;
    }

    const steps = 9;
    const stops = Array.from({ length: steps }, (_, i) => {
      const t = i / (steps - 1);
      const v = min + t * (max - min);
      return colorScale(v);
    });
    return `linear-gradient(to right, ${stops.join(", ")})`;
  }, [colorScale, colorStats]);

  const selectedFeature = useMemo(() => {
    if (!selectedCountry || allCountries.length === 0) return null;
    return (
      allCountries.find((f) => f.properties?.name === selectedCountry) ?? null
    );
  }, [selectedCountry, allCountries]);

  const selectedCountrySeries = useMemo(() => {
    if (!selectedFeature) return null;
    let normName = normalizeName(selectedFeature.properties?.name);
    if (NAME_ALIASES[normName]) {
      normName = NAME_ALIASES[normName];
    }
    return lifeSeriesByName[normName] || null;
  }, [selectedFeature, lifeSeriesByName]);

  // Debug: log countries without data for the currently selected year
  useEffect(() => {
    const yearData = lifeByYearForMap[selectedYear];
    if (!yearData || !allCountries.length) return;

    const missing = allCountries
      .map((f) => f.properties?.name)
      .filter(Boolean)
      .filter((name) => {
        let norm = normalizeName(name);
        if (NAME_ALIASES[norm]) {
          norm = NAME_ALIASES[norm];
        }
        return yearData[norm] === undefined;
      });

    // Chỉ log một danh sách gọn để bạn tiện kiểm tra trong console
    console.log("[LifeExpectancy] Countries without data for year", selectedYear, ":", missing);
  }, [allCountries, lifeByYearForMap, selectedYear]);

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.5, 20));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.5, 1));
  const handleReset = () => {
    setZoom(1);
    setCenter([0, 0]);
  };

  const handleDataUpdate = (updatedData) => {
    setLifeSeriesByName(updatedData);
    setLifeByYearForMap((prev) => {
      const byYear = { ...prev };
      COLOR_YEARS.forEach((year) => {
        const lifeForYear = {};
        Object.entries(updatedData).forEach(([normName, series]) => {
          if (series[year] !== undefined) {
            lifeForYear[normName] = series[year];
          }
        });
        byYear[year] = lifeForYear;
      });
      return byYear;
    });
  };

  const popOutProjection = useMemo(() => {
    if (!selectedFeature) return geoMercator().scale(1).translate([220, 180]);
    // make country map inside popout a bit wider
    return geoMercator().fitSize([360, 320], selectedFeature);
  }, [selectedFeature]);

  const renderCountryChart = () => {
    if (!selectedCountrySeries) return null;

    let filteredYears = YEARS.filter((year) => selectedCountrySeries[year] !== undefined);

    if (chartRange === "before2000") {
      filteredYears = filteredYears.filter((y) => y < 2000);
    } else if (chartRange === "after2000") {
      filteredYears = filteredYears.filter((y) => y >= 2000);
    }

    const dataPoints = filteredYears.map((year) => ({ year, value: selectedCountrySeries[year] }));

    if (dataPoints.length === 0) {
      return <div className="text-gray-400">No data for this country.</div>;
    }

    const width = 520;   // wider logical width so chart uses more horizontal space
    const height = 290;  // taller logical height
    const padding = 36;  // slightly smaller margin so data area lớn hơn

    const xMin = dataPoints[0].year;
    const xMax = dataPoints[dataPoints.length - 1].year;
    let yMin = Math.min(...dataPoints.map((d) => d.value));
    let yMax = Math.max(...dataPoints.map((d) => d.value));
    if (yMin === yMax) {
      yMin = Math.max(0, yMin - 5);
      yMax = yMax + 5;
    }

    const scaleX = (year) =>
      padding + ((year - xMin) / (xMax - xMin || 1)) * (width - 2 * padding);
    const scaleY = (value) =>
      height - padding - ((value - yMin) / (yMax - yMin || 1)) * (height - 2 * padding);

    const chartColorScale = scaleSequential()
      .domain([yMin, yMax])
      .interpolator(interpolateGreens);
    const xTickCount = Math.min(6, dataPoints.length);
    const xTickStep = Math.max(1, Math.floor(dataPoints.length / xTickCount));

    const yTicks = 5;
    const yStep = (yMax - yMin) / yTicks || 1;

    if (chartType === "bar") {
      const barWidth = (width - 2 * padding) / dataPoints.length;
      return (
        <svg width={width} height={height} className="w-full h-full">
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
          {Array.from({ length: yTicks + 1 }, (_, i) => {
            const v = yMin + i * yStep;
            const y = scaleY(v);
            return (
              <g key={i}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#f3f4f6"
                  strokeWidth={1}
                />
                <text
                  x={padding - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize={11}
                  fill="#111827"
                >
                  {v.toFixed(0)}
                </text>
              </g>
            );
          })}
          {dataPoints.map((d, i) => {
            const x = padding + i * barWidth + barWidth * 0.1;
            const y = scaleY(d.value);
            const h = height - padding - y;
            return (
              <rect
                key={d.year}
                x={x}
                y={y}
                width={barWidth * 0.8}
                height={h}
                fill={chartColorScale(d.value)}
              >
                <title>
                  {`Year ${d.year}: ${d.value.toFixed(2)} years`}
                </title>
              </rect>
            );
          })}
          {dataPoints.map((d, i) => {
            if (i % xTickStep !== 0 && i !== dataPoints.length - 1) return null;
            const x = scaleX(d.year);
            return (
              <text
                key={d.year}
                x={x}
                y={height - padding + 16}
                textAnchor="middle"
                fontSize={11}
                fill="#111827"
              >
                {d.year}
              </text>
            );
          })}
          <text
            x={width / 2}
            y={height - 6}
            textAnchor="middle"
            fontSize={12}
            fill="#111827"
          >
            Year
          </text>
          <text
            x={12}
            y={height / 2}
            textAnchor="middle"
            fontSize={12}
            fill="#111827"
            transform={`rotate(-90 12 ${height / 2})`}
          >
            Life expectancy (years)
          </text>
        </svg>
      );
    }

    const pathD = dataPoints
      .map((d, i) => {
        const x = scaleX(d.year);
        const y = scaleY(d.value);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");

    return (
      <svg width={width} height={height} className="w-full h-full">
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#e5e7eb"
          strokeWidth={1}
        />
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="#e5e7eb"
          strokeWidth={1}
        />
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const v = yMin + i * yStep;
          const y = scaleY(v);
          return (
            <g key={i}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#f3f4f6"
                strokeWidth={1}
              />
              <text
                x={padding - 6}
                y={y + 3}
                textAnchor="end"
                fontSize={11}
                fill="#111827"
              >
                {v.toFixed(0)}
              </text>
            </g>
          );
        })}
        <path d={pathD} fill="none" stroke="#16a34a" strokeWidth={2} />
        {dataPoints.map((d, i) => (
          <circle
            key={d.year}
            cx={scaleX(d.year)}
            cy={scaleY(d.value)}
            r={i === dataPoints.length - 1 ? 4 : 3}
            fill={chartColorScale(d.value)}
          >
            <title>
              {`Year ${d.year}: ${d.value.toFixed(2)} years`}
            </title>
          </circle>
        ))}
        {dataPoints.map((d, i) => {
          if (i % xTickStep !== 0 && i !== dataPoints.length - 1) return null;
          const x = scaleX(d.year);
          return (
            <text
              key={d.year}
              x={x}
              y={height - padding + 16}
              textAnchor="middle"
              fontSize={11}
              fill="#111827"
            >
              {d.year}
            </text>
          );
        })}
        <text
          x={width / 2}
          y={height - 6}
          textAnchor="middle"
          fontSize={12}
          fill="#111827"
        >
          Year
        </text>
        <text
          x={12}
          y={height / 2}
          textAnchor="middle"
          fontSize={12}
          fill="#111827"
          transform={`rotate(-90 12 ${height / 2})`}
        >
          Life expectancy (years)
        </text>
      </svg>
    );
  };

  const currentLifeData = lifeByYearForMap[selectedYear] || {};

  return (
    <div className="w-full min-h-screen flex flex-col bg-gradient-to-br from-sky-50 via-emerald-50 to-sky-100 p-10">
      <header className="px-4 py-3 flex items-center justify-center relative shadow-sm fixed top-0 left-0 right-0 z-40 backdrop-blur-md border-b border-white/60">
        <h1 className="text-4xl font-semibold text-center tracking-wide app-title">
          <span className="inline-flex items-center gap-2">
            <span className="bg-gradient-to-r from-sky-700 via-emerald-600 to-sky-900 bg-clip-text text-transparent">
              WORLD LIFE EXPECTANCY
            </span>
          </span>
        </h1>
        <div className="flex items-center gap-3 absolute right-4">
          <Button
            variant="outlined"
            size="small"
            onClick={() => setAdminPanelOpen(true)}
            startIcon={<SettingsIcon />}
            sx={{ color: "#666", borderColor: "#ddd" }}
          >
            Admin
          </Button>
          <div className="text-sm text-gray-600 mr-1">Year</div>
          <Select
            size="small"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            variant="outlined"
            sx={{ backgroundColor: "white", minWidth: 100 }}
          >
            {COLOR_YEARS.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </div>
      </header>

      <main className="flex-1 relative px-4 pt-5 pb-4 mt-2">
        {/* MAIN MAP */}
        <div
          ref={mapRef}
          className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-white/95 via-white/85 to-white/70 backdrop-blur-md shadow-2xl border border-white/40"
        >
          <ComposableMap
            projectionConfig={{ scale: 190 }}
            width={1100}
            height={580}
            style={{ width: "100%", height: "76vh", outline: "none" }}
          >
            <ZoomableGroup
              zoom={zoom}
              center={center}
              onMoveEnd={({ coordinates, zoom }) => {
                setCenter(coordinates);
                setZoom(zoom);
              }}
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    let normName = normalizeName(geo.properties?.name);
                    if (NAME_ALIASES[normName]) {
                      normName = NAME_ALIASES[normName];
                    }
                    const life = currentLifeData[normName];
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={life !== undefined ? colorScale(life) : "#dcdcdc"}
                        stroke={
                          selectedCountry === geo.properties.name
                            ? "transparent"
                            : "#666"
                        }
                        strokeWidth={
                          selectedCountry === geo.properties.name ? 0 : 0.4
                        }
                        onMouseEnter={(e) => {
                          if (!mapRef.current) return;
                          const rect = mapRef.current.getBoundingClientRect();
                          setTooltip({
                            name: geo.properties.name,
                            life,
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                          });
                        }}
                        onMouseMove={(e) => {
                          if (!mapRef.current) return;
                          const rect = mapRef.current.getBoundingClientRect();
                          setTooltip((prev) =>
                            prev
                              ? {
                                ...prev,
                                x: e.clientX - rect.left,
                                y: e.clientY - rect.top,
                              }
                              : null
                          );
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={() => setSelectedCountry(geo.properties.name)}
                        className="cursor-pointer hover:opacity-90 transition no-outline"
                        style={{ outline: "none" }}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>

          {/* Color legend (overlay inside map, top-left) */}
          <div className="absolute top-3 left-3 z-30">
            <div className="px-4 py-2 bg-white/70 rounded-md shadow flex flex-col items-center gap-1">
              <div className="text-xs font-medium text-gray-700">
                World life expectancy scale ({selectedYear})
              </div>
              <div className="flex items-center gap-2 w-64">
                <span className="text-[10px] text-gray-600 min-w-[30px] text-left">
                  {colorStats.min.toFixed(0)}
                </span>
                <div className="relative flex-1 h-3 rounded-full overflow-hidden bg-gray-200">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: legendGradient,
                    }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-[2px] bg-gray-800/70"
                    style={{
                      left: `${((colorStats.mean - colorStats.min) / (colorStats.max - colorStats.min || 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-gray-600 min-w-[30px] text-right">
                  {colorStats.max.toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between w-64 text-[10px] text-gray-500 mt-0.5">
                <span>Lower</span>
                <span>Global avg {colorStats.mean.toFixed(1)}</span>
                <span>Higher</span>
              </div>
            </div>
          </div>

          {tooltip && (
            <div
              className="absolute text-sm px-3 py-1 rounded-xl pointer-events-none z-50 bg-white/85 backdrop-blur-md border border-white/60 shadow-md text-gray-900"
              style={{
                left: tooltip.x + 20,
                top: tooltip.y - 30,
                whiteSpace: "nowrap",
              }}
            >
              {tooltip.name}: {" "}
              {tooltip.life !== undefined ? `${tooltip.life.toFixed(2)} years` : "No data"}
            </div>
          )}

          {/* Zoom controls (overlay inside map, top-right) */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-30">
            <Button
              variant="contained"
              size="small"
              onClick={handleZoomIn}
              className="!rounded-full shadow"
            >
              <ZoomIn />
            </Button>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              onClick={handleZoomOut}
              className="!rounded-full shadow"
            >
              <ZoomOut />
            </Button>
            <Button
              variant="contained"
              color="inherit"
              size="small"
              onClick={handleReset}
              className="!rounded-full shadow"
            >
              <RestartAlt />
            </Button>
          </div>
        </div>

        {/* POP-OUT */}
        {selectedFeature && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/20 backdrop-blur-sm">
            <div className="relative bg-gradient-to-br from-white/95 via-white/80 to-white/65 backdrop-blur-md rounded-2xl shadow-2xl w-11/12 max-w-6xl flex gap-6 p-7 animate-popIn border border-white/40 text-black">
              <div className="flex-[2] flex items-center justify-center">
                <ComposableMap width={360} height={320} projection={popOutProjection}>
                  <Geographies
                    geography={{
                      type: "FeatureCollection",
                      features: [selectedFeature],
                    }}
                  >
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        let normName = normalizeName(geo.properties?.name);
                        if (NAME_ALIASES[normName]) {
                          normName = NAME_ALIASES[normName];
                        }
                        const life = currentLifeData[normName];
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={
                              life !== undefined ? colorScale(life) : "#dcdcdc"
                            }
                            stroke="#222"
                            strokeWidth={1}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ComposableMap>
              </div>

              <div className="flex-[1.9] flex flex-col">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold">{selectedCountry}</h3>
                  <button
                    onClick={() => setSelectedCountry(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-end gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>Range</span>
                    <Select
                      size="small"
                      value={chartRange}
                      onChange={(e) => setChartRange(e.target.value)}
                      variant="outlined"
                      sx={{ backgroundColor: "white", minWidth: 130, fontSize: 12 }}
                    >
                      <MenuItem value="all">All years</MenuItem>
                      <MenuItem value="before2000">Before 2000</MenuItem>
                      <MenuItem value="after2000">After 2000</MenuItem>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Chart</span>
                    <Select
                      size="small"
                      value={chartType}
                      onChange={(e) => setChartType(e.target.value)}
                      variant="outlined"
                      sx={{ backgroundColor: "white", minWidth: 110, fontSize: 12 }}
                    >
                      <MenuItem value="line">Line</MenuItem>
                      <MenuItem value="bar">Bar</MenuItem>
                    </Select>
                  </div>
                </div>
                <div className="mt-3 border border-dashed border-gray-200 rounded-lg h-80 flex items-center justify-end pr-2 text-gray-400">
                  {renderCountryChart()}
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  Tuổi thọ trung bình năm {selectedYear}:{" "}
                  <span className="font-medium">
                    {(() => {
                      let normName = normalizeName(
                        selectedFeature.properties?.name
                      );
                      if (NAME_ALIASES[normName]) {
                        normName = NAME_ALIASES[normName];
                      }
                      const life = currentLifeData[normName];
                      return life !== undefined ? `${life.toFixed(2)} years` : "N/A";
                    })()}
                  </span>
                </div>
                {indicatorDescription && (
                  <div className="mt-1 text-xs text-gray-500">
                    Indicator: {indicatorDescription}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <AdminPanel
        isOpen={adminPanelOpen}
        onClose={() => setAdminPanelOpen(false)}
        lifeSeriesByName={lifeSeriesByName}
        onDataUpdate={handleDataUpdate}
        YEARS={YEARS}
      />
    </div>
  );
}
