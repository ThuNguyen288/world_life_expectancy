import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Dialog,
  TextField,
  IconButton,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Slider,
  Chip,
  Box,
  Typography,
  Select,
  MenuItem,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Papa from "papaparse";
import * as d3 from "d3";

function displayNameFromKey(k) {
  if (!k) return "";
  // try to make readable: replace non-alpha with space and title-case
  return k
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

function statsFromArray(arr) {
  const values = arr.filter((v) => v != null && !Number.isNaN(v)).sort((a, b) => a - b);
  if (values.length === 0) return null;
  const n = values.length;
  const sum = values.reduce((s, v) => s + v, 0);
  const mean = sum / n;
  const median = n % 2 === 1 ? values[(n - 1) / 2] : (values[n / 2 - 1] + values[n / 2]) / 2;
  const min = values[0];
  const max = values[values.length - 1];
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  const q1 = d3.quantile(values, 0.25);
  const q3 = d3.quantile(values, 0.75);
  return { n, mean, median, min, max, sd, q1, q3 };
}

export default function ComparePanel({ open, onClose, lifeSeriesByName, YEARS }) {
  const allKeys = useMemo(() => Object.keys(lifeSeriesByName || {}), [lifeSeriesByName]);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState([]);
  const [chartType, setChartType] = useState("line");
  const [yearRange, setYearRange] = useState([YEARS[0], YEARS[YEARS.length - 1]]);
  const svgRef = useRef();
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  useEffect(() => {
    if (!open) {
      setInput("");
      setSelected([]);
    }
  }, [open]);

  const suggestions = useMemo(() => {
    const q = (input || "").trim().toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
    if (!q) return allKeys.slice(0, 30);
    return allKeys.filter((k) => k.includes(q)).slice(0, 30);
  }, [input, allKeys]);

  const addCountry = (text) => {
    if (!text) return;
    const norm = text.trim().toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
    // try to find exact key or close match
    const exact = allKeys.find((k) => k === norm) || allKeys.find((k) => k.includes(norm));
    if (!exact) return;
    if (selected.includes(exact)) return;
    setSelected((s) => [...s, exact]);
    setInput("");
  };

  const removeCountry = (k) => setSelected((s) => s.filter((x) => x !== k));

  const yearsInRange = useMemo(() => YEARS.filter((y) => y >= yearRange[0] && y <= yearRange[1]), [YEARS, yearRange]);

  // draw charts (line) with d3 transitions for smooth updates
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const width = 800;
    const height = 340;
    svg.attr("viewBox", `0 0 ${width} ${height}`).style("width", "100%");

    if (selected.length === 0) return;

    const dataPerCountry = selected.map((k) => ({ key: k, values: yearsInRange.map((y) => ({ year: y, value: lifeSeriesByName[k]?.[y] ?? null })) }));

    const allValues = dataPerCountry.flatMap((c) => c.values.map((v) => v.value).filter((x) => x != null));
    if (allValues.length === 0) return;

    const x = d3.scaleLinear().domain([yearRange[0], yearRange[1]]).range([50, width - 20]);
    const y = d3.scaleLinear().domain([d3.min(allValues) - 1, d3.max(allValues) + 1]).range([height - 40, 20]);

    const xAxis = d3.axisBottom(x).ticks(Math.min(8, yearsInRange.length)).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft(y).ticks(6);

    svg.append("g").attr("transform", `translate(0,${height - 40})`).call(xAxis);
    svg.append("g").attr("transform", `translate(50,0)`).call(yAxis);

    const lineGen = d3.line().defined((d) => d.value != null).x((d) => x(d.year)).y((d) => y(d.value)).curve(d3.curveMonotoneX);

    const countries = svg.selectAll(".country").data(dataPerCountry, (d) => d.key);

    const enter = countries.enter().append("g").attr("class", "country");

    enter.append("path").attr("class", "line").attr("fill", "none").attr("stroke-width", 2).attr("stroke", (d, i) => color(i)).attr("stroke-linejoin", "round").attr("stroke-linecap", "round");

    // bind and draw with a drawing animation
    const lines = svg.selectAll(".line").data(dataPerCountry, (d) => d.key);
    lines.join(
      (enterSel) => enterSel
        .attr("stroke", (d, i) => color(i))
        .attr("d", (d) => lineGen(d.values))
        .each(function () {
          const path = d3.select(this);
          const total = this.getTotalLength ? this.getTotalLength() : 0;
          path.attr("stroke-dasharray", total + " " + total).attr("stroke-dashoffset", total).transition().duration(900).attr("stroke-dashoffset", 0);
        }),
      (updateSel) => updateSel.transition().duration(700).attr("d", (d) => lineGen(d.values)).attr("stroke", (d, i) => color(i)),
      (exitSel) => exitSel.transition().duration(400).style("opacity", 0).remove()
    );

    // circles for every defined data point (small, subtle)
    dataPerCountry.forEach((c, ci) => {
      const g = svg.append("g").attr("class", `dots-${ci}`);
      g.selectAll("circle").data(c.values.filter((v) => v.value != null)).enter().append("circle")
        .attr("cx", (d) => x(d.year))
        .attr("cy", (d) => y(d.value))
        .attr("r", 2.5)
        .attr("fill", color(ci))
        .attr("opacity", 0.7)
        .attr("data-key", c.key);
    });

    // overlay for hover to show vertical year line and highlight points
    const overlay = svg.append("rect").attr("x", 50).attr("y", 20).attr("width", width - 70).attr("height", height - 60).attr("fill", "transparent");
    const vline = svg.append("line").attr("stroke", "#555").attr("stroke-dasharray", "4 3").attr("y1", 20).attr("y2", height - 40).style("opacity", 0);
    const hoverGroup = svg.append("g").attr("class", "hover-group");

    overlay.on("mousemove", function (event) {
      const [mx] = d3.pointer(event, this);
      const year = Math.round(x.invert(mx + 50));
      if (year < yearRange[0] || year > yearRange[1]) return;
      const xx = x(year);
      vline.attr("x1", xx).attr("x2", xx).style("opacity", 1);
      // highlight dots at this year
      hoverGroup.selectAll("circle").remove();
      dataPerCountry.forEach((c, ci) => {
        const pt = c.values.find((v) => v.year === year && v.value != null);
        if (pt) {
          hoverGroup.append("circle").attr("cx", x(pt.year)).attr("cy", y(pt.value)).attr("r", 5).attr("fill", color(ci)).attr("stroke", "#fff").attr("stroke-width", 1.2);
        }
      });
    }).on("mouseleave", () => {
      vline.style("opacity", 0);
      hoverGroup.selectAll("*").remove();
    });

    // legend
    const legend = svg.append("g").attr("transform", `translate(${width - 220},20)`);
    dataPerCountry.forEach((c, i) => {
      const g = legend.append("g").attr("transform", `translate(0,${i * 22})`);
      g.append("rect").attr("width", 14).attr("height", 12).attr("fill", color(i));
      g.append("text").attr("x", 20).attr("y", 10).text(displayNameFromKey(c.key)).attr("font-size", 12);
    });

  }, [selected, yearRange, lifeSeriesByName]);

  // Bar chart and boxplot data
  const barData = useMemo(() => {
    return selected.map((k) => {
      const vals = yearsInRange.map((y) => lifeSeriesByName[k]?.[y]).filter((v) => v != null);
      return { key: k, mean: vals.length ? d3.mean(vals) : null, values: vals };
    });
  }, [selected, yearsInRange, lifeSeriesByName]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <Box sx={{ display: "flex", p: 2, alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6">Compare countries</Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>
      <Box sx={{ p: 2, display: "flex", gap: 2, alignItems: "center" }}>
            <Box sx={{ position: 'relative', flex: 1 }}>
            <TextField
          placeholder="Type country and press Enter"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { addCountry(e.target.value); } }}
          size="small"
          sx={{ flex: 1 }}
          helperText="Press Enter to append to selection"
        />
            {input.trim() !== "" && suggestions.length > 0 && (
              <Box sx={{ position: 'absolute', left: 0, right: 0, top: '58px', bgcolor: 'background.paper', border: '1px solid #eee', maxHeight: 220, overflow: 'auto', zIndex: 80 }}>
                {suggestions.map((s) => (
                  <Box key={s} sx={{ p: 1, cursor: 'pointer', '&:hover': { backgroundColor: '#f5f5f5' } }} onClick={() => addCountry(s)}>
                    {displayNameFromKey(s)}
                  </Box>
                ))}
              </Box>
            )}
            </Box>
        <Select value={chartType} size="small" onChange={(e) => setChartType(e.target.value)}>
          <MenuItem value="line">Line</MenuItem>
          <MenuItem value="bar">Bar (avg)</MenuItem>
          <MenuItem value="box">Boxplot</MenuItem>
        </Select>
        <Button variant="outlined" onClick={() => { setSelected([]); setInput(""); }}>Clear</Button>
      </Box>

      <Box sx={{ p: 2 }}>
        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          {selected.map((k) => (
            <Chip key={k} label={displayNameFromKey(k)} onDelete={() => removeCountry(k)} color="primary" />
          ))}
        </Box>

        <Box sx={{ display: "flex", gap: 4, alignItems: "center" }}>
          <Box sx={{ width: 420 }}>
            <Typography variant="caption">Year range</Typography>
            <Slider min={YEARS[0]} max={YEARS[YEARS.length - 1]} value={yearRange} onChange={(e, v) => setYearRange(v)} valueLabelDisplay="auto"/>
          </Box>
          <Box sx={{ flex: 1 }}>
            {chartType === "line" && (
              <svg ref={svgRef} style={{ width: "100%", height: 360, border: "1px solid #eee", borderRadius: 8 }} />
            )}
            {chartType === "bar" && (
              <Box>
                <svg viewBox="0 0 800 340" style={{ width: "100%", height: 360, border: "1px solid #eee", borderRadius: 8 }}>
                  {/* simple bars with y-axis ticks */}
                  {barData.length > 0 && (() => {
                    const w = 760; const h = 300; const left = 40; const top = 20;
                    const means = barData.map((d) => d.mean ?? 0);
                    const yMin = d3.min(means) - 1;
                    const yMax = d3.max(means) + 1;
                    const x = d3.scaleBand().domain(barData.map(d=>d.key)).range([left, left + w]).padding(0.2);
                    const y = d3.scaleLinear().domain([yMin, yMax]).range([top + h, top]);
                    const ticks = 5;
                    const yTicks = Array.from({length: ticks+1}, (_,i) => yMin + i*(yMax-yMin)/ticks);

                    return (
                      <g>
                        {/* y grid & labels */}
                        {yTicks.map((t, idx) => (
                          <g key={idx}>
                            <line x1={left} x2={left + w} y1={y(t)} y2={y(t)} stroke="#f3f4f6" />
                            <text x={left-8} y={y(t)+4} textAnchor="end" fontSize={11} fill="#333">{t.toFixed(1)}</text>
                          </g>
                        ))}
                        {/* bars */}
                        {barData.map((d,i)=>{
                          const bx = x(d.key); const bw = x.bandwidth(); const by = y(d.mean ?? 0); const bh = top + h - by;
                          return <rect key={d.key} x={bx} y={by} width={bw} height={bh} fill={d3.schemeCategory10[i % 10]} />
                        })}
                        {/* x labels */}
                        {barData.map((d,i)=>{
                          const bx = x(d.key); const bw = x.bandwidth();
                          return <text key={d.key+"-lbl"} x={bx + bw/2} y={top + h + 18} textAnchor="middle" fontSize={11}>{displayNameFromKey(d.key)}</text>
                        })}
                      </g>
                    )
                  })()}
                </svg>
              </Box>
            )}
            {chartType === "box" && (
              <Box>
                <svg viewBox="0 0 900 360" style={{ width: "100%", height: 360, border: "1px solid #eee", borderRadius: 8 }}>
                  {(() => {
                    const allVals = barData.flatMap((d) => d.values);
                    if (!allVals.length) return null;
                    const vMin = d3.min(allVals); const vMax = d3.max(allVals);
                    const scaleY = d3.scaleLinear().domain([vMin, vMax]).range([280, 40]);
                    const ticks = 6;
                    const yTicks = Array.from({length: ticks+1}, (_,i)=> vMin + i*(vMax-vMin)/ticks);
                    return (
                      <g>
                        {/* y grid & labels */}
                        {yTicks.map((t, idx) => (
                          <g key={idx}>
                            <line x1={40} x2={860} y1={scaleY(t)} y2={scaleY(t)} stroke="#f3f4f6" />
                            <text x={34} y={scaleY(t)+4} textAnchor="end" fontSize={11} fill="#333">{t.toFixed(1)}</text>
                          </g>
                        ))}
                        {barData.map((d, i) => {
                          const vals = d.values.slice().sort((a,b)=>a-b);
                          if (!vals.length) return null;
                          const left = 60 + i * 120;
                          const q1 = d3.quantile(vals, 0.25); const median = d3.quantile(vals, 0.5); const q3 = d3.quantile(vals, 0.75);
                          return (
                            <g key={d.key}>
                              <line x1={left+40} x2={left+40} y1={scaleY(d3.min(vals))} y2={scaleY(d3.max(vals))} stroke="#333" />
                              <rect x={left+10} y={scaleY(q3)} width={60} height={Math.max(2, scaleY(q1)-scaleY(q3))} fill={d3.schemeCategory10[i%10]} opacity={0.6} />
                              <line x1={left+10} x2={left+70} y1={scaleY(median)} y2={scaleY(median)} stroke="#111" strokeWidth={2} />
                              <text x={left+40} y={300} textAnchor="middle" fontSize={12}>{displayNameFromKey(d.key)}</text>
                            </g>
                          )
                        })}
                      </g>
                    )
                  })()}
                </svg>
              </Box>
            )}
          </Box>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Statistical summary (selected range)</Typography>
          <Box sx={{ display: "flex", gap: 2, mt: 1, flexWrap: "wrap" }}>
            {selected.length === 0 && <Typography color="text.secondary">No countries selected</Typography>}
            {selected.map((k) => {
              const arr = YEARS.filter((y)=> y>=yearRange[0] && y<=yearRange[1]).map((y)=> lifeSeriesByName[k]?.[y]).filter(v=>v!=null);
              const s = statsFromArray(arr);
              if (!s) return <Box key={k} sx={{ p:1, border: '1px solid #eee', borderRadius:1, minWidth:180 }}><Typography>{displayNameFromKey(k)}</Typography><Typography variant="caption">No data</Typography></Box>;
              return (
                <Box key={k} sx={{ p:1, border: '1px solid #eee', borderRadius:1, minWidth:180 }}>
                  <Typography sx={{ fontWeight:600 }}>{displayNameFromKey(k)}</Typography>
                  <Typography variant="caption">n={s.n} mean={s.mean.toFixed(2)} median={s.median.toFixed(2)} sd={s.sd.toFixed(2)}</Typography>
                  <Typography variant="caption">min={s.min.toFixed(2)} max={s.max.toFixed(2)}</Typography>
                </Box>
              )
            })}
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}
