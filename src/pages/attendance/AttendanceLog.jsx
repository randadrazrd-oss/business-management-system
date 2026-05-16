import React, { useState, useMemo, useRef } from "react";
import PageWrapper from "../../components/layout/PageWrapper";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import { useFirestore } from "../../hooks/useFirestore";
import { useTranslation } from "../../context/AppContext";
import { calculateWorkHours } from "../../utils/calculations";
import { toast, Toaster } from "react-hot-toast";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Save, Users, CheckCircle, XCircle, Clock, CalendarDays, Upload, FileText } from "lucide-react";

// ── Design tokens ───────────────────────────────────────────────────
const STATUS = {
  present:  { bg: "#DCFCE7", color: "#16A34A", dot: "#16A34A", label: "P" },
  absent:   { bg: "#FEE2E2", color: "#DC2626", dot: "#DC2626", label: "A" },
  late:     { bg: "#FEF9C3", color: "#CA8A04", dot: "#CA8A04", label: "L" },
  half_day: { bg: "#EEF2FF", color: "#4F46E5", dot: "#4F46E5", label: "H" },
};

const AttendanceLog = () => {
  const { t, language } = useTranslation();
  const { data: employees } = useFirestore("employees");
  const { data: attendance, addDocument, updateDocument } = useFirestore("attendance");

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedEmployeeForStats, setSelectedEmployeeForStats] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState([]);   // parsed rows ready to show
  const [importProcessing, setImportProcessing] = useState(false);
  const [importResult, setImportResult] = useState(null);   // { imported, updated, unmatched }
  const fileInputRef = useRef(null);
  const [cellData, setCellData] = useState({
    status: "present",
    checkIn: "09:00",
    checkOut: "17:00",
    notes: "",
  });

  const locale = language === "ar" ? ar : enUS;
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // ── Attendance map for fast lookup ──────────────────────────────
  const attendanceMap = useMemo(() => {
    const map = {};
    attendance.forEach((record) => {
      const dateStr = format(
        record.date.toDate ? record.date.toDate() : new Date(record.date),
        "yyyy-MM-dd"
      );
      if (!map[record.employeeId]) map[record.employeeId] = {};
      map[record.employeeId][dateStr] = record;
    });
    return map;
  }, [attendance]);

  // ── Monthly summary stats ────────────────────────────────────────
  const summary = useMemo(() => {
    let present = 0, absent = 0, late = 0, half = 0;
    const activeEmployeeIds = new Set(employees.filter(e => e.isActive !== false).map(e => e.id));
    
    attendance.forEach((r) => {
      if (!activeEmployeeIds.has(r.employeeId)) return;
      
      const d = r.date.toDate ? r.date.toDate() : new Date(r.date);
      if (
        d >= monthStart && d <= monthEnd
      ) {
        if (selectedEmployeeForStats && r.employeeId !== selectedEmployeeForStats) return;
        if (r.status === "present") present++;
        else if (r.status === "absent") absent++;
        else if (r.status === "late") late++;
        else if (r.status === "half_day") half++;
      }
    });
    return { present, absent, late, half };
  }, [attendance, currentMonth, selectedEmployeeForStats, monthStart, monthEnd, employees]);

  const handleCellClick = (employee, date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const existing = attendanceMap[employee.id]?.[dateStr];
    setSelectedCell({ employee, date });
    setCellData(
      existing
        ? { status: existing.status, checkIn: existing.checkIn || "09:00", checkOut: existing.checkOut || "17:00", notes: existing.notes || "" }
        : { status: "present", checkIn: "09:00", checkOut: "17:00", notes: "" }
    );
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedCell) return;
    const { employee, date } = selectedCell;
    const dateStr = format(date, "yyyy-MM-dd");
    const existing = attendanceMap[employee.id]?.[dateStr];
    const hoursData = calculateWorkHours(cellData.checkIn, cellData.checkOut, 8);
    const finalData = { employeeId: employee.id, date, ...cellData, ...hoursData };
    try {
      if (existing) await updateDocument(existing.id, finalData);
      else await addDocument(finalData);
      toast.success(t("successfullyUpdated"));
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ── Status pill cell ─────────────────────────────────────────────
  const StatusCell = ({ record }) => {
    if (!record) return (
      <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "#F5F5F8", margin: "0 auto" }} />
    );
    const s = STATUS[record.status] || STATUS.present;
    const isDevice = record.source === "device";

    // Build tooltip: show check-in / check-out times when available
    const tipParts = [];
    if (record.checkIn)  tipParts.push(`دخول: ${record.checkIn}`);
    if (record.checkOut) tipParts.push(`خروج: ${record.checkOut}`);
    if (isDevice)        tipParts.push("📱 تلقائي");
    const tooltip = tipParts.join(" | ") || undefined;

    return (
      <div
        title={tooltip}
        style={{
          width: "28px", height: "28px", borderRadius: "6px",
          background: s.bg, color: s.color,
          fontSize: "10px", fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto",
          letterSpacing: "0.02em",
          position: "relative",
          cursor: "pointer",
          outline: isDevice ? `1.5px solid ${s.dot}` : "none",
        }}
      >
        {s.label}
        {isDevice && (
          <span style={{
            position: "absolute", top: "-4px", right: "-4px",
            width: "8px", height: "8px", borderRadius: "50%",
            background: "#6366f1", border: "1.5px solid #fff",
          }} />
        )}
      </div>
    );
  };

  // ── Status selector button ───────────────────────────────────────
  const StatusOption = ({ status }) => {
    const s = STATUS[status];
    const active = cellData.status === status;
    return (
      <button
        onClick={() => setCellData({ ...cellData, status })}
        style={{
          padding: "10px 14px",
          borderRadius: "10px",
          border: active ? `1.5px solid ${s.color}` : "0.5px solid #E8E8EC",
          background: active ? s.bg : "#ffffff",
          color: active ? s.color : "#6B6B80",
          fontSize: "13px",
          fontWeight: active ? 600 : 400,
          cursor: "pointer",
          transition: "all 0.15s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
        }}
      >
        <span style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: active ? s.dot : "#D0D0D8",
          flexShrink: 0,
        }} />
        {t(status)}
      </button>
    );
  };

  const activeEmployees = employees.filter(e => e.isActive !== false);

  // ── USB / attlog.dat import ──────────────────────────────────────
  const determineStatusFromTime = (checkIn, checkOut) => {
    if (!checkIn) return "absent";
    const [h, m] = checkIn.split(":").map(Number);
    const totalMin = h * 60 + m;
    if (checkOut) {
      const [oh, om] = checkOut.split(":").map(Number);
      if ((oh * 60 + om - totalMin) / 60 < 4) return "half_day";
    }
    if (totalMin <= 9 * 60)  return "present";
    if (totalMin <= 11 * 60) return "late";
    return "half_day";
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      // Group all punches by userId + date, take earliest as check-in, latest as check-out
      const groups = {};
      for (const rawLine of text.split("\n")) {
        const line = rawLine.trim();
        if (!line) continue;
        // Split by tab; some devices space-pad columns
        const parts = line.split(/\t+/).map(p => p.trim()).filter(Boolean);
        if (parts.length < 2) continue;
        const userId = parts[0];
        if (!userId || isNaN(Number(userId))) continue;
        // DateTime may be one token "2026-05-13 08:55:00" or two tokens
        let dtStr = parts[1];
        if (!dtStr.includes(" ") && parts[2]) dtStr = `${parts[1]} ${parts[2]}`;
        const dt = new Date(dtStr.replace(" ", "T"));
        if (isNaN(dt.getTime())) continue;
        const dateStr = format(dt, "yyyy-MM-dd");
        const timeStr = format(dt, "HH:mm");
        const key = `${userId}_${dateStr}`;
        if (!groups[key]) groups[key] = { userId, dateStr, times: [] };
        groups[key].times.push(timeStr);
      }
      // Build preview rows with employee lookup
      const rows = Object.values(groups).map(({ userId, dateStr, times }) => {
        const sorted = [...times].sort();
        const checkIn  = sorted[0];
        const checkOut = sorted.length > 1 ? sorted[sorted.length - 1] : null;
        const emp = employees.find(e => String(e.zkUserId) === String(userId));
        return { userId, dateStr, checkIn, checkOut, emp, status: determineStatusFromTime(checkIn, checkOut) };
      });
      rows.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
      setImportPreview(rows);
      setImportResult(null);
      setIsImportModalOpen(true);
    };
    reader.readAsText(file);
    e.target.value = ""; // reset so same file can be re-selected
  };

  const handleImport = async () => {
    setImportProcessing(true);
    let imported = 0, updated = 0;
    const unmatched = [];
    for (const { userId, dateStr, checkIn, checkOut, emp, status } of importPreview) {
      if (!emp) { if (!unmatched.includes(userId)) unmatched.push(userId); continue; }
      const hoursData = checkOut ? calculateWorkHours(checkIn, checkOut, 8) : { actualHours: 0, overtimeHours: 0, lateMinutes: 0 };
      const recordData = { employeeId: emp.id, date: new Date(dateStr), status, checkIn: checkIn || "", checkOut: checkOut || "", notes: "", source: "device", ...hoursData };
      const existing = attendanceMap[emp.id]?.[dateStr];
      try {
        if (existing) { await updateDocument(existing.id, recordData); updated++; }
        else           { await addDocument(recordData); imported++; }
      } catch (_) {}
    }
    setImportResult({ imported, updated, unmatched });
    setImportProcessing(false);
  };

  return (
    <PageWrapper title={t("attendance")}>
      <Toaster position="top-center" />

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 500, color: "#1a1a2e" }}>{t("attendance")}</h1>
          <p style={{ fontSize: "13px", color: "#9090A8", marginTop: "3px" }}>
            {language === "ar" ? "دفتر حضور الموظفين الشهري" : "Monthly employee attendance register"}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* USB import button */}
          <input ref={fileInputRef} type="file" accept=".dat,.txt,.log" style={{ display: "none" }} onChange={handleFileSelect} />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
          >
            <Upload size={14} strokeWidth={1.75} />
            {language === "ar" ? "استيراد من فلاشة" : "Import from USB"}
          </Button>

        {/* Month navigator */}
        <div style={{
          display: "flex", alignItems: "center", gap: "4px",
          background: "#ffffff", borderRadius: "20px",
          border: "0.5px solid #E8E8EC", padding: "4px",
        }}>
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            style={{ width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", color: "#6B6B80", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
          <span style={{ minWidth: "150px", textAlign: "center", fontSize: "14px", fontWeight: 500, color: "#1a1a2e" }}>
            {format(currentMonth, "MMMM yyyy", { locale })}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            style={{ width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", color: "#6B6B80", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
        </div>
        </div>
      </div>

      {/* ── Summary stat strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          { label: language === "ar" ? "حاضر" : "Present",  value: summary.present, bg: "#DCFCE7", color: "#16A34A", icon: <CheckCircle size={16} strokeWidth={1.75} /> },
          { label: language === "ar" ? "غائب" : "Absent",   value: summary.absent,  bg: "#FEE2E2", color: "#DC2626", icon: <XCircle size={16} strokeWidth={1.75} /> },
          { label: language === "ar" ? "متأخر" : "Late",    value: summary.late,    bg: "#FEF9C3", color: "#CA8A04", icon: <Clock size={16} strokeWidth={1.75} /> },
          { label: language === "ar" ? "نصف يوم" : "Half",  value: summary.half,    bg: "#EEF2FF", color: "#4F46E5", icon: <CalendarDays size={16} strokeWidth={1.75} /> },
        ].map((s) => (
          <div key={s.label} style={{
            background: "#ffffff", borderRadius: "14px", border: "0.5px solid #E8E8EC",
            padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px",
          }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <p style={{ fontSize: "11px", color: "#9090A8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
              <p style={{ fontSize: "22px", fontWeight: 500, color: "#1a1a2e", lineHeight: 1.1, marginTop: "2px" }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Legend ── */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "12px", flexWrap: "wrap" }}>
        {Object.entries(STATUS).map(([key, s]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "18px", height: "18px", borderRadius: "4px", background: s.bg, color: s.color, fontSize: "9px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.label}</div>
            <span style={{ fontSize: "12px", color: "#6B6B80" }}>{t(key)}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "18px", height: "18px", borderRadius: "4px", background: "#F5F5F8" }} />
          <span style={{ fontSize: "12px", color: "#6B6B80" }}>{language === "ar" ? "لم يسجَّل" : "Not recorded"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ position: "relative", width: "18px", height: "18px" }}>
            <div style={{ width: "18px", height: "18px", borderRadius: "4px", background: "#DCFCE7", border: "1.5px solid #16A34A" }} />
            <div style={{ position: "absolute", top: "-3px", right: "-3px", width: "7px", height: "7px", borderRadius: "50%", background: "#6366f1", border: "1px solid #fff" }} />
          </div>
          <span style={{ fontSize: "12px", color: "#6B6B80" }}>{language === "ar" ? "تلقائي (جهاز البصمة)" : "Auto (fingerprint device)"}</span>
        </div>
      </div>

      {/* ── Attendance grid ── */}
      <div style={{ background: "#ffffff", borderRadius: "14px", border: "0.5px solid #E8E8EC", overflow: "hidden" }}>
        <div style={{ overflowX: "auto", maxHeight: "65vh", overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right", minWidth: "800px" }}>
            {/* Header */}
            <thead style={{ position: "sticky", top: 0, zIndex: 20, background: "#FAFAFA" }}>
              <tr>
                {/* Sticky employee name col */}
                <th style={{
                  padding: "12px 16px", position: "sticky", right: 0, zIndex: 30,
                  background: "#FAFAFA", borderBottom: "0.5px solid #E8E8EC", borderRight: "0.5px solid #E8E8EC",
                  fontSize: "11px", fontWeight: 500, color: "#9090A8", textTransform: "uppercase", letterSpacing: "0.06em",
                  minWidth: "180px", whiteSpace: "nowrap",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Users size={13} strokeWidth={1.75} />
                    {t("employee")}
                  </div>
                </th>
                {daysInMonth.map((day) => {
                  const weekend = day.getDay() === 5 || day.getDay() === 6; // Fri/Sat
                  const today = isToday(day);
                  return (
                    <th key={day.toString()} style={{
                      padding: "8px 4px", minWidth: "38px", maxWidth: "38px",
                      borderBottom: "0.5px solid #E8E8EC", borderRight: "0.5px solid #F0F0F4",
                      textAlign: "center",
                      background: today ? "#EEF2FF" : weekend ? "#FAFAFA" : "#FAFAFA",
                    }}>
                      <div style={{ fontSize: "9px", color: today ? "#4F46E5" : "#9090A8", fontWeight: 500 }}>
                        {format(day, "EEE", { locale }).slice(0, 2)}
                      </div>
                      <div style={{
                        fontSize: "12px", fontWeight: today ? 700 : 500,
                        color: today ? "#4F46E5" : weekend ? "#D0D0D8" : "#1a1a2e",
                        marginTop: "2px",
                      }}>
                        {format(day, "d")}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {activeEmployees.length === 0 && (
                <tr>
                  <td colSpan={daysInMonth.length + 1} style={{ padding: "48px", textAlign: "center", color: "#9090A8", fontSize: "14px" }}>
                    {language === "ar" ? "لا يوجد موظفون نشطون" : "No active employees"}
                  </td>
                </tr>
              )}
              {activeEmployees.map((emp, rowIdx) => (
                <tr
                  key={emp.id}
                  style={{ background: rowIdx % 2 === 0 ? "#ffffff" : "#FDFDFE" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F9F9FB"}
                  onMouseLeave={e => e.currentTarget.style.background = rowIdx % 2 === 0 ? "#ffffff" : "#FDFDFE"}
                >
                  {/* Sticky name cell */}
                  <td 
                    onClick={() => setSelectedEmployeeForStats(prev => prev === emp.id ? null : emp.id)}
                    style={{
                    padding: "10px 16px", position: "sticky", right: 0, zIndex: 10,
                    borderRight: "0.5px solid #E8E8EC", borderBottom: "0.5px solid #F0F0F4",
                    background: selectedEmployeeForStats === emp.id ? "#F0F0F6" : "inherit", whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{
                        width: "30px", height: "30px", borderRadius: "50%",
                        background: ["#DCFCE7","#EEF2FF","#FEF9C3","#FEE2E2"][rowIdx % 4],
                        color: ["#16A34A","#4F46E5","#CA8A04","#DC2626"][rowIdx % 4],
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "12px", fontWeight: 600, flexShrink: 0,
                      }}>
                        {(language === "ar" ? emp.nameAr : emp.name)?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a2e", lineHeight: 1.1 }}>
                          {language === "ar" ? emp.nameAr : emp.name}
                        </p>
                        {emp.jobTitle && (
                          <p style={{ fontSize: "11px", color: "#9090A8", marginTop: "1px" }}>{emp.jobTitle}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Day cells */}
                  {daysInMonth.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const record = attendanceMap[emp.id]?.[dateStr];
                    const weekend = day.getDay() === 5 || day.getDay() === 6;
                    const today = isToday(day);
                    return (
                      <td
                        key={`${emp.id}-${dateStr}`}
                        onClick={() => handleCellClick(emp, day)}
                        style={{
                          padding: "5px 4px",
                          borderRight: "0.5px solid #F0F0F4",
                          borderBottom: "0.5px solid #F0F0F4",
                          textAlign: "center",
                          cursor: "pointer",
                          background: today ? "#F5F5FF" : weekend ? "#FAFAFA" : "transparent",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "#EEF2FF"}
                        onMouseLeave={e => e.currentTarget.style.background = today ? "#F5F5FF" : weekend ? "#FAFAFA" : "transparent"}
                      >
                        <StatusCell record={record} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── USB Import modal ── */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => { setIsImportModalOpen(false); setImportPreview([]); setImportResult(null); }}
        title={language === "ar" ? "استيراد بيانات البصمة من الفلاشة" : "Import Attendance from USB"}
        footer={
          importResult ? (
            <Button onClick={() => { setIsImportModalOpen(false); setImportPreview([]); setImportResult(null); }}>
              {language === "ar" ? "إغلاق" : "Close"}
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => { setIsImportModalOpen(false); setImportPreview([]); }} disabled={importProcessing}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={handleImport} disabled={importProcessing || importPreview.length === 0} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Upload size={14} strokeWidth={1.75} />
                {importProcessing
                  ? (language === "ar" ? "جارٍ الاستيراد..." : "Importing...")
                  : (language === "ar" ? `استيراد ${importPreview.length} سجل` : `Import ${importPreview.length} records`)}
              </Button>
            </>
          )
        }
      >
        {importResult ? (
          // ── Result screen ──
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ background: "#DCFCE7", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                <p style={{ fontSize: "28px", fontWeight: 700, color: "#16A34A" }}>{importResult.imported}</p>
                <p style={{ fontSize: "12px", color: "#16A34A", fontWeight: 500 }}>{language === "ar" ? "سجل جديد" : "New records"}</p>
              </div>
              <div style={{ background: "#EEF2FF", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                <p style={{ fontSize: "28px", fontWeight: 700, color: "#4F46E5" }}>{importResult.updated}</p>
                <p style={{ fontSize: "12px", color: "#4F46E5", fontWeight: 500 }}>{language === "ar" ? "سجل محدَّث" : "Updated records"}</p>
              </div>
            </div>
            {importResult.unmatched.length > 0 && (
              <div style={{ background: "#FEF9C3", borderRadius: "10px", padding: "14px 16px", border: "0.5px solid #FDE047" }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#854D0E", marginBottom: "6px" }}>
                  {language === "ar" ? "⚠ معرفات غير مرتبطة بموظف:" : "⚠ User IDs with no matching employee:"}
                </p>
                <p style={{ fontSize: "13px", color: "#854D0E", fontFamily: "monospace" }}>
                  {importResult.unmatched.join(", ")}
                </p>
                <p style={{ fontSize: "11px", color: "#92400E", marginTop: "6px" }}>
                  {language === "ar"
                    ? "افتح ملف الموظف وأضف رقم ZK User ID المناسب ثم أعد الاستيراد."
                    : "Open the employee profile and set the matching ZK User ID, then re-import."}
                </p>
              </div>
            )}
          </div>
        ) : (
          // ── Preview screen ──
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#F0F0F6", borderRadius: "10px", padding: "12px 16px" }}>
              <FileText size={18} strokeWidth={1.75} color="#6B6B80" />
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a2e" }}>
                  {language === "ar" ? `تم العثور على ${importPreview.length} سجل حضور` : `Found ${importPreview.length} attendance records`}
                </p>
                <p style={{ fontSize: "11px", color: "#9090A8", marginTop: "2px" }}>
                  {language === "ar"
                    ? `${importPreview.filter(r => r.emp).length} موظف مرتبط، ${importPreview.filter(r => !r.emp).length} غير مرتبط`
                    : `${importPreview.filter(r => r.emp).length} matched, ${importPreview.filter(r => !r.emp).length} unmatched`}
                </p>
              </div>
            </div>
            <div style={{ maxHeight: "340px", overflowY: "auto", borderRadius: "10px", border: "0.5px solid #E8E8EC" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead style={{ position: "sticky", top: 0, background: "#FAFAFA" }}>
                  <tr>
                    {[
                      language === "ar" ? "الموظف" : "Employee",
                      language === "ar" ? "التاريخ" : "Date",
                      language === "ar" ? "دخول" : "In",
                      language === "ar" ? "خروج" : "Out",
                      language === "ar" ? "الحالة" : "Status",
                    ].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "right", color: "#9090A8", fontWeight: 500, borderBottom: "0.5px solid #E8E8EC" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importPreview.map((row, i) => {
                    const s = STATUS[row.status] || STATUS.present;
                    return (
                      <tr key={i} style={{ borderBottom: "0.5px solid #F0F0F4", background: row.emp ? "transparent" : "#FFF8F0" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 500, color: row.emp ? "#1a1a2e" : "#DC2626" }}>
                          {row.emp ? (language === "ar" ? row.emp.nameAr : row.emp.name) : `ID: ${row.userId} ⚠`}
                        </td>
                        <td style={{ padding: "8px 12px", color: "#6B6B80", fontFamily: "monospace" }}>{row.dateStr}</td>
                        <td style={{ padding: "8px 12px", color: "#1a1a2e", fontFamily: "monospace" }}>{row.checkIn || "—"}</td>
                        <td style={{ padding: "8px 12px", color: "#6B6B80", fontFamily: "monospace" }}>{row.checkOut || "—"}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: s.bg, color: s.color }}>
                            {t(row.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Attendance modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          selectedCell
            ? `${language === "ar" ? selectedCell.employee.nameAr : selectedCell.employee.name} — ${format(selectedCell.date, "d MMMM yyyy", { locale })}`
            : ""
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Save size={15} strokeWidth={1.75} />
              {t("save")}
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Date info strip */}
          {selectedCell && (
            <div style={{
              display: "flex", gap: "10px",
            }}>
              <div style={{ flex: 1, background: "#F9F9FB", borderRadius: "10px", border: "0.5px solid #E8E8EC", padding: "12px 16px", textAlign: "center" }}>
                <p style={{ fontSize: "11px", color: "#9090A8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{t("todayDate")}</p>
                <p style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a2e" }}>{format(selectedCell.date, "dd/MM/yyyy")}</p>
              </div>
              <div style={{ flex: 1, background: "#F9F9FB", borderRadius: "10px", border: "0.5px solid #E8E8EC", padding: "12px 16px", textAlign: "center" }}>
                <p style={{ fontSize: "11px", color: "#9090A8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{t("dayOfWeek")}</p>
                <p style={{ fontSize: "14px", fontWeight: 500, color: "#1a1a2e" }}>{format(selectedCell.date, "EEEE", { locale })}</p>
              </div>
            </div>
          )}

          {/* Status selector */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "#9090A8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
              {t("attendanceStatus")}
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {["present", "absent", "late", "half_day"].map((status) => (
                <StatusOption key={status} status={status} />
              ))}
            </div>
          </div>

          {/* Time inputs — only for relevant statuses */}
          {["present", "late", "half_day"].includes(cellData.status) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t("checkInTime")}
                type="time"
                value={cellData.checkIn}
                onChange={(e) => setCellData({ ...cellData, checkIn: e.target.value })}
              />
              <Input
                label={t("checkOutTime")}
                type="time"
                value={cellData.checkOut}
                onChange={(e) => setCellData({ ...cellData, checkOut: e.target.value })}
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "#9090A8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
              {t("notes")}
            </label>
            <textarea
              value={cellData.notes}
              onChange={(e) => setCellData({ ...cellData, notes: e.target.value })}
              rows={2}
              placeholder={language === "ar" ? "ملاحظة اختيارية..." : "Optional note..."}
              style={{
                width: "100%", background: "#F0F0F6", border: "none", borderRadius: "10px",
                padding: "10px 14px", fontSize: "13px", color: "#1a1a2e", fontFamily: "inherit",
                outline: "none", resize: "vertical", boxSizing: "border-box",
              }}
            />
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
};

export default AttendanceLog;
