# World Life Expectancy Project - Comprehensive Technical Report

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Frontend Architecture](#frontend-architecture)
4. [Map Rendering & Choropleth Visualization](#map-rendering--choropleth-visualization)
5. [Data Flow & Interaction Handling](#data-flow--interaction-handling)
6. [Component Pipelines](#component-pipelines)
7. [Backend Architecture](#backend-architecture)
8. [Data Management](#data-management)
9. [Performance & Optimizations](#performance--optimizations)

---

## Project Overview
**Project Name:** World Life Expectancy  
**Type:** Full-Stack Web Application  
**Primary Purpose:** Interactive visualization and analysis of global life expectancy data from 1960-2023  
**Technology Stack:** React 18.3.1 (Frontend), Node.js/Express (Backend), D3.js 7.9.0 (Data Visualization), Material-UI 7.3.4 (Components)
**Data Sources:** World Bank Life Expectancy Dataset, TopoJSON Geographic Data
**Deployment:** npm start (frontend), npm run server (backend), npm run dev (concurrent)

---

## Technology Stack

### Frontend Libraries
```json
{
  "core": {
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-scripts": "5.0.1"
  },
  "visualization": {
    "d3": "7.9.0",
    "d3-scale": "3.0.0",
    "d3-scale-chromatic": "3.1.0",
    "d3-zoom": "3.0.0",
    "d3-selection": "3.0.0",
    "react-simple-maps": "3.0.0",
    "topojson": "3.0.2",
    "world-atlas": "2.0.2"
  },
  "ui-components": {
    "@mui/material": "7.3.4",
    "@mui/icons-material": "7.3.4",
    "@emotion/react": "11.14.0",
    "@emotion/styled": "11.14.1"
  },
  "utilities": {
    "papaparse": "5.5.3",
    "react-tooltip": "5.30.0",
    "tailwind": "4.0.0"
  }
}
```

### Backend Stack
- **Runtime:** Node.js
- **Server:** Express.js
- **Port:** 5000
- **CORS:** Enabled
- **Data Format:** JSON, CSV

### Development Tools
- **Testing:** React Testing Library, Jest
- **Styling:** Tailwind CSS 4.0, Material-UI Theming
- **Linting:** ESLint
- **Deployment:** GitHub Pages

---

## Frontend Architecture

### Component Structure
```
App.js (Main Container)
├── Header (Title + Controls)
│   ├── Admin Button
│   ├── Compare Button
│   └── Year Selector (2000-2023)
├── Main Content Area
│   ├── ComposableMap (react-simple-maps)
│   │   ├── ZoomableGroup
│   │   │   └── Geographies (Countries)
│   │   ├── Zoom In/Out/Reset Controls
│   │   └── Color Legend
│   ├── Tooltip (Hover Info)
│   ├── Pop-Out Panel (Country Detail)
│   │   ├── Country Map (Magnified)
│   │   ├── Country Info
│   │   └── CountryChart (Line/Bar)
│   └── Admin Panel Dialog
│       ├── Login Screen
│       ├── Data Editor
│       ├── Import/Export
│       └── Undo/Redo
├── Compare Panel Dialog
│   ├── Country Search
│   ├── Chart Type Toggle
│   ├── Year Range Slider
│   └── Statistics Display
└── Footer (Optional)
```

### State Management
**App.js State Variables:**
```javascript
// Map & Display
- hoveredCountry: String (country name on hover)
- tooltip: Object { name, life, x, y } (hover tooltip position/data)
- selectedCountry: String (currently selected country)
- zoom: Number (current map zoom level 1-20)
- center: [Number, Number] (map center coordinates [lon, lat])
- selectedYear: Number (2000-2023, default: 2023)

// Data
- lifeSeriesByName: Object { countryName: { year: lifeExpectancy } }
- lifeByYearForMap: Object { year: { countryName: lifeExpectancy } }
- allCountries: Array (TopoJSON features)
- colorStats: Object { min, mean, max }

// UI Controls
- chartType: String ("line" | "bar")
- chartRange: String ("all" | "before2000" | "after2000")
- adminPanelOpen: Boolean
- compareOpen: Boolean

// Metadata
- indicatorDescription: String (World Bank indicator info)
```

### Component Lifecycle

**Initial Load:**
1. `useEffect[]` triggers data loading
2. Fetch 4 CSV/JSON files in parallel:
   - `countries-110m.json` (TopoJSON)
   - `global_life_expectancy.csv` (Life data)
   - Country metadata CSV
   - Indicator metadata CSV
3. Parse CSV with PapaParse
4. Normalize country names (remove accents, special chars)
5. Apply name aliases (geographic naming adjustments)
6. Check localStorage for previous edits
7. Set state with processed data
8. Build year-indexed lookup (lifeByYearForMap)

**User Interactions:**
- **Hover Country:** Update `hoveredCountry`, show `tooltip`
- **Click Country:** Set `selectedCountry`, open pop-out
- **Zoom/Pan:** Update `zoom` and `center` via `ZoomableGroup.onMoveEnd`
- **Change Year:** Update `selectedYear`, re-render color scale
- **Open Admin:** Toggle `adminPanelOpen`

---

## Map Rendering & Choropleth Visualization

### Choropleth Color Mapping

**Color Scale Type:** Diverging Scale (Red-Yellow-Green)
```javascript
scaleDiverging(interpolateRdYlGn)
  .domain([min, mean, max])
```

**Color Scheme:**
- **Red (Low):** Life expectancy below mean
- **Yellow (Medium):** Around global mean
- **Green (High):** Above mean life expectancy

**Calculation Process:**
1. Get all life expectancy values for selected year
2. Calculate: min, max, mean
3. Create diverging scale with these 3 points
4. Map each country's value to color: `colorScale(lifeExpectancy)`

**Legend Gradient Generation:**
```javascript
// Generate 9-step gradient gradient from min to max
steps = Array.from({ length: 9 }, (_, i) => {
  const t = i / 8
  const value = min + t * (max - min)
  return colorScale(value)  // Get color for this value
})
// Build CSS: linear-gradient(to right, color1, color2, ...)
```

### Map Rendering Pipeline

**React Simple Maps Flow:**
```
App.js
  ↓
ComposableMap (projection: Mercator, scale: 190)
  ↓
ZoomableGroup (zoom={zoom}, center={center})
  ↓
Geographies (fetch from GEO_URL)
  ↓
Geography (loop through features)
  ├── Normalize country name
  ├── Apply name aliases
  ├── Look up life expectancy: currentLifeData[normName]
  ├── Get fill color: colorScale(life) or #dcdcdc (no data)
  ├── Determine stroke based on state:
  │   ├── selected → "transparent"
  │   ├── hovered → "#000"
  │   └── default → "#666"
  └── Attach event handlers:
      ├── onMouseEnter → update hover state, show tooltip
      ├── onMouseMove → update tooltip position
      ├── onMouseLeave → clear hover
      └── onClick → select country, open pop-out
```

### Country Name Normalization

**Normalization Steps:**
```javascript
function normalizeName(name) {
  return name
    .toLowerCase()                              // lowercase
    .normalize("NFD")                           // Unicode decompose
    .replace(/[\u0300-\u036f]/g, "")           // remove accents
    .replace(/[\s,.'()\-"]/g, "")              // remove special chars
}
```

**Example Aliases (35+ mapped):**
```
"W. Sahara" → "Morocco"
"Taiwan" → "China"
"South Korea" → "Korea, Rep."
"North Korea" → "Korea, Dem. People's Rep."
"Russia" → "Russian Federation"
"Dem. Rep. Congo" → "Congo, Dem. Rep."
"Laos" → "Lao PDR"
"Iran" → "Iran, Islamic Rep."
[... 27 more ...]
```

### Pop-Out Country Detail Map

**Projection for Pop-Out:**
```javascript
const popOutProjection = (width, height, feature) => {
  // Calculate bounds of selected feature
  const bounds = geoMercator().fitExtent(
    [[10, 10], [width - 10, height - 10]], 
    feature
  ).fitSize([width, height], feature)
  
  return bounds  // Auto-centered & zoomed to country
}
```

**Rendering:**
- Creates separate `ComposableMap` with only selected feature
- Uses calculated projection to fill available space
- Maintains aspect ratio and centering

---

## Data Flow & Interaction Handling

### Data Loading Flow

```
Parallel Fetches (Promise.all)
    ↓
├─ countries-110m.json → topojson.feature() → allCountries array
├─ global_life_expectancy.csv → PapaParse → raw life data
├─ Country metadata CSV → PapaParse → countryNameToCode mapping
└─ Indicator metadata CSV → PapaParse → indicator description

Check localStorage for previous edits
    ↓
If exists: Use localStorage data (restored edits)
If not: Use fetched CSV data

Process life data:
    ├─ Normalize country names
    ├─ Filter by year range (1960-2023)
    ├─ Store as { countryName: { year: value } }
    └─ Index by year: { year: { countryName: value } }

setLifeSeriesByName() → Main state
setLifeByYearForMap() → Year-indexed lookup for color mapping
```

### Map Interaction Handlers

**OnMouseEnter (Hover):**
```javascript
1. Normalize geo country name
2. Apply aliases if needed
3. Look up life expectancy: currentLifeData[normName]
4. Update hoveredCountry state
5. Create tooltip: { name, life, x, y }
6. Change stroke to black
7. Show tooltip near cursor
```

**OnMouseMove (Tooltip Following):**
```javascript
1. Get current mouse position relative to map
2. Update tooltip x/y coordinates
3. Tooltip follows cursor
```

**OnMouseLeave (Unhover):**
```javascript
1. Clear hoveredCountry state
2. Reset stroke to default (#666)
3. Hide tooltip
```

**onClick (Select Country):**
```javascript
1. Set selectedCountry to clicked country name
2. Find matching TopoJSON feature
3. Open pop-out modal
4. Render magnified country map
5. Fetch country time series data
6. Render default chart (line chart, selected year range)
```

### Year Selector Changes

```javascript
onChange: (e) => setSelectedYear(e.target.value)
    ↓
useMemo colorScale recalculates:
    ├─ Get values from lifeByYearForMap[selectedYear]
    ├─ Recalculate min, mean, max
    ├─ Rebuild diverging color scale
    └─ Update colorStats

Geographies re-render with new colors:
    └─ Each country lookup in lifeByYearForMap[newYear]
       and applies new color from colorScale
```

### Pop-Out Panel Interaction

**Chart Type Toggle:**
```
Line → renders animated line chart with points
Bar → renders animated bar chart with gradient colors
```

**Chart Range Filter:**
```
All years → 1960-2023
Before 2000 → 1960-1999
After 2000 → 2000-2023

Filters dataPoints array before rendering
```

---

## Component Pipelines

### Admin Panel Pipeline

**Component:** `AdminPanel.js`

**State Management:**
```javascript
- isAuthenticated: Boolean (login state)
- password: String (input)
- editingData: Object (working copy of data)
- history: Array (undo/redo stack)
- historyIndex: Number (current position in history)
- tabValue: Number (active tab: 0=data, 1=import/export, 2=...?)
- message: Object { text, type } (toast notifications)
- searchTerm: String (filter countries)
- yearStartIndex: Number (pagination)
```

**Authentication Flow:**
```
1. Panel opens → Show login screen
2. User enters password
3. If password === "admin123":
   ├─ Set isAuthenticated = true
   ├─ Load lifeSeriesByName into editingData
   ├─ Initialize history stack
   └─ Show admin interface
4. If wrong password:
   └─ Show error message
```

**Data Editing Flow:**
```
User clicks cell to edit:
    ↓
1. setEditingCell({ country, year })
2. Show inline text input
3. User types new value
4. On save:
   ├─ Validate number
   ├─ Update editingData
   ├─ Add new state to history
   ├─ Increment historyIndex
   ├─ Save to localStorage
   └─ Show "Saved" message
```

**Undo/Redo Implementation:**
```javascript
// History stored as: [state0, state1, state2, state3]
//                                    ↑ historyIndex = 2

Undo:
  historyIndex--
  Load history[historyIndex]
  Save to localStorage

Redo:
  historyIndex++
  Load history[historyIndex]
  Save to localStorage
```

**Data Operations:**

**Export CSV:**
```
Button click → convertToCSV(editingData)
    ↓
1. Build CSV headers: ["Country Name", "1960", "1961", ..., "2023"]
2. Loop countries:
   ├─ Add row: ["country", val1960, val1961, ..., val2023]
   └─ Quote country name for special chars
3. Join rows with newlines
4. Create Blob
5. Trigger browser download
```

**Import CSV:**
```
File selected → PapaParse.parse(file)
    ↓
1. Parse CSV with headers
2. Loop rows:
   ├─ Extract country name
   ├─ Parse all year columns to numbers
   ├─ Create { year: value } object
   └─ Store in newData[country]
3. Add to history
4. Replace editingData
5. Save to localStorage
```

**Save Changes to App:**
```
"Save Changes" button:
    ↓
onDataUpdate(editingData)
    ↓
App.js receives new data:
    ├─ Update lifeSeriesByName state
    ├─ Rebuild lifeByYearForMap
    ├─ Trigger map re-render
    ├─ Update all charts
    └─ Close AdminPanel

"Save to Backend" button:
    ↓
POST /api/save-dataset with editingData
    ↓
Server converts to CSV and saves to:
    /public/global_life_expectancy.csv
    ↓
Next app reload uses new data
```

### Compare Panel Pipeline

**Component:** `ComparePanel.js`

**State Management:**
```javascript
- open: Boolean (dialog open)
- input: String (search input)
- selected: Array<String> (selected country keys)
- chartType: String ("line" | "bar" | "boxplot")
- yearRange: [Number, Number] (min/max years)
- animTimersRef: Ref<Array> (animation timers)
- svgRef, barSvgRef, boxSvgRef: Refs (chart DOM nodes)
```

**Country Selection Flow:**
```
User types in search box:
    ↓
input state updated
    ↓
useMemo suggestions:
  1. Normalize search query
  2. Filter allKeys where key includes normalized query
  3. Return top 30 matches
    ↓
Show dropdown suggestions

User clicks suggestion:
    ↓
1. Normalize selected text
2. Find exact or close match in allKeys
3. Check if already selected (no duplicates)
4. Add to selected array
5. Clear input
6. Trigger chart re-render
```

**Year Range Filtering:**
```
Slider moved:
    ↓
setYearRange([min, max])
    ↓
useMemo yearsInRange:
  return YEARS.filter(y => y >= min && y <= max)
    ↓
Re-render charts with filtered data
```

**Line Chart Rendering (D3):**
```javascript
For each selected country:
  ├─ Extract values for yearsInRange
  ├─ Calculate x/y scales
  ├─ Generate line path: d3.line()
  ├─ Animate stroke-dasharray for drawing effect
  └─ Draw small circles at data points

Hover interaction:
  ├─ Show vertical line at year
  ├─ Highlight all data points at that year
  ├─ Display tooltip with year and all country values
```

**Bar Chart Rendering:**
```javascript
For each country:
  ├─ Calculate mean of values in year range
  └─ Sort by mean

Render bars:
  ├─ X-axis: country names
  ├─ Y-axis: mean life expectancy
  ├─ Height: proportional to mean
  ├─ Animated rise effect
  └─ Color: category color
```

**Box Plot Rendering:**
```javascript
For each country in yearRange:
  ├─ Calculate statistics:
  │  ├─ min, q1, median, q3, max
  │  ├─ mean, standard deviation
  │  └─ sample size (n)
  ├─ Scale to chart dimensions
  └─ Draw:
     ├─ Rectangle: Q1 to Q3 (box)
     ├─ Line: min to max (whiskers)
     ├─ Line: median (inside box)
     └─ Points: outliers (optional)
```

**Statistical Calculations:**
```javascript
function statsFromArray(arr) {
  1. Filter valid numbers, sort
  2. Calculate:
     - n (count)
     - sum
     - mean = sum / n
     - median = middle value (or avg of 2 middle)
     - min, max
     - sd = sqrt(sum((v-mean)²) / n)
     - q1 = 25th percentile
     - q3 = 75th percentile
  3. Return { n, mean, median, min, max, sd, q1, q3 }
}
```

### Country Chart Component

**Component:** `CountryChart` (Reusable, in App.js)

**Props:**
```javascript
{
  type: "line" | "bar",           // Chart type
  dataPoints: Array<{year, value}>, // Data to plot
  width: 520,                      // SVG width
  height: 290,                     // SVG height
  padding: 36                      // Axis padding
}
```

**Line Chart Flow:**
```
1. Create linear scales for x (years) and y (values)
2. Generate line path: d3.line().x().y().curve()
3. Animate path with stroke-dasharray effect:
   ├─ Get total path length
   ├─ Set dasharray = dashoffset = length (invisible)
   └─ Transition to dashoffset = 0 (reveals line)
4. Draw small circles at each data point
5. Add axes (x and y)
6. Add hover overlay:
   ├─ Show vertical line at cursor year
   ├─ Highlight circle at intersection
   └─ Display tooltip (year: value)
```

**Bar Chart Flow:**
```
1. Create scales for x (bar positions) and y (values)
2. For each dataPoint:
   ├─ Position bar at x
   ├─ Color by value (green gradient)
   ├─ Start height at 0
   ├─ Animate to full height over 600ms
   └─ Add label
3. Add axes
```

---

## Backend Architecture

### Server Structure

**File:** `server.js`

**Configuration:**
```javascript
const express = require("express")
const fs = require("fs")
const path = require("path")
const cors = require("cors")

const app = express()
const PORT = 5000

app.use(cors())
app.use(express.json({ limit: "50mb" }))
```

**Endpoints:**

**1. Health Check**
```
GET /health
Response: { ok: true, time: ISO_DATETIME }
Purpose: Verify server is running
```

**2. Save Dataset API**
```
POST /api/save-dataset
Body: {
  data: { countryName: { year: value } },
  YEARS: [1960, 1961, ..., 2023]
}

Process:
  1. Validate data and YEARS exist
  2. Build CSV headers: "Country Name", ...YEARS
  3. Loop countries:
     ├─ Quote country name
     ├─ Map years to values
     └─ Build CSV row
  4. Join all rows with newline
  5. Write to: /public/global_life_expectancy.csv
  6. Return success message

Response:
  Success: { success: true, message: "..." }
  Error: { error: "...", details: "..." }
```

**Error Handling:**
```javascript
- Missing data/YEARS → 400 Bad Request
- File write error → 500 Server Error
- All errors logged to console
```

---

## Data Management

### Data Persistence Strategy

**Three-Layer Approach:**

**Layer 1: Initial Load (Immutable)**
```
public/global_life_expectancy.csv
  ↓
(PapaParse in browser)
  ↓
lifeSeriesByName state
```

**Layer 2: Session-Based (localStorage)**
```
User edits in AdminPanel
  ↓
Save to localStorage: "lifeExpectancyEdits"
  ↓
Survives page refresh
  ↓
Next load checks localStorage first
```

**Layer 3: Persistent Backend**
```
User clicks "Save to Backend"
  ↓
POST /api/save-dataset to Node server
  ↓
Server writes to /public/global_life_expectancy.csv
  ↓
Permanently replaces original file
  ↓
Next app load uses new file
```

### Data File Format

**CSV Structure:**
```
Country Name,1960,1961,1962,...,2023
United States,68.75,69.05,69.35,...,76.4
China,36.3,37.0,37.8,...,77.8
India,32.3,32.8,33.3,...,71.9
...
```

**In-Memory Structure:**
```javascript
{
  "united states": {
    1960: 68.75,
    1961: 69.05,
    ...
    2023: 76.4
  },
  "china": {
    1960: 36.3,
    ...
  },
  ...
}
```

**Year-Indexed Lookup:**
```javascript
{
  1960: {
    "united states": 68.75,
    "china": 36.3,
    ...
  },
  1961: {
    "united states": 69.05,
    "china": 37.0,
    ...
  },
  ...
}
```

### Data Sources

**Source Files in `/public`:**
```
1. global_life_expectancy.csv
   - Life expectancy data 1960-2023
   - World Bank indicator: SP.DYN.LE00.IN
   - ~190 countries

2. Metadata_Country_API_SP.DYN.LE00.IN_DS2_en_csv_v2_130058.csv
   - Country metadata
   - Country codes and names
   - Region information

3. Metadata_Indicator_API_SP.DYN.LE00.IN_DS2_en_csv_v2_130058.csv
   - Indicator metadata
   - Definition and description
   - Data source information

4. countries-110m.json
   - TopoJSON format geographic data
   - Simplied world map geometry
   - Used by react-simple-maps for rendering
```

---

## Performance & Optimizations

### Data Optimizations

**1. CSV Parsing Efficiency:**
```javascript
// PapaParse with options
Papa.parse(data, {
  header: true,           // Auto-map to object keys
  skipEmptyLines: true    // Ignore blank rows
})
```

**2. Name Normalization Caching:**
```javascript
// Pre-computed normalizations stored in app state
// Aliases mapping created once on load
// Used for O(1) lookups during rendering
```

**3. Year-Indexed Lookup:**
```javascript
// Instead of searching through all countries for each year,
// data indexed by year for O(1) access during choropleth rendering
lifeByYearForMap[selectedYear][countryName]
```

### Rendering Optimizations

**1. useMemo for Expensive Calculations:**
```javascript
const colorScale = useMemo(() => {
  // Recalculate only when lifeByYearForMap or selectedYear changes
  return scaleDiverging(...).domain([min, mean, max])
}, [lifeByYearForMap, selectedYear])

const selectedFeature = useMemo(() => {
  // Only re-find feature when selectedCountry changes
  return allCountries.find(...)
}, [selectedCountry, allCountries])
```

**2. D3 Transition Debouncing:**
```javascript
// Prevent re-rendering during rapid interactions
const drawTimer = setTimeout(() => {
  // Heavy D3 drawing operations
}, 100)
```

**3. SVG-Based Rendering:**
```javascript
// SVG renders faster than canvas for geographic data
// Vector graphics scale perfectly
// React Simple Maps optimizes geometry rendering
```

### Animation Optimizations

**1. Stroke Dash Animation:**
```javascript
// CSS-based animation (GPU accelerated)
path.attr("stroke-dasharray", total)
     .attr("stroke-dashoffset", total)
     .transition()
     .duration(450)
     .attr("stroke-dashoffset", 0)
```

**2. Selective Animation:**
```javascript
// Only animate line charts, not bar charts on every update
// Use transform translate for zoom (no re-render)
```

**3. Cleanup Animation Timers:**
```javascript
// Clear previous timers before new animations
animTimersRef.current.forEach(t => clearTimeout(t))
animTimersRef.current = []
```

### Memory Considerations

**1. State Structure:**
```javascript
// Flat object, not deeply nested
// Avoids unnecessary re-renders of child components

// Good ✓
{ "united states": { 1960: 68.75, ... } }

// Avoid ✗
{ years: { 1960: { countries: { "us": 68.75 } } } }
```

**2. D3 Selection Cleanup:**
```javascript
// Remove old selections before drawing new ones
svg.selectAll("*").remove()

// Prevents memory leaks from DOM accumulation
```

**3. Event Listener Cleanup:**
```javascript
// Remove hover overlays on unmount
overlay.on("mouseleave", () => {
  vline.style("opacity", 0)
  hoverGroup.selectAll("*").remove()
})
```

### Scalability

**Current Limitations:**
- ~190 countries supported (manageable)
- 64 years of data (1960-2023)
- All data loaded into memory

**Potential Improvements:**
- Lazy-load data by region
- Implement data windowing for time series
- Use Web Workers for CSV parsing
- Implement virtual scrolling in admin panel
- Cache computed color scales

---

## User Workflows

### Workflow 1: Quick Data Exploration
```
1. Open application
2. See current year choropleth (default: 2023)
3. Hover over countries to see life expectancy
4. Change year with selector
5. Watch colors update
6. Click a country to see trend chart
7. Close pop-out
```

### Workflow 2: Multi-Country Comparison
```
1. Click "Compare" button
2. Search and select first country
3. Search and select second country
4. Charts appear showing both lines
5. Adjust year range slider
6. Switch between Line/Bar/Box plot charts
7. Hover to see detailed values
8. Close panel
```

### Workflow 3: Data Administration
```
1. Click "Admin" button
2. Enter password: "admin123"
3. Navigate to Data Editor tab
4. Find country and click cell
5. Edit life expectancy value
6. Undo/Redo previous changes
7. Add new country
8. Export current data as CSV
9. Import updated CSV file
10. Save changes to app
11. Save to backend (optional, requires server)
12. Logout
```

---

## Summary

This is a **comprehensive geospatial data visualization application** with three primary components:

1. **Map Visualization:** Interactive choropleth with diverging color scale, zoom/pan, country details
2. **Comparison Analytics:** Multi-country analysis with statistical visualizations
3. **Data Management:** Password-protected admin panel with full CRUD operations

The application emphasizes:
- **User Experience:** Smooth animations, responsive design, intuitive interactions
- **Data Accuracy:** Name normalization, alias mapping, careful data processing
- **Performance:** Efficient data structures, memoized calculations, optimized rendering
- **Flexibility:** Full data editing, import/export, undo/redo, multiple visualizations

**Technical Highlights:**
- Modern React 18.3 with functional components and hooks
- Advanced D3.js visualizations with smooth transitions
- Real-time data synchronization across components
- Full-stack persistence (localStorage + backend API)
- Professional Material-UI components with Tailwind styling
