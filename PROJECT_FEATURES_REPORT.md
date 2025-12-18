# World Life Expectancy Project - Features Report

## Project Overview
**Project Name:** World Life Expectancy  
**Type:** Full-Stack Web Application  
**Primary Purpose:** Interactive visualization and analysis of global life expectancy data from 1960-2023  
**Technology Stack:** React (Frontend), Node.js/Express (Backend), D3.js (Data Visualization), Material-UI (Components)

---

## Core Features

### 1. **Interactive Global Map Visualization**
- **Interactive choropleth map** displaying world countries with color-coded life expectancy values
- **Color-coded countries** using a diverging scale (Red-Yellow-Green) where:
  - Red indicates lower life expectancy
  - Green indicates higher life expectancy
  - Yellow represents the global average
- **Year selector** to view life expectancy data for any year from 2000-2023
- **Color scale legend** showing minimum, mean, and maximum life expectancy values
- **Hover tooltips** displaying country name and exact life expectancy value when hovering over countries
- **Country selection** by clicking to view detailed information

### 2. **Map Navigation & Controls**
- **Zoom In button** to magnify the map (up to 20x zoom)
- **Zoom Out button** to reduce zoom level
- **Reset button** to return to original map position and zoom level
- **Pan functionality** using mouse drag on the map
- **Interactive zoom tracking** maintaining center coordinates during navigation

### 3. **Country Detail Popup (Pop-Out Panel)**
When a country is selected from the map:
- **Magnified country map** showing the selected country in detail
- **Country name** displayed prominently
- **Life expectancy value** for the selected year shown
- **Time-series chart** visualizing life expectancy trends (see Chart Features below)
- **Chart type selector** to switch between Line and Bar charts
- **Date range filter** with options:
  - All years (1960-2023)
  - Before 2000
  - After 2000
- **Close button** to dismiss the popup
- **Responsive layout** with country map and chart side-by-side

### 4. **Country Charts (Line & Bar)**
- **Line Chart:**
  - Smooth animated line showing life expectancy progression over time
  - Green color gradient based on life expectancy values
  - Small circular data points at each year
  - Axis labels for years and life expectancy values
  - Curved line interpolation for smooth visualization

- **Bar Chart:**
  - Vertical bars representing life expectancy for each year
  - Color-coded bars with green gradient
  - Animated rising effect when displayed
  - Ascending animation on chart load

### 5. **Compare Panel (Multi-Country Analysis)**
- **Country search functionality** with auto-complete suggestions
- **Multi-country selection** allowing comparison of up to multiple countries simultaneously
- **Dynamic line chart** displaying multiple countries' data with different colors
- **Year range slider** to filter data for specific time periods (adjustable min/max years)
- **Interactive hover** showing vertical year line and highlighted data points
- **Multiple chart types:**
  - **Line Chart:** Animated line drawing with staggered animation for smooth transitions
  - **Bar Chart:** Mean life expectancy comparison across selected countries
  - **Box Plot:** Statistical boxplot showing distribution (min, Q1, median, Q3, max)

- **Statistical analysis:**
  - Calculates mean, median, min, max, standard deviation
  - Quartiles (Q1, Q3)
  - Sample size (n)
  
- **Chart legend** identifying each country with color coding
- **Interactive animations** with d3.js transitions

### 6. **Admin Panel - Data Management**
**Authentication:**
- Password-protected admin access (default: "admin123")
- Login/Logout functionality

**Data Editing Features:**
- **Tabbed interface** organizing different admin functions
- **Data table** with full editing capabilities:
  - View all countries and years
  - Inline cell editing for life expectancy values
  - Search/filter countries
  - Pagination (10 years per view with navigation)
  - Delete country option with confirmation
  - Add new country functionality

**Data Operations:**
- **Undo/Redo functionality** with full history tracking
- **Export data** as CSV file with proper formatting
- **Import CSV** to load new datasets or updates
- **Save changes** to both localStorage and backend
- **Temporary dataset saving** to backend via API

**Data Persistence:**
- **localStorage** for client-side persistence across sessions
- **Backend API integration** to save edited datasets to server (global_life_expectancy.csv)

### 7. **Data Processing**
- **CSV parsing** using PapaParse library
- **Country name normalization:**
  - Accent removal (Vietnamese, French, etc.)
  - Special character handling
  - Case-insensitive matching
  
- **Country name aliasing** mapping different naming conventions:
  - Geographic name differences (e.g., "W. Sahara" → "Morocco")
  - Political entity changes (e.g., "South Korea" → "Korea, Rep.")
  - Regional variations (e.g., "Russia" → "Russian Federation")

### 8. **Data Sources Integration**
- **Life expectancy CSV** (global_life_expectancy.csv)
- **Country metadata** (Metadata_Country_API_SP.DYN.LE00.IN_DS2_en_csv_v2_130058.csv)
- **Indicator metadata** (Metadata_Indicator_API_SP.DYN.LE00.IN_DS2_en_csv_v2_130058.csv)
- **Topojson map data** (countries-110m.json) for geographic visualization

### 9. **UI/UX Features**
- **Modern gradient background** (sky-emerald theme)
- **Glass-morphism design** with frosted glass effect and backdrop blur
- **Responsive layout** adapting to different screen sizes
- **Material-UI components** for consistent design
- **Smooth animations and transitions**
- **Icon-based controls** (Material Icons)
- **Tailwind CSS styling** for utility-first design
- **Professional header** with gradient text

### 10. **Backend Services**
- **Express server** running on port 5000
- **Health check endpoint** (/health)
- **CSV save API** (/api/save-dataset) for persisting edited data
- **CORS enabled** for cross-origin requests
- **Error handling** with detailed error responses
- **JSON payload support** with 50MB size limit

### 11. **Data Visualization Technologies**
- **D3.js** for custom chart rendering and animations
- **d3-scale** for color scaling and data scaling
- **d3-scale-chromatic** for interpolation functions (Green gradients, Red-Yellow-Green diverging)
- **react-simple-maps** for map rendering
- **TopoJSON** for geographic data format
- **World-Atlas** for topographic data

---

## Additional Features & Capabilities

### Code Quality & Development
- **React Testing Library** for component testing
- **ESLint configuration** for code quality
- **Responsive component structure**
- **Modular component design** (App, AdminPanel, ComparePanel)

### Development Scripts
- `npm start` - Run development server
- `npm run server` - Run backend Express server
- `npm run dev` - Concurrent development (backend + frontend)
- `npm run build` - Production build
- `npm test` - Run tests
- `npm run deploy` - Deploy to GitHub Pages

### Browser Support
- Modern browsers (React 18.x support)
- SVG-based rendering (good performance)
- Responsive design for various screen sizes

---

## Data Range & Coverage
- **Time Period:** 1960-2023 (64 years of data)
- **Visualization Range:** 2000-2023 (24 years on color scale)
- **Global Coverage:** All world countries with available data
- **Data Indicator:** Life expectancy at birth (World Bank: SP.DYN.LE00.IN)

---

## Key Dependencies
| Package | Purpose |
|---------|---------|
| react | UI framework |
| d3 | Data visualization |
| react-simple-maps | Map component |
| @mui/material | UI components |
| papaparse | CSV parsing |
| topojson | Geographic data |
| tailwind | CSS framework |
| react-tooltip | Tooltip component |

---

## Summary
This is a **comprehensive geospatial data visualization application** for analyzing world life expectancy trends. It combines interactive mapping, multi-country comparison analytics, and admin data management capabilities in a modern, user-friendly interface. The application leverages advanced D3.js visualizations while providing powerful data editing and export features through its authentication-protected admin panel.

**User Experience Focus:** From casual explorers viewing country data to analysts comparing multiple nations and administrators managing datasets, this application serves multiple user personas with intuitive, animated, and responsive interfaces.
