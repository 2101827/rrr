import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from "recharts";

// Import the shared CSS file
import "./kpipage.css";

// --- LOGIC START (Specific to NCR) ---

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
        dynamicTyping: false,
        skipEmptyLines: true,
        complete: (results) => {
          const normalized = results.data.map((r) => ({
            ...r,
            month: r.month || (r.Date_of_Service ? dayjs(r.Date_of_Service).format("MMM YY") : (r.Charge_Entry_Date ? dayjs(r.Charge_Entry_Date).format("MMM YY") : "")),
            Billed_Amount: Number(String(r.Billed_Amount || "0").replace(/,/g, "").replace(/"/g, "")),
            Paid_Amount: Number(String(r.Paid_Amount || "0").replace(/,/g, "").replace(/"/g, "")),
            Adjustment_Amount: Number(String(r.Adjustment_Amount || "0").replace(/,/g, "").replace(/"/g, "")),
            Date_of_Service: r.Date_of_Service || null,
            Charge_Entry_Date: r.Charge_Entry_Date || null,
          }));
          resolve(normalized);
        },
        error: (error) => reject(error)
      });
    });
  } catch (error) {
    console.error(`Fetch error for ${filePath}:`, error);
    return [];
  }
};

// --- HELPER COMPONENT: DROPDOWN AVATAR ---
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

export default function NcrPage() {
  const navigate = useNavigate();
  // Renamed state to reflect NCR Data source
  const [allNcrData, setAllNcrData] = useState([]);
  const lastDayOfLastMonth = dayjs().subtract(1, 'month').endOf('month');
  const [startDate, setStartDate] = useState(dayjs().subtract(3, "month").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [quickFilter, setQuickFilter] = useState(QUICK_FILTERS.NONE);
  const [selectedClient, setSelectedClient] = useState("entfw");

  const [currentPage, setCurrentPage] = useState(1);
  const [payerPage, setPayerPage] = useState(1);
  
  const rowsPerPage = 5; 
  const payersPerPage = 6;

  // Data loading effect - UPDATED TO FETCH ncrdata.csv
  useEffect(() => {
    const loadData = async () => {
      try {
        const folders = CLIENT_FOLDERS[selectedClient] || [];
        // CHANGE: Fetching ncrdata.csv instead of charges.csv
        const paths = folders.map(folder => `/${folder}/ncrdata.csv`);
        const filePromises = paths.map(path => parseCSV(path));
        const allData = await Promise.all(filePromises);
        const combinedData = allData.flat();
        setAllNcrData(combinedData);
      } catch (err) {
        console.error("Error loading NCR CSV files:", err);
      }
    };
    loadData();
  }, [selectedClient]);

  // Filter Date Effect
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
        start = today.subtract(1, "day");
        end = today.subtract(1, "day");
        break;
      case QUICK_FILTERS.WEEK_LAST_WEEK:
        start = today.subtract(1, "week").startOf("week");
        end = today.subtract(1, "week").endOf("week");
        break;
      case QUICK_FILTERS.MONTH_LAST_MONTH:
        start = today.subtract(1, "month").startOf("month");
        end = today.subtract(1, "month").endOf("month");
        break;
      case QUICK_FILTERS.YEAR_PREV_YEAR_1:
        start = dayjs("2025-01-01");
        end = dayjs("2025-12-31");
        break;
      case QUICK_FILTERS.YEAR_PREV_YEAR_2:
        start = dayjs("2024-01-01");
        end = dayjs("2024-12-31");
        break;
      case QUICK_FILTERS.YEAR_PREV_YEAR_3:
        start = dayjs("2023-01-01");
        end = dayjs("2023-12-31");
        break;
      default:
        return;
    }
    setStartDate(start.format("YYYY-MM-DD"));
    setEndDate(end.format("YYYY-MM-DD"));
  }, [quickFilter]);

  // Filtering Logic - Using allNcrData
  const { filteredNcrData } = useMemo(() => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);

    const current = allNcrData.filter((r) => {
      const postedDate = dayjs(r.Charge_Entry_Date);
      return postedDate.isValid() && postedDate.isBetween(start, end, null, '[]');
    });

    return { filteredNcrData: current };
  }, [allNcrData, startDate, endDate]);

  // KPI Calculations (NCR Specific)
  const kpiMetrics = useMemo(() => {
    const getMetrics = (dataset) => {
      if (!dataset.length) {
        return { totalBilled: 0, totalPaid: 0, totalAdj: 0, ncr: 0 };
      }
      const totalBilled = dataset.reduce((sum, d) => sum + d.Billed_Amount, 0);
      const totalPaid = dataset.reduce((sum, d) => sum + d.Paid_Amount, 0);
      const totalAdj = dataset.reduce((sum, d) => sum + d.Adjustment_Amount, 0);
      const denominator = totalBilled - totalAdj;
      const ncr = denominator > 0 ? (totalPaid / denominator) * 100 : 0;
      return { totalBilled, totalPaid, totalAdj, ncr };
    };

    const mainMetrics = getMetrics(filteredNcrData);

    return {
      overallNcr: mainMetrics.ncr.toFixed(2),
      totalPaid: mainMetrics.totalPaid,
      totalBilled: mainMetrics.totalBilled,
      totalAdj: mainMetrics.totalAdj,
    };
  }, [filteredNcrData]);

  // Monthly Trend Data
  const filteredMonthlyData = useMemo(() => {
    const INDUSTRY_STANDARD_NCR_TARGET = 97;
    const monthlyAggregated = {};

    filteredNcrData.forEach((d) => {
      const postedDate = dayjs(d.Charge_Entry_Date);
      if (!postedDate.isValid()) return;
      const month = postedDate.format("MMM YY");
      if (!monthlyAggregated[month]) {
        monthlyAggregated[month] = { billed: 0, paid: 0, adjustment: 0, date: postedDate.startOf('month') };
      }
      monthlyAggregated[month].billed += d.Billed_Amount || 0;
      monthlyAggregated[month].paid += d.Paid_Amount || 0;
      monthlyAggregated[month].adjustment += d.Adjustment_Amount || 0;
    });

    let data = Object.entries(monthlyAggregated)
      .sort(([, a], [, b]) => a.date.unix() - b.date.unix())
      .map(([month, vals]) => {
        const netBilled = vals.billed - vals.adjustment;
        const actual = netBilled > 0 ? (vals.paid / netBilled) * 100 : 0;
        return {
          month,
          actual: +actual.toFixed(2),
          target: INDUSTRY_STANDARD_NCR_TARGET,
        }
      });
    
    if (data.length === 1) {
        const p = data[0];
        data = [{...p, month: ""}, p, {...p, month: " "}];
    }
    return data;
  }, [filteredNcrData]);

  // Comparative NCR Data
  const avgVsLastMonthNcrData = useMemo(() => {
    const calculateNCR = (dataset) => {
      if (!dataset || dataset.length === 0) return 0;
      const totalPaid = dataset.reduce((sum, d) => sum + d.Paid_Amount, 0);
      const totalBilled = dataset.reduce((sum, d) => sum + d.Billed_Amount, 0);
      const totalAdjustments = dataset.reduce((sum, d) => sum + d.Adjustment_Amount, 0);
      const netBilled = totalBilled - totalAdjustments;
      return netBilled > 0 ? (totalPaid / netBilled) * 100 : 0;
    };

    if (!allNcrData.length) return [];

    const currentRef = dayjs(endDate); 
    const currentStart = currentRef.startOf('month');
    const currentEnd = currentRef.endOf('month');

    const prev3End = currentStart.subtract(1, 'day'); 
    const prev3Start = prev3End.subtract(2, 'month').startOf('month');

    const currentMonthData = allNcrData.filter(d => {
      const date = dayjs(d.Charge_Entry_Date);
      return date.isValid() && date.isBetween(currentStart, currentEnd, null, '[]');
    });

    const prev3MonthsData = allNcrData.filter(d => {
      const date = dayjs(d.Charge_Entry_Date);
      return date.isValid() && date.isBetween(prev3Start, prev3End, null, '[]');
    });

    const currentNcr = calculateNCR(currentMonthData);
    const prevAvgNcr = calculateNCR(prev3MonthsData);

    return [
      { label: "Last 3 Mos Avg", ncr: +prevAvgNcr.toFixed(2) },
      { label: "Current Month", ncr: +currentNcr.toFixed(2) },
    ];
  }, [allNcrData, endDate]);

  const filteredPayerData = useMemo(() => {
    const aggregated = filteredNcrData.reduce((acc, d) => {
      const payer = d.Payer_Name || "Unknown";
      if (!acc[payer]) acc[payer] = { name: payer, payments: 0 };
      acc[payer].payments += d.Paid_Amount || 0;
      return acc;
    }, {});
    return Object.values(aggregated).filter(payerData => payerData.payments > 0).sort((a, b) => b.payments - a.payments);
  }, [filteredNcrData]);

  // Pagination
  const payerStartIndex = (payerPage - 1) * payersPerPage;
  const payerEndIndex = payerStartIndex + payersPerPage;
  const currentPayers = filteredPayerData.slice(payerStartIndex, payerEndIndex);
  const totalPages = Math.ceil(filteredNcrData.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentData = filteredNcrData.slice(indexOfFirstRow, indexOfLastRow);

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
              <h2>Net Collection Rate (NCR)</h2>
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

        {/* KPI Cards Row (4 Cards for NCR) */}
        <div className="grid-kpi-cards">
          <div className="card">
            <div className="kpi-title">Overall NCR</div>
            <div className="kpi-value" style={{color: "#10b981"}}>{kpiMetrics.overallNcr}%</div>
          </div>
          <div className="card">
            <div className="kpi-title">Total Payment</div>
            <div className="kpi-value">{formatCompactNumber(kpiMetrics.totalPaid)}</div>
          </div>
          <div className="card">
            <div className="kpi-title">Total Billed</div>
            <div className="kpi-value">{formatCompactNumber(kpiMetrics.totalBilled)}</div>
          </div>
          <div className="card">
            <div className="kpi-title">Total Adjustments</div>
            <div className="kpi-value">{formatCompactNumber(kpiMetrics.totalAdj)}</div>
          </div>
        </div>

        {/* Charts Row (3 Equal Columns) */}
        <div className="grid-3-cols">
            {/* 1. Monthly Trend */}
            <div className="card">
                <h3 className="section-title">Monthly NCR Trend</h3>
                <div style={{ height: "180px", width: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={filteredMonthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(t) => `${t}%`} />
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                        <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} name="Actual NCR" dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="target" stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={2} name="Target NCR" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. Comparative NCR */}
            <div className="card">
                <h3 className="section-title">Comparative NCR</h3>
                <div style={{ height: "180px", width: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={avgVsLastMonthNcrData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#6b7280" }} interval={0} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(t) => `${t}%`} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                        <Bar dataKey="ncr" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} name="NCR %">
                            <LabelList dataKey="ncr" position="top" formatter={(v) => `${v}%`} style={{ fontSize: "11px", fontWeight: "bold", fill: "#374151" }} />
                        </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. Payer Breakdown */}
            <div className="card">
                <div style={{ marginBottom: "16px" }}>
                    <h3 className="section-title" style={{marginBottom: 0}}>Top Payers Breakdown</h3>
                </div>
                <div style={{ height: "180px", width: "100%", position: "relative" }}>
                    {/* Left Arrow */}
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
                        <Tooltip formatter={(val) => `$${val.toLocaleString()}`} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                        <Bar dataKey="payments" fill="#8b5cf6" barSize={12} radius={[0, 4, 4, 0]} name="Payments">
                            <LabelList dataKey="payments" position="right" formatter={(v) => `${formatCompactNumber(v)}`} style={{ fontSize: "10px", fill: "#6b7280" }} />
                        </Bar>
                        </BarChart>
                    </ResponsiveContainer>

                    {/* Right Arrow */}
                    <button 
                        disabled={payerEndIndex >= filteredPayerData.length} 
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
            <h3 className="section-title">Claim Level Details</h3>
            <div className="table-container">
                <table className="data-table">
                <thead>
                    <tr>
                    {["Claim ID", "Billed Amount ($)", "Paid Amount ($)", "Adjustment ($)", "Entry Date", "Payer"].map((header) => (
                        <th key={header}>{header}</th>
                    ))}
                    </tr>
                </thead>
                <tbody>
                    {currentData.map((row, index) => (
                    <tr key={`${row.Claim_ID || index}`}>
                        <td>{row.Claim_ID}</td>
                        <td>${row.Billed_Amount.toLocaleString()}</td>
                        <td style={{color: "#10b981", fontWeight: "500"}}>${row.Paid_Amount.toLocaleString()}</td>
                        <td>${row.Adjustment_Amount.toLocaleString()}</td>
                        <td>{row.Charge_Entry_Date}</td>
                        <td>{row.Payer_Name}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>

            <div className="pagination">
                <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} className="btn-page">Previous</button>
                <span style={{ fontSize: "13px", color: "#6b7280" }}> Page {currentPage} of {totalPages} </span>
                <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="btn-page">Next</button>
            </div>
        </div>

      </div>
    </div>
  );
}