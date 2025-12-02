import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from "recharts";

import "./kpipage.css"; // Use the shared CSS

// --- LOGIC START ---

dayjs.extend(isBetween);

const QUICK_FILTERS = {
  NONE: "none",
  DAY_PREV_DAY: "day_prev_day",
  WEEK_LAST_WEEK: "week_last_week",
  MONTH_LAST_MONTH: "month_last_month",
  YEAR_PREV_YEAR_1: "year_prev_1",
  YEAR_PREV_YEAR_2: "year_prev_2",
  YEAR_PREV_YEAR_3: "year_prev_3",
};

const CLIENT_FOLDERS = {
  entfw: ["entfw"],
  eca: ["eca"],
  soundhealth: ["soundhealth"],
};

// --- HELPER: Compact Number Formatter ---
const formatCompactNumber = (number) => {
  if (!number) return "$0";
  const absValue = Math.abs(number);
  if (absValue >= 1000000) {
    return '$' + (number / 1000000).toFixed(1) + 'M';
  } else if (absValue >= 1000) {
    return '$' + (number / 1000).toFixed(1) + 'K';
  }
  return '$' + number.toLocaleString();
};

const parseCSV = async (filePath) => {
  try {
    const res = await fetch(filePath);
    if (!res.ok) {
      console.warn(`Failed to fetch ${filePath}: ${res.statusText} - Skipping file`);
      return [];
    }
    const text = await res.text();
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed = results.data.map((row) => {
            let payerName = row.Payer_Name ||
              row['Payer_Name_1'] || row['Payer_Name_2'] ||
              row.Payer || row['Payer_1'] ||
              row["Payer Name"] || row.Insurance || row["Insurance Provider"] ||
              "Unknown";
            
            if (payerName && typeof payerName === 'string') {
              payerName = payerName.trim();
            }
            if (!payerName || payerName === '') payerName = "Unknown";

            return {
              Denial_ID: row.Denial_ID || 'N/A',
              Client: row.Client || "Unknown",
              Date_of_Service: row.Date_of_Service,
              Claim_ID: row.Claim_ID || 'N/A',
              Reason: row.Reason || "N/A",
              Claim_Status: row.Claim_Status || "Unknown",
              Denial_Amount: Number(String(row.Denial_Amount || "0").replace(/,/g, "").replace(/"/g, "")),
              Payer_Name: payerName,
              month: row.Date_of_Service ? dayjs(row.Date_of_Service).format("MMM YY") : "",
            };
          });
          resolve(parsed);
        },
        error: (error) => reject(error),
      });
    });
  } catch (error) {
    console.error(`Fetch error for ${filePath}:`, error);
    return [];
  }
};

function DropdownAvatar() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "40px", height: "40px", borderRadius: "50%",
          background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
          color: "white", fontWeight: "600", fontSize: "14px",
          border: "2px solid #fff", boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
        }}
      >
        JD
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "48px", right: 0,
          background: "white", border: "1px solid #e5e7eb", borderRadius: "8px",
          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", minWidth: "160px", zIndex: 1000,
          overflow: "hidden"
        }}>
          <div style={{ padding: "10px 16px", cursor: "pointer", fontSize: "14px", color: "#374151", borderBottom: "1px solid #f3f4f6" }} onClick={() => navigate("/policy")}>Privacy Policy</div>
          <div style={{ padding: "10px 16px", cursor: "pointer", fontSize: "14px", color: "#ef4444" }} onClick={() => navigate("/")}>Logout</div>
        </div>
      )}
    </div>
  );
}

export default function DenialRatePage() {
  const navigate = useNavigate();
  const [allClaimsData, setAllClaimsData] = useState([]);
  const [startDate, setStartDate] = useState(dayjs().subtract(3, "month").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [quickFilter, setQuickFilter] = useState(QUICK_FILTERS.NONE);
  const [selectedClient, setSelectedClient] = useState("entfw");

  const [currentPage, setCurrentPage] = useState(1);
  const [payerPage, setPayerPage] = useState(1);
  
  // Consistent config
  const rowsPerPage = 5;
  const payersPerPage = 6;

  // Data Loading
  useEffect(() => {
    const loadData = async () => {
      try {
        const folders = CLIENT_FOLDERS[selectedClient] || [];
        const paths = folders.map(folder => `/${folder}/denial.csv`);
        const filePromises = paths.map(path => parseCSV(path));
        const allData = await Promise.all(filePromises);
        const flatData = allData.flat();
        setAllClaimsData(flatData);
      } catch (err) {
        console.error("Error loading CSV files:", err);
      }
    };
    loadData();
  }, [selectedClient]);

  // Quick Filter Logic
  useEffect(() => {
    if (quickFilter === QUICK_FILTERS.NONE) {
      const lastDayOfLastMonth = dayjs().subtract(1, 'month').endOf('month'); 
      const startOfThreeMonthsAgo = lastDayOfLastMonth.subtract(2, 'month').startOf('month'); 
      setStartDate(startOfThreeMonthsAgo.format("YYYY-MM-DD")); 
      setEndDate(lastDayOfLastMonth.format("YYYY-MM-DD")); 
      return;
    }
    const today = dayjs();
    let start, end;
    switch (quickFilter) {
      case QUICK_FILTERS.DAY_PREV_DAY:
        start = today.subtract(1, "day"); end = today.subtract(1, "day"); break;
      case QUICK_FILTERS.WEEK_LAST_WEEK:
        start = today.subtract(1, "week").startOf("week"); end = today.subtract(1, "week").endOf("week"); break;
      case QUICK_FILTERS.MONTH_LAST_MONTH:
        start = today.subtract(1, "month").startOf("month"); end = today.subtract(1, "month").endOf("month"); break;
      case QUICK_FILTERS.YEAR_PREV_YEAR_1:
        start = dayjs("2025-01-01"); end = dayjs("2025-12-31"); break;
      case QUICK_FILTERS.YEAR_PREV_YEAR_2:
        start = dayjs("2024-01-01"); end = dayjs("2024-12-31"); break;
      case QUICK_FILTERS.YEAR_PREV_YEAR_3:
        start = dayjs("2023-01-01"); end = dayjs("2023-12-31"); break;
      default: return;
    }
    setStartDate(start.format("YYYY-MM-DD"));
    setEndDate(end.format("YYYY-MM-DD"));
  }, [quickFilter]);

  // Filtering Logic
  const { filteredData, prevPeriodData } = useMemo(() => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const duration = end.diff(start, 'day');
    const prevEnd = start.subtract(1, 'day');
    const prevStart = prevEnd.subtract(duration, 'day');
    
    const dateColumnToFilter = (d) => d.Date_of_Service;
    
    const current = allClaimsData.filter(d => {
      const claimDate = dayjs(dateColumnToFilter(d));
      return claimDate.isValid() && claimDate.isBetween(start, end, null, '[]');
    });
    
    const previous = allClaimsData.filter(d => {
      const claimDate = dayjs(dateColumnToFilter(d));
      return claimDate.isValid() && claimDate.isBetween(prevStart, prevEnd, null, '[]');
    });
    
    return { filteredData: current, prevPeriodData: previous };
  }, [allClaimsData, startDate, endDate]);

  // KPI Calculations
  const kpiMetrics = useMemo(() => {
    const getMetrics = (dataset) => {
      const deniedClaims = dataset.filter(d => d.Claim_Status && d.Claim_Status.toLowerCase().includes("denied"));
      const totalDenials = deniedClaims.length;
      const totalDeniedAmount = deniedClaims.reduce((sum, d) => sum + d.Denial_Amount, 0);
      const totalClaims = dataset.length;
      const denialRate = totalClaims > 0 ? (totalDenials / totalClaims) * 100 : 0;
      return { totalDenials, totalDeniedAmount, denialRate };
    };
    const main = getMetrics(filteredData);
    
    return {
      totalDenials: main.totalDenials,
      totalDeniedAmount: main.totalDeniedAmount,
      denialRate: main.denialRate,
    };
  }, [filteredData, prevPeriodData]);

  // Filter Denied Only Data
  const denialData = useMemo(() => {
    return filteredData.filter(d => d.Claim_Status && d.Claim_Status.toLowerCase().includes("denied"));
  }, [filteredData]);

  // Monthly Trend Data
  const filteredMonthlyData = useMemo(() => {
    const monthlyAggregated = {};
    denialData.forEach(d => {
      if (d.month) {
        if (!monthlyAggregated[d.month]) {
          monthlyAggregated[d.month] = { count: 0, date: dayjs(d.Date_of_Service).startOf('month') };
        }
        monthlyAggregated[d.month].count++;
      }
    });
    let data = Object.entries(monthlyAggregated)
      .sort(([, a], [, b]) => a.date.unix() - b.date.unix())
      .map(([month, { count }]) => ({ month, denials: count }));

    // Fix single dot -> line
    if (data.length === 1) {
        const p = data[0];
        data = [{...p, month: ""}, p, {...p, month: " "}];
    }
    return data;
  }, [denialData]);

  // Comparative Data
// --- REPLACED LOGIC: Comparative Denials (Last 3 Mos Avg vs Current Month) ---
  const avgVsLastMonthData = useMemo(() => {
    // Only look at denied claims
    const allDeniedClaims = allClaimsData.filter(d => 
      d.Claim_Status && d.Claim_Status.toLowerCase().includes("denied")
    );

    if (!allDeniedClaims.length) return [];

    // 1. Define "Current Month" range based on the selected "To Date"
    const currentRef = dayjs(endDate); 
    const currentStart = currentRef.startOf('month');
    const currentEnd = currentRef.endOf('month');

    // 2. Define "Last 3 Months" range (The 3 months BEFORE current)
    const prev3End = currentStart.subtract(1, 'day'); 
    const prev3Start = prev3End.subtract(2, 'month').startOf('month');

    // 3. Filter data for Current Month
    const currentMonthData = allDeniedClaims.filter(d => {
      const date = dayjs(d.Date_of_Service);
      return date.isValid() && date.isBetween(currentStart, currentEnd, null, '[]');
    });

    // 4. Filter data for Previous 3 Months
    const prev3MonthsData = allDeniedClaims.filter(d => {
      const date = dayjs(d.Date_of_Service);
      return date.isValid() && date.isBetween(prev3Start, prev3End, null, '[]');
    });

    // 5. Calculate values (Count of denials)
    const currentDenials = currentMonthData.length;
    const prev3Total = prev3MonthsData.length;
    const prev3Avg = prev3Total > 0 ? prev3Total / 3 : 0;

    return [
      { label: "Last 3 Mos Avg", denials: Math.round(prev3Avg) },
      { label: "Current Month", denials: currentDenials },
    ];
  }, [allClaimsData, endDate]);

  // Payer Breakdown Data
  const aggregatedPayerData = useMemo(() => {
    const map = {};
    denialData.forEach((item) => {
      let payerName = (item.Payer_Name || "Unknown").trim();
      if (!payerName || payerName === '') payerName = "Unknown";

      if (!map[payerName]) {
        map[payerName] = { name: payerName, denials: 0 };
      }
      map[payerName].denials++;
    });

    return Object.values(map)
      .sort((a, b) => b.denials - a.denials)
      .slice(0, 50);
  }, [denialData]);

  // Pagination Slicing
  const totalPages = Math.ceil(denialData.length / rowsPerPage);
  const currentData = denialData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  
  const payerStartIndex = (payerPage - 1) * payersPerPage;
  const payerEndIndex = payerStartIndex + payersPerPage;
  const currentPayers = aggregatedPayerData.slice(payerStartIndex, payerEndIndex);

  return (
    <div className="dashboard-container">
      {/* Sticky Header */}
      <div className="sticky-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button onClick={() => navigate("/dashboard")} className="btn-back">
             ← Back
          </button>
          <img src="/logo.png" alt="Logo" style={{ height: "40px", objectFit: "contain" }} onError={(e) => e.target.style.display = 'none'} />
          <div className="header-title">
             <h2>Denial Rate Analysis</h2>
             <p>Deep Dive Analysis</p>
          </div>
        </div>

        <div className="control-group">
          <div className="input-group">
            <label className="input-label">From Date</label>
            <input type="date" className="styled-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">To Date</label>
            <input type="date" className="styled-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Client</label>
            <select className="styled-input" value={selectedClient} onChange={(e) => { setSelectedClient(e.target.value); setCurrentPage(1); setPayerPage(1); }}>
              <option value="all">All</option>
              <option value="entfw">ENTFW</option>
              <option value="eca">ECA</option>
              <option value="soundhealth">SOUND HEALTH</option>
            </select>
          </div>
          <DropdownAvatar />
        </div>
      </div>

      <div className="grid-container">

        {/* Top KPI Cards */}
        <div className="grid-kpi-cards">
          <div className="card">
            <div className="kpi-title">Denial Rate</div>
            <div className="kpi-value" style={{color: "#ef4444"}}>{kpiMetrics.denialRate.toFixed(2)}%</div>
          </div>
          <div className="card">
            <div className="kpi-title">Total Denials</div>
            <div className="kpi-value">{kpiMetrics.totalDenials.toLocaleString()}</div>
          </div>
          <div className="card">
            <div className="kpi-title">Total Denied Amount</div>
            <div className="kpi-value">{formatCompactNumber(kpiMetrics.totalDeniedAmount)}</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid-3-cols">
            {/* 1. Monthly Trend */}
            <div className="card">
                <h3 className="section-title">Monthly Denials Trend</h3>
                <div style={{ height: "180px", width: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={filteredMonthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                        <Line type="monotone" dataKey="denials" stroke="#ef4444" strokeWidth={3} name="Denials" dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. Comparative Bar Chart */}
            <div className="card">
                <h3 className="section-title">Comparative Denials</h3>
                <div style={{ height: "180px", width: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={avgVsLastMonthData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#6b7280" }} interval={0} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                        <Bar dataKey="denials" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} name="Denials">
                            <LabelList dataKey="denials" position="top" style={{ fontSize: "11px", fontWeight: "bold", fill: "#374151" }} />
                        </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. Payer Breakdown */}
            <div className="card">
                <div style={{ marginBottom: "16px" }}>
                    <h3 className="section-title" style={{marginBottom: 0}}>Payer Denial Breakdown</h3>
                </div>
                <div style={{ height: "180px", width: "100%", position: "relative" }}>
                    <button 
                        disabled={payerPage <= 1} 
                        onClick={() => setPayerPage(p => Math.max(p - 1, 1))} 
                        className="chart-nav-btn"
                        style={{left: "-15px"}}
                    >
                        {"<"}
                    </button>

                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={currentPayers} margin={{ top: 0, right: 40, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(val) => val.toLocaleString()} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                        <Bar dataKey="denials" fill="#ef4444" barSize={12} radius={[0, 4, 4, 0]} name="Denials">
                            <LabelList dataKey="denials" position="right" style={{ fontSize: "10px", fill: "#6b7280" }} />
                        </Bar>
                        </BarChart>
                    </ResponsiveContainer>

                    <button 
                        disabled={payerEndIndex >= aggregatedPayerData.length} 
                        onClick={() => setPayerPage(p => p + 1)} 
                        className="chart-nav-btn"
                        style={{right: "-15px"}}
                    >
                        {">"}
                    </button>
                </div>
            </div>
        </div>

        {/* Table */}
        <div className="card">
            <h3 className="section-title">Denied Claim Details</h3>
            <div className="table-container">
                <table className="data-table">
                <thead>
                    <tr>
                    {["Claim ID", "Denied Amount", "Date of Service", "Claim Status", "Payer Name"].map((header) => (
                        <th key={header}>{header}</th>
                    ))}
                    </tr>
                </thead>
                <tbody>
                    {currentData.length === 0 ? (
                        <tr><td colSpan={5} style={{textAlign: "center", padding: "20px", color: "#999"}}>No denied claims in range</td></tr>
                    ) : (
                        currentData.map((row, index) => (
                        <tr key={`${row.Denial_ID || index}`}>
                            <td>{row.Claim_ID}</td>
                            <td>{formatCompactNumber(row.Denial_Amount)}</td>
                            <td>{row.Date_of_Service}</td>
                            <td>{row.Claim_Status}</td>
                            <td>{row.Payer_Name}</td>
                        </tr>
                        ))
                    )}
                </tbody>
                </table>
            </div>

            <div className="pagination">
                <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} className="btn-page">Previous</button>
                <span style={{ fontSize: "13px", color: "#6b7280" }}> Page {currentPage} of {totalPages || 1} </span>
                <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="btn-page">Next</button>
            </div>
        </div>

      </div>
    </div>
  );
}