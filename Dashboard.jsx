import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Papa from "papaparse";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import axios from "axios";

import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, ReferenceLine,
} from "recharts";

// --- LOGIC CONSTANTS ---
const CLIENT_PREV_KPIS = {
  "entfw": {
    totalPayments: 95000, totalClaims: 9469, gcr: 34.50, ncr: 97.00, denialRate: 0.30,
    firstPassRate: 0.00, cleanClaimRate: 95.00, totalDenials: 55, totalOpenAR: 320000,
    GCR_Target: 32.5, GCR_Baseline: 34.5, NCR_Target: 45.2, NCR_Baseline: 97.0,
    CCR_Target: 91.2, CCR_Baseline: 95.0, FPR_Target: 95.0, FPR_Baseline: 85.0,
    Denial_Rate_Target: 0.3, Denial_Rate_Baseline: 0.30
  },
  "eca": {
    totalPayments: 120000, totalClaims: 510, gcr: 38.1, ncr: 49.7, denialRate: 10.4,
    firstPassRate: 82.1, cleanClaimRate: 89.5, totalDenials: 48, totalOpenAR: 410000,
    GCR_Target: 38.1, GCR_Baseline: 38.1, NCR_Target: 49.7, NCR_Baseline: 49.7,
    CCR_Target: 89.5, CCR_Baseline: 89.5, FPR_Target: 82.1, FPR_Baseline: 82.1,
    Denial_Rate_Target: 10.4, Denial_Rate_Baseline: 10.4
  },
  "soundhealth": {
    totalPayments: 78000, totalClaims: 9367, gcr: 24.00, ncr: 93.00, denialRate: 0.00,
    firstPassRate: 0.00, cleanClaimRate: 98.00, totalDenials: 62, totalOpenAR: 275000,
    GCR_Target: 29.9, GCR_Baseline: 24.0, NCR_Target: 41.3, NCR_Baseline: 93.0,
    CCR_Target: 87.1, CCR_Baseline: 98.0, FPR_Target: 76.3, FPR_Baseline: 0.0,
    Denial_Rate_Target: 14.9, Denial_Rate_Baseline: 0.0
  },
  "piedmont": {
    totalPayments: 142000, totalClaims: 600, gcr: 40.4, ncr: 53.0, denialRate: 9.1,
    firstPassRate: 85.5, cleanClaimRate: 93.2, totalDenials: 41, totalOpenAR: 520000,
    GCR_Target: 40.4, GCR_Baseline: 40.4, NCR_Target: 53.0, NCR_Baseline: 53.0,
    CCR_Target: 93.2, CCR_Baseline: 93.2, FPR_Target: 85.5, FPR_Baseline: 85.5,
    Denial_Rate_Target: 9.1, Denial_Rate_Baseline: 9.1
  }
};

const getAveragePrevKPIs = () => {
  const clients = Object.values(CLIENT_PREV_KPIS);
  const sum = clients.reduce((acc, c) => ({
    totalPayments: acc.totalPayments + c.totalPayments,
    totalClaims: acc.totalClaims + c.totalClaims,
    gcr: acc.gcr + c.gcr,
    ncr: acc.ncr + c.ncr,
    denialRate: acc.denialRate + c.denialRate,
    firstPassRate: acc.firstPassRate + c.firstPassRate,
    cleanClaimRate: acc.cleanClaimRate + c.cleanClaimRate,
    totalDenials: acc.totalDenials + c.totalDenials,
    totalOpenAR: acc.totalOpenAR + c.totalOpenAR,
    GCR_Target: acc.GCR_Target + c.GCR_Target,
    GCR_Baseline: acc.GCR_Baseline + c.GCR_Baseline,
    NCR_Target: acc.NCR_Target + c.NCR_Target,
    NCR_Baseline: acc.NCR_Baseline + c.NCR_Baseline,
    CCR_Target: acc.CCR_Target + c.CCR_Target,
    CCR_Baseline: acc.CCR_Baseline + c.CCR_Baseline,
    FPR_Target: acc.FPR_Target + c.FPR_Target,
    FPR_Baseline: acc.FPR_Baseline + c.FPR_Baseline,
    Denial_Rate_Target: acc.Denial_Rate_Target + c.Denial_Rate_Target,
    Denial_Rate_Baseline: acc.Denial_Rate_Baseline + c.Denial_Rate_Baseline,
  }), {
    totalPayments: 0, totalClaims: 0, gcr: 0, ncr: 0, denialRate: 0, firstPassRate: 0, cleanClaimRate: 0, totalDenials: 0, totalOpenAR: 0,
    GCR_Target: 0, GCR_Baseline: 0, NCR_Target: 0, NCR_Baseline: 0, CCR_Target: 0, CCR_Baseline: 0, FPR_Target: 0, FPR_Baseline: 0, Denial_Rate_Target: 0, Denial_Rate_Baseline: 0
  });
  const count = clients.length;
  return {
    totalPayments: sum.totalPayments / count,
    totalClaims: sum.totalClaims / count,
    gcr: sum.gcr / count,
    ncr: sum.ncr / count,
    denialRate: sum.denialRate / count,
    firstPassRate: sum.firstPassRate / count,
    cleanClaimRate: sum.cleanClaimRate / count,
    totalDenials: sum.totalDenials / count,
    totalOpenAR: sum.totalOpenAR / count,
    GCR_Target: sum.GCR_Target / count,
    GCR_Baseline: sum.GCR_Baseline / count,
    NCR_Target: sum.NCR_Target / count,
    NCR_Baseline: sum.NCR_Baseline / count,
    CCR_Target: sum.CCR_Target / count,
    CCR_Baseline: sum.CCR_Baseline / count,
    FPR_Target: sum.FPR_Target / count,
    FPR_Baseline: sum.FPR_Baseline / count,
    Denial_Rate_Target: sum.Denial_Rate_Target / count,
    Denial_Rate_Baseline: sum.Denial_Rate_Baseline / count,
  };
};

const QUICK_FILTERS = {
  NONE: "none",
  DAY_PREV_DAY: "day_prev_day",
  DAY_LAST_MONTH_SAME_DAY: "day_last_month_same",
  DAY_LAST_YEAR_SAME_DAY: "day_last_year_same",
  WEEK_LAST_WEEK: "week_last_week",
  WEEK_LAST_MONTH_WEEK: "week_last_month",
  WEEK_LAST_YEAR_WEEK: "week_last_year",
  MONTH_LAST_MONTH: "month_last_month",
  MONTH_LAST_YEAR_SAME_MONTH: "month_last_year_same",
  YEAR_PREV_YEAR_1: "year_prev_1",
  YEAR_PREV_YEAR_2: "year_prev_2",
  YEAR_PREV_YEAR_3: "year_prev_3",
};

const CLIENT_FOLDERS = {
  entfw: ["entfw"],
  eca: ["eca"],
  soundhealth: ["soundhealth"],
};

dayjs.extend(isBetween);

// --- HELPER: Compact Number Formatter ---
const formatCompactNumber = (number) => {
  if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + "M";
  } else if (number >= 1000) {
    return (number / 1000).toFixed(1) + "K";
  }
  return number.toString();
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
  const handleLogout = () => { navigate("/"); };
  
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
          <div style={{ padding: "10px 16px", cursor: "pointer", fontSize: "14px", color: "#ef4444" }} onClick={handleLogout}>Logout</div>
        </div>
      )}
    </div>
  );
}

// Helper to parse CSV from URL (for initial load)
const parseCSV = async (filePath) => {
    try {
        const res = await fetch(filePath);
        if (!res.ok) { return []; }
        const text = await res.text();
        return new Promise((resolve, reject) => {
            Papa.parse(text, {
                header: true, dynamicTyping: false, skipEmptyLines: true,
                complete: (results) => {
                    const normalized = results.data.map((r) => {
                        const dos = r.Date_of_Service ? dayjs(r.Date_of_Service) : null;
                        const ced = r.Charge_Entry_Date ? dayjs(r.Charge_Entry_Date) : null;
                        return {
                            ...r,
                            month: r.month || (dos ? dos.format("MMM YY") : (ced ? ced.format("MMM YY") : "")),
                            Billed_Amount: Number(String(r.Billed_Amount || "0").replace(/,/g, "").replace(/"/g, "")),
                            Paid_Amount: Number(String(r.Paid_Amount || "0").replace(/,/g, "").replace(/"/g, "")),
                            Adjustment_Amount: Number(String(r.Adjustment_Amount || "0").replace(/,/g, "").replace(/"/g, "")),
                            Open_AR_Amount: Number(String(r.Open_AR_Amount || r.apenaramount || "0").replace(/,/g, "").replace(/"/g, "")),
                            GCR_Target: Number(String(r.GCR_Target || "0").replace(/,/g, "").replace(/"/g, "")),
                            GCR_Baseline: Number(String(r.GCR_Baseline || "0").replace(/,/g, "").replace(/"/g, "")),
                            Is_First_Pass_Resolution: (() => {
                                const val = r.Is_First_Pass_Resolution || r.First_Pass; 
                                if (!val) return false;
                                const strVal = String(val).toLowerCase().trim();
                                return ["true", "yes", "y", "1"].includes(strVal);
                            })(),
                            Is_Clean_Claim: Number(r.Is_Clean_Claim || 0),
                            Date_of_Service: r.Date_of_Service || null,
                            Charge_Entry_Date: r.Charge_Entry_Date || null,
                            Claim_Submission_Date: r.Claim_Submission_Date || null,
                            aging: Number(r.aging || 0),
                            Aging_Amount: Number(r.Aging_Amount || "0"),
                            ar_days: Number(r.ar_days || 0),
                            visit: Number(r.visit || 0),
                            ts_dos: dos ? dos.valueOf() : 0,
                            ts_ced: ced ? ced.valueOf() : 0
                        };
                    });
                    resolve(normalized);
                },
                error: (error) => reject(error)
            });
        });
    } catch (error) { return []; }
};

export default function Dashboard() {
  const [charges, setCharges] = useState([]);
  const [denials, setDenials] = useState([]);
  const [openAR, setOpenAR] = useState([]);
  // --- NEW STATE FOR NCR DATA ---
  const [ncrData, setNcrData] = useState([]);
  // -----------------------------
  const [aiBotOpen, setAiBotOpen] = useState(false);
  const [agingData, setAgingData] = useState([]);
  const [startDate, setStartDate] = useState(dayjs().subtract(3, "month").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [quickFilter, setQuickFilter] = useState(QUICK_FILTERS.NONE);
  const [selectedMetric, setSelectedMetric] = useState("GCR");
  const [selectedClient, setSelectedClient] = useState("entfw");
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // --- UPDATED PATH GETTER TO INCLUDE NCRDATA ---
  const getClientPaths = (client) => {
    const folders = CLIENT_FOLDERS[client] || [];
    return folders.flatMap(folder => [
      `/${folder}/charges.csv`, `/${folder}/denial.csv`, `/${folder}/openar.csv`, `/${folder}/aging.csv`, `/${folder}/ncrdata.csv`
    ]);
  };

  function AiBotPopup({ open, onClose }) {
    const [chatInput, setChatInput] = useState("");
    const [chatMessages, setChatMessages] = useState([]);
    const messagesEndRef = useRef(null);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);
    const sendChatMessage = async () => {
      const trimmed = chatInput.trim();
      if (!trimmed) return;
      setChatMessages(prev => [...prev, { sender: "user", text: trimmed }]);
      setChatInput("");
      try {
        const res = await axios.post("http://localhost:9000/chat", { message: trimmed });
        setChatMessages(prev => [...prev, { sender: "bot", text: res.data?.response || "No response." }]);
      } catch (error) {
        setChatMessages(prev => [...prev, { sender: "bot", text: error.response?.data?.error || "Error contacting bot." }]);
      }
    };
    return open ? (
      <div style={{ position: "fixed", bottom: 88, right: 24, width: 360, height: 500, background: "#fff", borderRadius: "16px", boxShadow: "0 12px 24px rgba(0,0,0,0.15)", zIndex: 1300, display: "flex", flexDirection: "column", border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <div style={{ padding: "16px", background: "#2563eb", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{fontWeight: 600}}>Jorie AI Assistant</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer" }}>×</button>
        </div>
        <div style={{ flex: 1, padding: "16px", overflowY: "auto", background: "#f9fafb" }}>
          {chatMessages.map((msg, idx) => (
            <div key={idx} style={{ textAlign: msg.sender === "user" ? "right" : "left", marginBottom: 12 }}>
              <span style={{ display: "inline-block", background: msg.sender === "user" ? "#2563eb" : "#e5e7eb", color: msg.sender === "user" ? "#fff" : "#1f2937", borderRadius: "12px", padding: "8px 14px", maxWidth: "85%", fontSize: "14px", lineHeight: "1.4" }}>{msg.text}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div style={{ padding: "12px", borderTop: "1px solid #e5e7eb", display: "flex" }}>
          <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", outline: "none", fontSize: "14px" }} placeholder="Ask me anything..." onKeyDown={e => e.key === "Enter" && sendChatMessage()} />
          <button style={{ marginLeft: 8, padding: "0 16px", borderRadius: "8px", border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer" }} onClick={sendChatMessage}>Send</button>
        </div>
      </div>
    ) : null;
  }

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
      case QUICK_FILTERS.DAY_PREV_DAY: start = today.subtract(1, "day"); end = today.subtract(1, "day"); break;
      case QUICK_FILTERS.DAY_LAST_MONTH_SAME_DAY: start = today.subtract(1, "month"); end = today.subtract(1, "month"); break;
      case QUICK_FILTERS.DAY_LAST_YEAR_SAME_DAY: start = today.subtract(1, "year"); end = today.subtract(1, "year"); break;
      case QUICK_FILTERS.WEEK_LAST_WEEK: start = today.subtract(1, "week").startOf("week"); end = today.subtract(1, "week").endOf("week"); break;
      case QUICK_FILTERS.WEEK_LAST_MONTH_WEEK: start = today.subtract(1, "month").startOf("week"); end = today.subtract(1, "month").endOf("week"); break;
      case QUICK_FILTERS.WEEK_LAST_YEAR_WEEK: start = today.subtract(1, "year").startOf("week"); end = today.subtract(1, "year").endOf("week"); break;
      case QUICK_FILTERS.MONTH_LAST_MONTH: start = today.subtract(1, "month").startOf("month"); end = today.subtract(1, "month").endOf("month"); break;
      case QUICK_FILTERS.MONTH_LAST_YEAR_SAME_MONTH: start = today.subtract(1, "year").startOf("month"); end = today.subtract(1, "year").endOf("month"); break;
      case QUICK_FILTERS.YEAR_PREV_YEAR_1: start = today.subtract(0, "year").startOf("year"); end = today.subtract(0, "year").endOf("year"); break;
      case QUICK_FILTERS.YEAR_PREV_YEAR_2: start = today.subtract(1, "year").startOf("year"); end = today.subtract(1, "year").endOf("year"); break;
      case QUICK_FILTERS.YEAR_PREV_YEAR_3: start = today.subtract(2, "year").startOf("year"); end = today.subtract(2, "year").endOf("year"); break;
      default: return;
    }
    setStartDate(start.format("YYYY-MM-DD"));
    setEndDate(end.format("YYYY-MM-DD"));
  }, [quickFilter]);

  // --- UPDATED MULTI-FILE UPLOAD HANDLER ---
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    // Check for exactly 5 files
    if (files.length !== 5) {
      setUploadError("Please select exactly 5 files: Charges, Denials, OpenAR, Aging, and NCR Data.");
      if (fileInputRef.current) fileInputRef.current.value = ""; 
      return;
    }
    setUploadError("");

    const processFile = (file) => {
      return new Promise((resolve) => {
        Papa.parse(file, {
          header: true,
          dynamicTyping: false,
          skipEmptyLines: true,
          complete: (results) => {
            const normalized = results.data.map((r) => {
              const dos = r.Date_of_Service ? dayjs(r.Date_of_Service) : null;
              const ced = r.Charge_Entry_Date ? dayjs(r.Charge_Entry_Date) : null;
              return {
                ...r,
                month: r.month || (dos ? dos.format("MMM YY") : (ced ? ced.format("MMM YY") : "")),
                Billed_Amount: Number(String(r.Billed_Amount || "0").replace(/,/g, "").replace(/"/g, "")),
                Paid_Amount: Number(String(r.Paid_Amount || "0").replace(/,/g, "").replace(/"/g, "")),
                Adjustment_Amount: Number(String(r.Adjustment_Amount || "0").replace(/,/g, "").replace(/"/g, "")),
                Open_AR_Amount: Number(String(r.Open_AR_Amount || r.apenaramount || "0").replace(/,/g, "").replace(/"/g, "")),
                GCR_Target: Number(String(r.GCR_Target || "0").replace(/,/g, "").replace(/"/g, "")),
                GCR_Baseline: Number(String(r.GCR_Baseline || "0").replace(/,/g, "").replace(/"/g, "")),
                Is_First_Pass_Resolution: (() => {
                    const val = r.Is_First_Pass_Resolution || r.First_Pass;
                    if (!val) return false;
                    const strVal = String(val).toLowerCase().trim();
                    return ["true", "yes", "y", "1"].includes(strVal);
                })(),
                Is_Clean_Claim: Number(r.Is_Clean_Claim || 0),
                Date_of_Service: r.Date_of_Service || null,
                Charge_Entry_Date: r.Charge_Entry_Date || null,
                Claim_Submission_Date: r.Claim_Submission_Date || null,
                aging: Number(r.aging || 0),
                Aging_Amount: Number(r.Aging_Amount || "0"),
                ar_days: Number(r.ar_days || 0),
                visit: Number(r.visit || 0),
                ts_dos: dos ? dos.valueOf() : 0,
                ts_ced: ced ? ced.valueOf() : 0
              };
            });
            resolve({ name: file.name.toLowerCase(), data: normalized });
          },
        });
      });
    };

    try {
      const parsedResults = await Promise.all(files.map(processFile));

      let newCharges = [];
      let newDenials = [];
      let newOpenAR = [];
      let newAging = [];
      let newNcrData = [];

      parsedResults.forEach(({ name, data }) => {
        if (name.includes("charge")) {
          newCharges = data;
        } else if (name.includes("denial")) {
          newDenials = data;
        } else if (name.includes("openar") || name.includes("open") || name.includes("ar") && !name.includes("aging")) {
          newOpenAR = data;
        } else if (name.includes("aging")) {
          newAging = data;
        } else if (name.includes("ncr")) {
          newNcrData = data;
        }
      });

      setCharges(newCharges);
      setDenials(newDenials);
      setOpenAR(newOpenAR);
      setAgingData(newAging);
      setNcrData(newNcrData);
      
      if (fileInputRef.current) fileInputRef.current.value = "";

    } catch (error) {
      console.error(error);
      setUploadError("Error processing files. Please check CSV format.");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const paths = getClientPaths(selectedClient);
        const filePromises = paths.map(path => parseCSV(path));
        const allData = await Promise.all(filePromises);
        let allCharges = [], allDenials = [], allOpenAR = [], allAging = [], allNcr = [];
        
        paths.forEach((path, index) => {
          const data = allData[index] || [];
          if (path.includes("charges.csv")) allCharges = [...allCharges, ...data];
          else if (path.includes("denial.csv")) allDenials = [...allDenials, ...data];
          else if (path.includes("openar.csv")) allOpenAR = [...allOpenAR, ...data];
          else if (path.includes("aging.csv")) allAging = [...allAging, ...data];
          else if (path.includes("ncrdata.csv")) allNcr = [...allNcr, ...data];
        });
        setCharges(allCharges); setDenials(allDenials); setOpenAR(allOpenAR); setAgingData(allAging); setNcrData(allNcr);
      } catch (err) { console.error("Error loading CSV:", err); }
    };
    loadData();
  }, [selectedClient]);

  const { filteredCharges, filteredDenials, filteredOpenAR, filteredAging, filteredNCR, prevCharges, prevDenials, prevOpenAR, prevNCR } = useMemo(() => {
    const safeCharges = Array.isArray(charges) ? charges : [];
    const safeDenials = Array.isArray(denials) ? denials : [];
    const safeOpenAR = Array.isArray(openAR) ? openAR : [];
    const safeAgingData = Array.isArray(agingData) ? agingData : [];
    const safeNcrData = Array.isArray(ncrData) ? ncrData : [];
    
    const startObj = dayjs(startDate);
    const endObj = dayjs(endDate);
    const startTs = startObj.valueOf();
    const endTs = endObj.valueOf();

    let durationDays = endObj.diff(startObj, 'day') + 1;
    if (durationDays <= 1) durationDays = 1;
    
    let prevEndObj = startObj.subtract(1, 'day');
    let prevStartObj = prevEndObj.clone().subtract(durationDays - 1, 'day');
    if (!prevStartObj.isValid() || !prevEndObj.isValid()) {
      prevStartObj = startObj.clone().subtract(durationDays, 'day');
      prevEndObj = prevStartObj.clone().add(durationDays - 1, 'day');
    }
    const prevStartTs = prevStartObj.valueOf();
    const prevEndTs = prevEndObj.valueOf();

    const filterByTs = (arr, tsKey) => arr.filter(r => {
        const ts = r[tsKey];
        return ts >= startTs && ts <= endTs;
    });

    const filterByTsPrev = (arr, tsKey) => arr.filter(r => {
        const ts = r[tsKey];
        return ts >= prevStartTs && ts <= prevEndTs;
    });

    return {
      filteredCharges: filterByTs(safeCharges, "ts_ced"),
      prevCharges: filterByTsPrev(safeCharges, "ts_ced"),
      
      filteredDenials: filterByTs(safeDenials, "ts_dos"),
      prevDenials: filterByTsPrev(safeDenials, "ts_dos"),
      
      filteredOpenAR: filterByTs(safeOpenAR, "ts_dos"),
      prevOpenAR: filterByTsPrev(safeOpenAR, "ts_dos"),
      
      filteredAging: filterByTs(safeAgingData, "ts_dos"),
      prevAging: filterByTsPrev(safeAgingData, "ts_dos"),

      // --- FILTER NCR DATA (Using Charge Entry Date TS_CED) ---
      filteredNCR: filterByTs(safeNcrData, "ts_ced"),
      prevNCR: filterByTsPrev(safeNcrData, "ts_ced"),
    };
  }, [charges, denials, openAR, agingData, ncrData, startDate, endDate]);

  // --- UPDATED CALCULATE KPIS TO ACCEPT NCR DATA ---
  const calculateKPIs = (chargesData, denialsData, openARData, ncrDataInput) => {
    const safeCharges = Array.isArray(chargesData) ? chargesData : [];
    const safeDenials = Array.isArray(denialsData) ? denialsData : [];
    const safeOpenAR = Array.isArray(openARData) ? openARData : [];
    const safeNcr = Array.isArray(ncrDataInput) ? ncrDataInput : [];

    const totalPayments = safeCharges.reduce((sum, r) => sum + (r.Paid_Amount || 0), 0);
    const totalBilled = safeCharges.reduce((sum, r) => sum + (r.Billed_Amount || 0), 0);
    const totalAdjustments = safeCharges.reduce((sum, r) => sum + (r.Adjustment_Amount || 0), 0);
    const totalClaims = safeCharges.reduce((sum, r) => sum + Number(r.visit || 0), 0);
    const deniedCount = safeDenials.filter(r => (r.Claim_Status || "").toLowerCase().trim() === "denied").length;
    const totalDenialRows = safeDenials.length;
    const denialRate = totalDenialRows > 0 ? (deniedCount / totalDenialRows) * 100 : 0;
    
    const firstPassClaimsCount = safeDenials.filter(r => r.Is_First_Pass_Resolution).length;
    const firstPassRate = totalDenialRows > 0 ? (firstPassClaimsCount / totalDenialRows) * 100 : 0;
    
    const cleanClaimValues = safeCharges.map(r => Number(r.Is_Clean_Claim || 0)).filter(val => !isNaN(val) && val >= 0 && val <= 100);
    const gcr = totalBilled === 0 ? 0 : (totalPayments / totalBilled) * 100;
    const cleanClaimRate = cleanClaimValues.length > 0 ? cleanClaimValues.reduce((sum, val) => sum + val, 0) / cleanClaimValues.length : 0;
    const totalOpenAR = safeOpenAR.reduce((sum, r) => sum + (r.Open_AR_Amount || 0), 0);

    // --- NCR CALCULATION FROM NEW FILE ---
    // Using filteredNCR data to calculate NCR
    const ncrPaid = safeNcr.reduce((sum, r) => sum + (r.Paid_Amount || 0), 0);
    const ncrBilled = safeNcr.reduce((sum, r) => sum + (r.Billed_Amount || 0), 0);
    const ncrAdj = safeNcr.reduce((sum, r) => sum + (r.Adjustment_Amount || 0), 0);
    const netBilled = ncrBilled - ncrAdj;
    const ncr = netBilled > 0 ? (ncrPaid / netBilled) * 100 : 0;
    // -------------------------------------

    return { totalPayments, totalClaims, gcr, ncr, denialRate, firstPassRate, cleanClaimRate, totalDenials: deniedCount, totalOpenAR };
  };

  const currentKPIs = calculateKPIs(filteredCharges, filteredDenials, filteredOpenAR, filteredNCR);
  let prevKPIs;
  if (selectedClient === "all") prevKPIs = getAveragePrevKPIs();
  else prevKPIs = CLIENT_PREV_KPIS[selectedClient] || CLIENT_PREV_KPIS["entfw"];

  const trend = (current, previous, isIncreaseGood = true, decimals = 2) => {
    if (previous === 0 || !isFinite(previous)) return { percentChange: current.toFixed(decimals), arrow: "▲", color: "#6b7280", previousValue: "0", isPositive: true };
    const diff = current - previous;
    const isPositive = diff >= 0;
    const color = isPositive === isIncreaseGood ? "#10b981" : "#ef4444"; 
    return { 
        percentChange: Math.abs(diff).toFixed(decimals), 
        arrow: isPositive ? "▲" : "▼", 
        color, 
        previousValue: previous.toFixed(decimals), 
        isPositive 
    };
  };

  const kpisWithTrend = {
    gcr: trend(currentKPIs.gcr, prevKPIs.gcr, true),
    ncr: trend(currentKPIs.ncr, prevKPIs.ncr, true),
    denialRate: trend(currentKPIs.denialRate, prevKPIs.denialRate, false),
    firstPassRate: trend(currentKPIs.firstPassRate, prevKPIs.firstPassRate, true),
    cleanClaimRate: trend(currentKPIs.cleanClaimRate, prevKPIs.cleanClaimRate, true),
    totalClaims: trend(currentKPIs.totalClaims, prevKPIs.totalClaims, true, 0),
  };

  const getMonthlyChargesTrend = (fn) => Object.values(filteredCharges.reduce((acc, r) => {
      const month = r.month || "Unknown";
      if (!acc[month]) acc[month] = { vals: [], month };
      acc[month].vals.push(r);
      return acc;
    }, {})).map(d => ({ value: fn(d.vals), month: d.month }));

  // --- HELPER FOR NCR TREND ---
  const getMonthlyNCRTrend = (fn) => Object.values(filteredNCR.reduce((acc, r) => {
    const month = r.month || "Unknown";
    if (!acc[month]) acc[month] = { vals: [], month };
    acc[month].vals.push(r);
    return acc;
  }, {})).map(d => ({ value: fn(d.vals), month: d.month }));

  const getMonthlyDenialTrend = () => {
    if (filteredDenials.length === 0) return [];
    const monthlyData = filteredDenials.reduce((acc, r) => {
      const month = dayjs(r.Date_of_Service).format("MMM YY");
      if (!acc[month]) acc[month] = { denied: 0, totalDenials: 0 };
      if ((r.Claim_Status || "").toLowerCase().trim() === "denied") acc[month].denied++;
      acc[month].totalDenials++;
      return acc;
    }, {});
    return Object.keys(monthlyData).map(month => ({ value: monthlyData[month].totalDenials > 0 ? (monthlyData[month].denied / monthlyData[month].totalDenials) * 100 : 0, month })).sort((a, b) => dayjs(a.month, "MMM YY").valueOf() - dayjs(b.month, "MMM YY").valueOf());
  };

  const getMonthlyFPRTrend = () => {
      if (filteredDenials.length === 0) return [];
      const monthlyData = filteredDenials.reduce((acc, r) => {
        const month = dayjs(r.Date_of_Service).format("MMM YY");
        if (!acc[month]) acc[month] = { trueCount: 0, totalCount: 0 };
        if (r.Is_First_Pass_Resolution) acc[month].trueCount++;
        acc[month].totalCount++;
        return acc;
      }, {});
      return Object.keys(monthlyData).map(month => ({ value: monthlyData[month].totalCount > 0 ? (monthlyData[month].trueCount / monthlyData[month].totalCount) * 100 : 0, month })).sort((a, b) => dayjs(a.month, "MMM YY").valueOf() - dayjs(b.month, "MMM YY").valueOf());
  };

  const kpiSparklines = useMemo(() => ({
    gcr: getMonthlyChargesTrend(rows => { const p = rows.reduce((a, r) => a + (r.Paid_Amount || 0), 0); const b = rows.reduce((a, r) => a + (r.Billed_Amount || 0), 0); return b > 0 ? (p / b) * 100 : 0; }),
    // --- UPDATED NCR SPARKLINE TO USE NCR DATA ---
    ncr: getMonthlyNCRTrend(rows => { const p = rows.reduce((a, r) => a + (r.Paid_Amount || 0), 0); const al = rows.reduce((a, r) => a + ((r.Billed_Amount || 0) - (r.Adjustment_Amount || 0)), 0); return al > 0 ? (p / al) * 100 : 0; }),
    denialRate: getMonthlyDenialTrend(),
    firstPassRate: getMonthlyFPRTrend(),
    cleanClaimRate: getMonthlyChargesTrend(rows => { const v = rows.map(r => Number(r.Is_Clean_Claim || 0)).filter(val => !isNaN(val) && val >= 0 && val <= 100); return v.length > 0 ? v.reduce((s, val) => s + val, 0) / v.length : 0; }),
    totalClaims: getMonthlyChargesTrend(rows => rows.reduce((sum, r) => sum + Number(r.visit || 0), 0)),
  }), [filteredCharges, filteredDenials, filteredNCR]);

  const calculateLag = (data, dateKey1, dateKey2) => {
      const diffs = data.map(r => { const d1 = dayjs(r[dateKey1]); const d2 = dayjs(r[dateKey2]); return (d1.isValid() && d2.isValid()) ? d2.diff(d1, "day") : null; }).filter(d => d !== null && !isNaN(d));
      return diffs.length === 0 ? 0 : Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
  };
  const chargeLag = calculateLag(filteredCharges, "Date_of_Service", "Charge_Entry_Date");
  const billingLag = calculateLag(filteredDenials, "Date_of_Service", "Claim_Submission_Date");

  const mainChartData = useMemo(() => {
    const map = {};
    
    // Process Charges (GCR, CCR)
    filteredCharges.forEach(r => {
        const postedDate = dayjs(r.Charge_Entry_Date);
        if (!postedDate.isValid()) return;
        const month = postedDate.format("MMM YY");
        
        if (!map[month]) map[month] = { 
            paidSum: 0, billedSum: 0, adjustmentSum: 0, ccrSum: 0, ccrCount: 0, count: 0, 
            date: postedDate.startOf("month"), 
            fprTrueCount: 0, fprDenialCount: 0, deniedCount: 0, totalDenialRows: 0,
            // NCR specific accumulators
            ncrPaid: 0, ncrBilled: 0, ncrAdj: 0,
            target: Number(prevKPIs?.[`${selectedMetric.replace(" ", "_")}_Target`] || 0), 
            baseline: Number(prevKPIs?.[`${selectedMetric.replace(" ", "_")}_Baseline`] || 0) 
        };

        map[month].paidSum += r.Paid_Amount || 0; 
        map[month].billedSum += r.Billed_Amount || 0; 
        map[month].adjustmentSum += r.Adjustment_Amount || 0; 
        map[month].count++;
        
        const clean = Number(r.Is_Clean_Claim || 0);
        if (!isNaN(clean) && clean >= 0 && clean <= 100) { 
            map[month].ccrSum += clean; 
            map[month].ccrCount++; 
        }
    });

    // --- PROCESS NCR DATA separately for NCR metric ---
    filteredNCR.forEach(r => {
        const postedDate = dayjs(r.Charge_Entry_Date);
        if (!postedDate.isValid()) return;
        const month = postedDate.format("MMM YY");
        
        // Initialize if month missing
        if (!map[month]) map[month] = { 
            paidSum: 0, billedSum: 0, adjustmentSum: 0, ccrSum: 0, ccrCount: 0, count: 0, 
            date: postedDate.startOf("month"), 
            fprTrueCount: 0, fprDenialCount: 0, deniedCount: 0, totalDenialRows: 0,
            ncrPaid: 0, ncrBilled: 0, ncrAdj: 0,
            target: Number(prevKPIs?.[`${selectedMetric.replace(" ", "_")}_Target`] || 0), 
            baseline: Number(prevKPIs?.[`${selectedMetric.replace(" ", "_")}_Baseline`] || 0) 
        };

        map[month].ncrPaid += r.Paid_Amount || 0;
        map[month].ncrBilled += r.Billed_Amount || 0;
        map[month].ncrAdj += r.Adjustment_Amount || 0;
    });

    // Process Denials
    filteredDenials.forEach(r => {
          const d = dayjs(r.Date_of_Service); if(!d.isValid()) return; const m = d.format("MMM YY");
          
          if (!map[m]) map[m] = { 
              paidSum: 0, billedSum: 0, adjustmentSum: 0, ccrSum: 0, ccrCount: 0, count: 0, 
              date: d.startOf("month"), 
              fprTrueCount: 0, fprDenialCount: 0, deniedCount: 0, totalDenialRows: 0, 
              ncrPaid: 0, ncrBilled: 0, ncrAdj: 0,
              target: Number(prevKPIs?.[`${selectedMetric.replace(" ", "_")}_Target`] || 0), 
              baseline: Number(prevKPIs?.[`${selectedMetric.replace(" ", "_")}_Baseline`] || 0) 
          };

          if (map[m].totalDenialRows === undefined) map[m].totalDenialRows = 0;
          if (map[m].deniedCount === undefined) map[m].deniedCount = 0;
          if (map[m].fprTrueCount === undefined) map[m].fprTrueCount = 0;
          if (map[m].fprDenialCount === undefined) map[m].fprDenialCount = 0;

          map[m].totalDenialRows++;
          if ((r.Claim_Status || "").toLowerCase().trim() === "denied") map[m].deniedCount++;
          
          if (r.Is_First_Pass_Resolution) map[m].fprTrueCount++;
          map[m].fprDenialCount++;
    });

    let chartData = Object.entries(map).sort((a, b) => a[1].date.unix() - b[1].date.unix()).map(([month, obj]) => {
        let avgVal = 0;
        if (selectedMetric === "GCR" && obj.billedSum > 0) avgVal = (obj.paidSum / obj.billedSum) * 100;
        // --- UPDATE NCR CHART CALCULATION ---
        else if (selectedMetric === "NCR") {
             const net = obj.ncrBilled - obj.ncrAdj;
             if (net > 0) avgVal = (obj.ncrPaid / net) * 100;
        }
        else if (selectedMetric === "CCR") avgVal = obj.ccrCount > 0 ? obj.ccrSum / obj.ccrCount : (obj.target || 0);
        else if (selectedMetric === "FPR") avgVal = obj.fprDenialCount > 0 ? (obj.fprTrueCount / obj.fprDenialCount) * 100 : 0;
        else if (selectedMetric === "Denial Rate") avgVal = obj.totalDenialRows > 0 ? (obj.deniedCount / obj.totalDenialRows) * 100 : 0;
        return { month, avg: avgVal, target: obj.target, baseline: obj.baseline };
    });

    if (chartData.length === 1) {
        const p = chartData[0];
        chartData = [
            { ...p, month: "" },
            p,
            { ...p, month: " " }
        ];
    }

    return chartData;
  }, [filteredCharges, filteredDenials, filteredNCR, selectedMetric, prevKPIs]);

  const arDaysTrendData = useMemo(() => {
    if (filteredOpenAR.length === 0) return [];
    const monthlyData = filteredOpenAR.reduce((acc, r) => {
        const d = dayjs(r.Date_of_Service); if (!d.isValid()) return acc; const m = d.format("MMM YYYY");
        if (!acc[m]) acc[m] = { arDaysValues: [], date: d.startOf("month") };
        const val = Number(r.ar_days || 0); if (!isNaN(val) && val >= 0) acc[m].arDaysValues.push(val);
        return acc;
    }, {});
    let finalData = Object.entries(monthlyData).map(([m, obj]) => ({
        month: m, value: Math.round(obj.arDaysValues.length > 0 ? obj.arDaysValues.reduce((a, b) => a + b, 0) / obj.arDaysValues.length : 0)
    })).sort((a, b) => dayjs(a.month, "MMM YYYY").valueOf() - dayjs(b.month, "MMM YYYY").valueOf());

    if (finalData.length === 1) {
        const p = finalData[0];
        finalData = [
            { ...p, month: "" },
            p,
            { ...p, month: " " }
        ];
    }
    return finalData;
  }, [filteredOpenAR]);

  const avgArDays = useMemo(() => {
    if (filteredOpenAR.length === 0) return 0;
    const vals = filteredOpenAR.map(r => Number(r.ar_days || 0)).filter(v => !isNaN(v) && v >= 0);
    return vals.length === 0 ? 0 : Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [filteredOpenAR]);

  const arAgingPieData = useMemo(() => {
      const buckets = { "0-30 Days": 0, "31-60 Days": 0, "61-90 Days": 0, "90+ Days": 0 };
      const targetMonthStr = dayjs(endDate).format("MMM YY");
      const snapshotData = agingData.filter(row => row.month === targetMonthStr);

      snapshotData.forEach(item => {
          let age = Number(item.aging || 0); 
          let amt = Number(item.Aging_Amount || 0);
          if (isNaN(age) || age < 0 || isNaN(amt)) return;
          if (age <= 30) buckets["0-30 Days"] += amt; 
          else if (age <= 60) buckets["31-60 Days"] += amt; 
          else if (age <= 90) buckets["61-90 Days"] += amt; 
          else buckets["90+ Days"] += amt;
      });

      const total = Object.values(buckets).reduce((a, b) => a + b, 0);
      return Object.entries(buckets).map(([name, value]) => ({ 
          name, 
          value: total > 0 ? (value / total) * 100 : 0, 
          rawAmount: value 
      }));
  }, [agingData, endDate]);

  const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  const dateLabels = useMemo(() => {
      const start = dayjs(startDate); const end = dayjs(endDate);
      let d = end.diff(start, 'day') + 1; if(d <= 1) d = 1;
      let pe = start.subtract(1, 'day'); let ps = pe.clone().subtract(d - 1, 'day');
      if (!ps.isValid() || !pe.isValid()) { ps = start.clone().subtract(d, 'day'); pe = ps.clone().add(d - 1, 'day'); }
      return { current: `${start.format("MMM YY")} - ${end.format("MMM YY")}`, previous: `${ps.format("MMM YY")} - ${pe.format("MMM YY")}` };
  }, [startDate, endDate]);

  const pyramidChartData = useMemo(() => {
      const prevKPIsDynamic = calculateKPIs(prevCharges, prevDenials, prevOpenAR, prevNCR);
      return [
        { name: "GCR", current: currentKPIs.gcr, previous: prevKPIsDynamic.gcr },
        { name: "NCR", current: currentKPIs.ncr, previous: prevKPIsDynamic.ncr },
        { name: "CCR", current: currentKPIs.cleanClaimRate, previous: prevKPIsDynamic.cleanClaimRate },
        { name: "FPR", current: currentKPIs.firstPassRate, previous: prevKPIsDynamic.firstPassRate },
        { name: "Denial Rate", current: currentKPIs.denialRate, previous: prevKPIsDynamic.denialRate },
      ].map(i => ({ name: i.name, current: i.current, previous: -i.previous }));
  }, [currentKPIs, prevCharges, prevDenials, prevOpenAR, prevNCR]);

  const sideCardSparklines = useMemo(() => {
      const start = dayjs(startDate); const end = dayjs(endDate); const totalDays = end.diff(start, 'day') + 1;
      const segments = 6; const daysPerSegment = totalDays > 1 ? Math.ceil(totalDays / segments) : 1;
      const segmentDataCharges = Array(segments).fill().map(() => ({ payments: 0, chargeLags: [] }));
      const segmentDataDenials = Array(segments).fill().map(() => ({ billingLags: [] }));
      
      filteredCharges.forEach(r => {
        const d = dayjs(r.Charge_Entry_Date);
        if (d.isBetween(start, end, null, '[]')) {
            const idx = Math.min(Math.floor(d.diff(start, 'day') / daysPerSegment), segments - 1);
            segmentDataCharges[idx].payments += r.Paid_Amount || 0;
            if(r.Date_of_Service && r.Charge_Entry_Date) segmentDataCharges[idx].chargeLags.push(d.diff(dayjs(r.Date_of_Service), 'day'));
        }
      });
      filteredDenials.forEach(r => {
          const d = dayjs(r.Date_of_Service);
          if (d.isBetween(start, end, null, '[]')) {
              const idx = Math.min(Math.floor(d.diff(start, 'day') / daysPerSegment), segments - 1);
              if(r.Date_of_Service && r.Claim_Submission_Date) segmentDataDenials[idx].billingLags.push(dayjs(r.Claim_Submission_Date).diff(d, 'day'));
          }
      });
      return {
          paymentsData: segmentDataCharges.map(s => ({ value: s.payments, unit: 'amount' })),
          chargeLagData: segmentDataCharges.map(s => ({ value: s.chargeLags.length ? s.chargeLags.reduce((a,b)=>a+b,0)/s.chargeLags.length : 0, unit: 'days' })),
          billingLagData: segmentDataDenials.map(s => ({ value: s.billingLags.length ? s.billingLags.reduce((a,b)=>a+b,0)/s.billingLags.length : 0, unit: 'days' }))
      };
  }, [filteredCharges, filteredDenials, startDate, endDate]);

  const sideCardData = [
    { title: "Charge Lag", value: chargeLag, color: "#3b82f6", suffix: "days", sparklineData: sideCardSparklines.chargeLagData, hideTrend: true },
    { title: "Billing Lag", value: billingLag, color: "#8b5cf6", suffix: "days", sparklineData: sideCardSparklines.billingLagData, hideTrend: true },
    { 
        title: "Total Payments", 
        formattedValue: `${currentKPIs.totalPayments.toLocaleString()} (${formatCompactNumber(currentKPIs.totalPayments)})`, 
        value: currentKPIs.totalPayments, 
        trend: trend(currentKPIs.totalPayments, prevKPIs.totalPayments, true), 
        color: "#10b981", 
        prefix: "$", 
        sparklineData: sideCardSparklines.paymentsData, 
        link: "/totalpayment", 
        hideTrend: true 
    },
  ];

  // --- STYLES ---
  const styles = {
    container: { fontFamily: "'Inter', system-ui, -apple-system, sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", color: "#111827" },
    stickyHeader: { position: "sticky", top: 0, zIndex: 50, backgroundColor: "#f9fafb", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" },
    headerTitle: { fontSize: "20px", fontWeight: "700", color: "#1e3a8a", margin: 0, letterSpacing: "-0.5px" },
    headerSubtitle: { fontSize: "13px", color: "#6b7280", margin: 0 },
    controlGroup: { display: "flex", gap: "12px", alignItems: "center" },
    inputGroup: { display: "flex", flexDirection: "column", gap: "4px" },
    label: { fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", color: "#6b7280" },
    input: { padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", color: "#374151", backgroundColor: "#fff", transition: "all 0.2s" },
    uploadBtn: { padding: "8px 16px", borderRadius: "8px", border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, fontSize: "14px", cursor: "pointer", boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)", transition: "background 0.2s" },
    gridContainer: { padding: "20px", maxWidth: "1600px", margin: "0 auto", display: "grid", gap: "16px" },
    card: { backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", padding: "20px", transition: "transform 0.2s, box-shadow 0.2s", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" },
    kpiTitle: { fontSize: "13px", fontWeight: "600", color: "#6b7280", marginBottom: "4px" },
    kpiValue: { fontSize: "28px", fontWeight: "800", color: "#111827", letterSpacing: "-1px" },
    trendBadge: (isPositive, color) => ({ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "99px", fontSize: "11px", fontWeight: "600", backgroundColor: `${color}15`, color: color }),
    sparklineContainer: { width: "100px", height: "35px" },
    sectionTitle: { fontSize: "15px", fontWeight: "700", color: "#1f2937" },
    tabGroup: { display: "flex", backgroundColor: "#f3f4f6", padding: "3px", borderRadius: "6px", width: "fit-content" },
    tabBtn: (active) => ({ padding: "4px 12px", borderRadius: "4px", border: "none", background: active ? "#fff" : "transparent", color: active ? "#111827" : "#6b7280", fontWeight: active ? "600" : "500", fontSize: "12px", cursor: "pointer", boxShadow: active ? "0 1px 2px rgba(0,0,0,0.1)" : "none", transition: "all 0.2s ease" }),
    floatingBotBtn: { position: "fixed", bottom: 24, right: 24, width: 56, height: 56, borderRadius: "50%", background: "#2563eb", color: "#fff", fontSize: "28px", border: "none", boxShadow: "0 4px 12px rgba(37, 99, 235, 0.4)", zIndex: 1200, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s" }
  };

  return (
    <div style={styles.container}>
      <div style={styles.stickyHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <img src="/logo.png" alt="Logo" style={{ height: "40px", objectFit: "contain" }} onError={(e) => e.target.style.display = 'none'} />
          <div>
            <h2 style={styles.headerTitle}>RCM Dashboard</h2>
            <p style={styles.headerSubtitle}>Revenue Cycle Optimization</p>
          </div>
        </div>

        <div style={styles.controlGroup}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Period Start</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Period End</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Client</label>
            <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} style={styles.input}>
              <option value="all">All Clients</option>
              <option value="entfw">ENTFW</option>
              <option value="eca">ECA</option>
              <option value="soundhealth">Sound Health</option>
            </select>
          </div>
          
          <div style={{ marginLeft: "12px", position: "relative" }}>
             <input type="file" multiple accept=".csv" onChange={handleFileUpload} ref={fileInputRef} style={{ display: "none" }} />
             <button type="button" onClick={() => fileInputRef.current.click()} style={styles.uploadBtn}>Upload CSVs</button>
             {uploadError && (
                <div style={{ position: 'absolute', top: '45px', right: '0', background: '#fee2e2', color: '#ef4444', padding: '8px', borderRadius: '4px', fontSize: '12px', border: '1px solid #ef4444', whiteSpace: 'nowrap', zIndex: 60 }}>
                   {uploadError}
                </div>
             )}
          </div>
          <DropdownAvatar />
        </div>
      </div>

      <div style={styles.gridContainer}>
        {/* KPI Cards Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
           {[
            { title: "Gross Collection Rate", value: currentKPIs.gcr.toFixed(2), suffix: "%", trend: kpisWithTrend.gcr, spark: kpiSparklines.gcr, link: "/gcr", trendSuffix: "%" },
            { title: "Net Collection Rate", value: currentKPIs.ncr.toFixed(2), suffix: "%", trend: kpisWithTrend.ncr, spark: kpiSparklines.ncr, link: "/ncr", trendSuffix: "%" },
            { title: "Denial Rate", value: currentKPIs.denialRate.toFixed(2), suffix: "%", trend: kpisWithTrend.denialRate, spark: kpiSparklines.denialRate, link: "/denials", trendSuffix: "%" },
            { title: "First Pass Rate", value: currentKPIs.firstPassRate.toFixed(2), suffix: "%", trend: kpisWithTrend.firstPassRate, spark: kpiSparklines.firstPassRate, trendSuffix: "%" },
            { title: "Clean Claim Rate", value: currentKPIs.cleanClaimRate.toFixed(2), suffix: "%", trend: kpisWithTrend.cleanClaimRate, spark: kpiSparklines.cleanClaimRate, trendSuffix: "%" },
            { title: "Total Claims", value: Math.round(currentKPIs.totalClaims).toLocaleString(), suffix: "", trend: kpisWithTrend.totalClaims, spark: kpiSparklines.totalClaims, link: "/claims", trendSuffix: "" },
           ].map((kpi, idx) => (
             <Link to={kpi.link || "#"} key={idx} style={{ textDecoration: "none" }}>
               <div style={styles.card} 
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)"; }}>
                 
                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                   <div style={styles.kpiTitle}>{kpi.title}</div>
                   
                   <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                      <div style={styles.trendBadge(kpi.trend.isPositive, kpi.trend.color)}>
                        {kpi.trend.arrow} {kpi.trend.percentChange}{kpi.trendSuffix}
                      </div>
                      <div style={{ fontSize: "10px", color: "#9ca3af", whiteSpace: "nowrap" }}>
                        vs {kpi.trend.previousValue}
                      </div>
                   </div>
                 </div>

                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                   <div style={styles.kpiValue}>{kpi.value}{kpi.suffix}</div>
                   
                   <div style={{ width: "70px", height: "35px" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={kpi.spark}>
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke={kpi.trend.isPositive ? "#10b981" : "#ef4444"} 
                            fill={kpi.trend.isPositive ? "#d1fae5" : "#fee2e2"} 
                            strokeWidth={2} 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                   </div>
                 </div>
               </div>
             </Link>
           ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "16px" }}>
          
          <div style={styles.card}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
               <h3 style={styles.sectionTitle}>Performance Trends</h3>
               <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>
                   <div style={styles.tabGroup}>
                     {["GCR", "NCR", "Denial Rate", "CCR", "FPR"].map(m => (
                       <button key={m} onClick={() => setSelectedMetric(m)} style={styles.tabBtn(selectedMetric === m)}>
                         {m}
                       </button>
                     ))}
                   </div>
               </div>
             </div>
             
             <div style={{ height: "360px", width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mainChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={v => `${Math.round(v)}%`} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", padding: "8px" }} itemStyle={{ fontSize: "12px", fontWeight: "600" }} labelStyle={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }} />
                    <Line type="monotone" dataKey="avg" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 4, fill: "#fff", stroke: "#0ea5e9", strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                    <Line type="monotone" dataKey="target" stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="baseline" stroke="#8b5cf6" strokeDasharray="3 3" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
             </div>

             <div style={{ display: "flex", justifyContent: "center", marginTop: "4px", gap: "16px", fontSize: "12px", fontWeight: "500", color: "#374151" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0ea5e9" }}></div>Current Average</div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f43f5e" }}></div>Target</div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6" }}></div>Baseline</div>
             </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {sideCardData.map((card, idx) => (
              <Link to={card.link || "#"} key={idx} style={{ textDecoration: "none", flex: 1 }}>
                <div style={styles.card}>
                  <div>
                    <div style={styles.kpiTitle}>{card.title}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                      <span style={{ fontSize: "24px", fontWeight: "800", color: "#111827" }}>
                        {card.prefix}{card.formattedValue || Number(card.value).toLocaleString()}{card.suffix && <span style={{fontSize:"14px", marginLeft:"4px", fontWeight:"600", color:"#6b7280"}}>{card.suffix}</span>}
                      </span>
                    </div>
                    {!card.hideTrend && (
                        <div style={{ marginTop: "2px", fontSize: "12px", color: card.trend.color, fontWeight: "600" }}>
                           {card.trend.arrow} {card.trend.percentChange} vs prev
                        </div>
                    )}
                  </div>
                  <div style={{ height: "45px", marginTop: "12px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={card.sparklineData}>
                          <Bar dataKey="value" fill={card.color} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
           <div style={styles.card}>
              <div style={styles.kpiTitle}>AR Days Trend</div>
              <div style={styles.kpiValue}>{avgArDays} Days</div>
              <div style={{ height: "180px", marginTop: "12px" }}>
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={arDaysTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                     <CartesianGrid vertical={false} stroke="#f3f4f6" />
                     <XAxis 
                       dataKey="month" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fontSize: 10, fill: "#9ca3af" }} 
                       dy={10} 
                       interval="preserveStartEnd"
                     />
                     <YAxis 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fontSize: 10, fill: "#9ca3af" }} 
                     />
                     <Tooltip />
                     <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, fill: "#8b5cf6", strokeWidth: 2, stroke: "#fff"}} />
                   </LineChart>
                 </ResponsiveContainer>
              </div>
           </div>

           <div style={styles.card}>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                 <div style={styles.kpiTitle}>AR Aging Buckets</div>
                 <div style={{ fontSize: "11px", fontWeight: "600", color: "#6b7280" }}>
                    Till {dayjs(endDate).format("MMM YYYY")}
                 </div>
              </div>
              <div style={{ display: "flex", height: "200px", alignItems: "center" }}>
                 <div style={{ flex: 1, height: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                            data={arAgingPieData} 
                            cx="50%" 
                            cy="50%" 
                            innerRadius={60} 
                            outerRadius={80} 
                            paddingAngle={5} 
                            dataKey="value" 
                            stroke="none"
                        >
                          {arAgingPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(val, name, props) => [`$${props.payload.rawAmount.toLocaleString()}`, `${val.toFixed(1)}%`]} />
                      </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div style={{ flex: 0.8, display: "flex", flexDirection: "column", justifyContent: "center", gap: "10px", paddingRight: "10px" }}>
                    {arAgingPieData.map((entry, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[idx % PIE_COLORS.length], marginRight: 8 }}></div>
                            <span style={{ color: "#374151", fontWeight: "500" }}>{entry.name}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                            <span style={{ fontWeight: "700", color: "#111827" }}>${(entry.rawAmount || 0).toLocaleString()}</span>
                            <span style={{ fontSize: "10px", color: "#6b7280" }}>{entry.value.toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           <div style={styles.card}>
              <div style={styles.kpiTitle}>Period Comparison</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "#6b7280" }}>
                 <span>Prev: {dateLabels.previous}</span>
                 <span>Curr: {dateLabels.current}</span>
              </div>
              <div style={{ height: "180px" }}>
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={pyramidChartData} stackOffset="sign" barGap={0}>
                       <XAxis type="number" hide />
                       <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 10, fill: "#4b5563" }} axisLine={false} tickLine={false} />
                       <Tooltip cursor={{fill: 'transparent'}} content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div style={{ background: "#fff", padding: "8px", border: "1px solid #e5e7eb", borderRadius: "6px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                                <div style={{fontWeight:600, fontSize:"12px"}}>{payload[0].payload.name}</div>
                                <div style={{color:"#8b5cf6", fontSize:"12px"}}>Prev: {Math.abs(payload[0].payload.previous).toFixed(1)}%</div>
                                <div style={{color:"#3b82f6", fontSize:"12px"}}>Curr: {payload[0].payload.current.toFixed(1)}%</div>
                              </div>
                            );
                          } return null;
                       }}/>
                       <ReferenceLine x={0} stroke="#d1d5db" />
                       <Bar dataKey="previous" fill="#8b5cf6" barSize={10} radius={[4, 0, 0, 4]} />
                       <Bar dataKey="current" fill="#3b82f6" barSize={10} radius={[0, 4, 4, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
      </div>
      <button style={styles.floatingBotBtn} onClick={() => setAiBotOpen(true)} title="AI Assistant">🤖</button>
      <AiBotPopup open={aiBotOpen} onClose={() => setAiBotOpen(false)} />
    </div>
  );
}