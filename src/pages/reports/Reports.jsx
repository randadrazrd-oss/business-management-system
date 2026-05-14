import React, { useState, useMemo } from "react";
import PageWrapper from "../../components/layout/PageWrapper";
import DataTable from "../../components/ui/DataTable";
import Button from "../../components/ui/Button";
import { useFirestore } from "../../hooks/useFirestore";
import { useTranslation } from "../../context/AppContext";
import { Printer, FileText, Download, PieChart, TrendingUp, Users, Wallet, Activity, CreditCard, Layers, ChevronLeft, ChevronRight } from "lucide-react";
import { format, isSameMonth, isSameYear, addMonths, subMonths, addYears, subYears } from "date-fns";
import { ar, enUS } from "date-fns/locale";

const Reports = () => {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState("financial");
  const [isPdfMode, setIsPdfMode] = useState(false);

  const { data: revenues } = useFirestore("revenues");
  const { data: expenses } = useFirestore("expenses");
  const { data: payroll } = useFirestore("payroll");
  const { data: pettyCash } = useFirestore("petty_cash");
  const { data: employees } = useFirestore("employees");

  const locale = language === "ar" ? ar : enUS;

  const tabs = [
    { id: "financial", label: language === "ar" ? "التقرير المالي العام" : "Financial Overview", icon: <TrendingUp size={16} strokeWidth={1.75} /> },
    { id: "revenues", label: language === "ar" ? "إيرادات المركز" : "Revenues", icon: <CreditCard size={16} strokeWidth={1.75} /> },
    { id: "payroll", label: language === "ar" ? "رواتب الموظفين" : "Payroll", icon: <Users size={16} strokeWidth={1.75} /> },
    { id: "petty", label: language === "ar" ? "العهد والمصروفات" : "Petty Cash", icon: <Wallet size={16} strokeWidth={1.75} /> },
  ];

  // Helper to format currency
  const fmt = (val) => `${(val || 0).toLocaleString()} ج.م`;

  const [periodType, setPeriodType] = useState("month");
  const [reportDate, setReportDate] = useState(new Date());
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const stats = useMemo(() => {
    const now = reportDate;

    const isMatch = (d) => {
      if (periodType === 'all') return true;
      if (periodType === 'year') return isSameYear(d, now);
      if (periodType === 'month') return isSameMonth(d, now);
      
      const timeD = d.getTime();
      const currentNow = new Date();
      
      if (periodType === '3months') {
        const start = subMonths(currentNow, 3).getTime();
        return timeD >= start && timeD <= currentNow.getTime();
      }
      if (periodType === '6months') {
        const start = subMonths(currentNow, 6).getTime();
        return timeD >= start && timeD <= currentNow.getTime();
      }
      if (periodType === 'custom') {
        const s = new Date(startDate).getTime();
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        return timeD >= s && timeD <= e.getTime();
      }
      return false;
    };

    const currentRevenues = revenues.filter(r => {
      if (!r.date) return false;
      const d = new Date(r.date.toDate ? r.date.toDate() : r.date);
      if (isMatch(d)) return true;
      if (r.isRecurring && d < now) return true;
      return false;
    });

    const currentExpenses = expenses.filter(e => {
      if (!e.date) return false;
      return isMatch(new Date(e.date.toDate ? e.date.toDate() : e.date));
    });

    const currentPettySpends = pettyCash.filter(p => {
      if (p.type !== 'spend') return false;
      if (p.isLinkedToExpense) return false; // Prevent double counting
      if (!p.date) return false;
      return isMatch(new Date(p.date.toDate ? p.date.toDate() : p.date));
    });

    const totalRev = currentRevenues.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const totalExp = currentExpenses.reduce((sum, e) => sum + (e.amount || 0), 0) + currentPettySpends.reduce((sum, p) => sum + (p.amount || 0), 0);
    const currentPayroll = payroll.filter(p => {
      // Only include payroll for employees that currently exist
      const empExists = employees.some(e => e.id === p.employeeId);
      if (!empExists) return false;
      if (periodType === 'all') return true;
      
      const currentMonthStr = format(now, 'yyyy-MM');
      const currentYearStr = format(now, 'yyyy');
      if (periodType === 'month' && p.month && p.month !== currentMonthStr) return false;
      if (periodType === 'year' && p.month && !p.month.startsWith(currentYearStr)) return false;
      if (['3months', '6months', 'custom'].includes(periodType)) {
        if (!p.month) return false;
        // Payroll month is YYYY-MM. We parse it to the first of the month
        const pDate = new Date(`${p.month}-01`);
        return isMatch(pDate);
      }
      return true;
    });

    return { 
      totalRev, 
      totalExp, 
      netProfit: totalRev - totalExp, 
      currentRevenues, 
      currentExpenses, 
      currentPetty: currentPettySpends,
      currentPettyAll: pettyCash.filter(p => {
        if (!p.date) return false;
        return isMatch(new Date(p.date.toDate ? p.date.toDate() : p.date));
      }),
      currentPayroll 
    };
  }, [revenues, expenses, pettyCash, payroll, employees, periodType, reportDate, startDate, endDate]);

  return (
    <PageWrapper title={t("reports")}>
      <div className="no-print">
        {/* ── Page header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 500, color: "#1a1a2e" }}>{t("reports")}</h1>
            <p style={{ fontSize: "13px", color: "#9090A8", marginTop: "3px" }}>
              {language === "ar" ? "تصدير واستخراج التقارير المالية والإدارية للمركز" : "Export and view financial and administrative reports"}
            </p>
          </div>
          
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <select 
                className="input !py-2 !text-sm border-none" 
                value={periodType} 
                onChange={(e) => setPeriodType(e.target.value)}
                style={{ borderRadius: "20px", outline: "none", fontWeight: 600, color: "#1a1a2e", background: "#ffffff", border: "0.5px solid #E8E8EC", minWidth: "120px" }}
              >
                <option value="month">{language === 'ar' ? 'شهر محدد' : 'Month'}</option>
                <option value="3months">{language === 'ar' ? 'آخر 3 أشهر' : 'Last 3 Months'}</option>
                <option value="6months">{language === 'ar' ? 'آخر 6 أشهر' : 'Last 6 Months'}</option>
                <option value="year">{language === 'ar' ? 'سنة كاملة' : 'Year'}</option>
                <option value="custom">{language === 'ar' ? 'فترة مخصصة' : 'Custom Range'}</option>
                <option value="all">{language === 'ar' ? 'كل الوقت' : 'All Time'}</option>
              </select>

              {(periodType === 'month' || periodType === 'year') && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  background: "#ffffff", borderRadius: "20px",
                  border: "0.5px solid #E8E8EC", padding: "4px",
                }}>
                  <button
                    onClick={() => setReportDate(periodType === 'year' ? subYears(reportDate, 1) : subMonths(reportDate, 1))}
                    style={{ width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", color: "#6B6B80", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <ChevronRight size={16} strokeWidth={2} className={language === 'en' ? 'rotate-180' : ''} />
                  </button>
                  <span style={{ minWidth: "140px", textAlign: "center", fontSize: "14px", fontWeight: 600, color: "#1a1a2e" }}>
                    {periodType === 'year' ? format(reportDate, "yyyy") : format(reportDate, "MMMM yyyy", { locale })}
                  </span>
                  <button
                    onClick={() => setReportDate(periodType === 'year' ? addYears(reportDate, 1) : addMonths(reportDate, 1))}
                    style={{ width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", color: "#6B6B80", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <ChevronLeft size={16} strokeWidth={2} className={language === 'en' ? 'rotate-180' : ''} />
                  </button>
                </div>
              )}

              {periodType === 'custom' && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#ffffff", padding: "4px 12px", borderRadius: "20px", border: "0.5px solid #E8E8EC" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B6B80" }}>{language === 'ar' ? 'من' : 'From'}</span>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    style={{ border: "none", outline: "none", fontSize: "13px", fontWeight: 500, color: "#1a1a2e", background: "transparent" }}
                  />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B6B80" }}>{language === 'ar' ? 'إلى' : 'To'}</span>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    style={{ border: "none", outline: "none", fontSize: "13px", fontWeight: 500, color: "#1a1a2e", background: "transparent" }}
                  />
                </div>
              )}
            </div>

            <Button
              type="button"
              disabled={isPdfMode}
              onClick={async () => {
                setIsPdfMode(true);
                // Wait for React to re-render the full report layout
                await new Promise(r => setTimeout(r, 300));
                // Wait for Cairo font to fully load so Arabic text shapes correctly
                await document.fonts.ready;
                // Use browser's native print — handles Arabic shaping perfectly
                window.onafterprint = () => setIsPdfMode(false);
                window.print();
              }}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Download size={15} strokeWidth={1.75} />
              {isPdfMode ? (language === "ar" ? "جاري التصدير..." : "Exporting...") : (language === "ar" ? "تصدير PDF" : "Export PDF")}
            </Button>
          </div>
        </div>

        {/* ── Tabs Menu ── */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px",
          background: "#ffffff", padding: "8px", borderRadius: "16px", border: "0.5px solid #E8E8EC",
          width: "fit-content",
        }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "10px 18px", borderRadius: "10px",
                  fontSize: "13px", fontWeight: isActive ? 600 : 500,
                  background: isActive ? "#F0F0F6" : "transparent",
                  color: isActive ? "#1a1a2e" : "#6B6B80",
                  border: "none", cursor: "pointer", transition: "all 0.15s",
                }}
              >
                <div style={{ color: isActive ? "#2563EB" : "#9090A8", display: "flex" }}>
                  {tab.icon}
                </div>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Report Content Area ── */}
      <div id="report-content" className="print-area relative min-h-screen flex flex-col" style={isPdfMode ? { padding: '20px', background: 'white', color: 'black' } : {}}>
        {/* Print Header (Only visible when printing or exporting) */}
        <div className={`${isPdfMode ? 'block' : 'hidden print:block'} mb-10 border-b-2 border-[#1a1a2e] pb-6`}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
               <div style={{ width: "60px", height: "60px", background: "#1a1a2e", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                 <Layers size={32} strokeWidth={1.5} color="#ffffff" />
               </div>
               <div>
                 <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#1a1a2e", letterSpacing: "-0.02em", marginBottom: "4px" }}>
                   {language === "ar" ? "مركز التأهيل لذوي الاحتياجات الخاصة" : "Rehab Center"}
                 </h1>
                 <p style={{ fontSize: "14px", color: "#6B6B80", fontWeight: 500 }}>
                   {language === "ar" ? "إدارة الشؤون المالية والإدارية" : "Finance & Administration"}
                 </p>
               </div>
            </div>
            <div style={{ textAlign: "left", background: "#F5F5F5", padding: "12px 16px", borderRadius: "8px", border: "1px solid #E8E8EC" }}>
              <p style={{ fontSize: "12px", color: "#6B6B80", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
                {language === "ar" ? "رقم المرجع" : "Ref No"}
              </p>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a2e", fontFamily: "monospace" }}>
                REP-{format(new Date(), "yyyyMMdd")}-{Math.floor(Math.random() * 1000)}
              </p>
            </div>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <p className={`${isPdfMode ? 'hidden' : 'no-print'}`} style={{ fontSize: "18px", fontWeight: 700, color: "#2563EB", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {tabs.find(t => t.id === activeTab).label}
              </p>
              <p className={`${isPdfMode ? 'block' : 'hidden print:block'}`} style={{ fontSize: "18px", fontWeight: 700, color: "#2563EB", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {language === "ar" ? "التقرير المالي الشامل" : "Comprehensive Financial Report"}
              </p>
            </div>
            <div style={{ textAlign: "left" }}>
              <p style={{ fontSize: "12px", color: "#9090A8", marginBottom: "2px" }}>
                {language === "ar" ? "تاريخ الإصدار" : "Issue Date"}
              </p>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a2e" }}>
                {format(new Date(), "dd MMMM yyyy, HH:mm", { locale })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-grow space-y-12">
        <div className={activeTab === "financial" || isPdfMode ? "block" : "hidden print:block"}>
          <div className={`${isPdfMode ? 'flex' : 'hidden print:flex'} mb-6 pb-2 border-b-2 border-[#E8E8EC]`}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a2e" }}>{language === "ar" ? "التقرير المالي العام" : "Financial Overview"}</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px", animation: "fadeIn 0.3s ease" }}>
            {/* KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))", gap: "16px" }}>
              <div style={{ background: "#ffffff", borderRadius: "14px", border: "0.5px solid #E8E8EC", padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#DCFCE7", color: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <TrendingUp size={16} strokeWidth={2} />
                  </div>
                  <p style={{ fontSize: "12px", fontWeight: 500, color: "#9090A8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {language === "ar" ? "إجمالي الإيرادات" : "Total Revenues"}
                  </p>
                </div>
                <p style={{ fontSize: "32px", fontWeight: 500, color: "#1a1a2e", lineHeight: 1 }}>
                  {fmt(stats.totalRev)}
                </p>
              </div>

              <div style={{ background: "#ffffff", borderRadius: "14px", border: "0.5px solid #E8E8EC", padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#FEE2E2", color: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Activity size={16} strokeWidth={2} />
                  </div>
                  <p style={{ fontSize: "12px", fontWeight: 500, color: "#9090A8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {language === "ar" ? "إجمالي المصروفات" : "Total Expenses"}
                  </p>
                </div>
                <p style={{ fontSize: "32px", fontWeight: 500, color: "#1a1a2e", lineHeight: 1 }}>
                  {fmt(stats.totalExp)}
                </p>
              </div>

              <div style={{ background: "#ffffff", borderRadius: "14px", border: "0.5px solid #E8E8EC", padding: "24px", position: "relative", overflow: "hidden" }}>
                {/* Decorative background accent for net profit */}
                <div className="no-print" style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "4px", background: "#2563EB" }} />
                
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#EEF2FF", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <PieChart size={16} strokeWidth={2} />
                  </div>
                  <p style={{ fontSize: "12px", fontWeight: 500, color: "#9090A8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {language === "ar" ? "صافي الربح المتوقع" : "Net Profit"}
                  </p>
                </div>
                <p style={{ fontSize: "32px", fontWeight: 500, color: "#1a1a2e", lineHeight: 1 }}>
                  {fmt(stats.netProfit)}
                </p>
              </div>
            </div>

            {/* Monthly Table */}
            <div style={{ background: "#ffffff", borderRadius: "14px", border: "0.5px solid #E8E8EC", overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "0.5px solid #E8E8EC", background: "#FAFAFA" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a2e" }}>
                  {language === "ar" ? "ملخص الحركة الشهرية" : "Monthly Movement Summary"}
                </h3>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
                  <thead>
                    <tr style={{ borderBottom: "0.5px solid #E8E8EC" }}>
                      <th style={{ padding: "14px 24px", fontSize: "11px", fontWeight: 500, color: "#9090A8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{language === "ar" ? "الشهر" : "Month"}</th>
                      <th style={{ padding: "14px 24px", fontSize: "11px", fontWeight: 500, color: "#9090A8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{language === "ar" ? "الإيرادات" : "Revenues"}</th>
                      <th style={{ padding: "14px 24px", fontSize: "11px", fontWeight: 500, color: "#9090A8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{language === "ar" ? "المصروفات" : "Expenses"}</th>
                      <th style={{ padding: "14px 24px", fontSize: "11px", fontWeight: 500, color: "#9090A8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{language === "ar" ? "صافي الربح" : "Net Profit"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 600, color: "#1a1a2e" }}>
                        {periodType === 'all' ? (language === 'ar' ? 'كل الوقت' : 'All Time') : 
                         periodType === '3months' ? (language === 'ar' ? 'آخر 3 أشهر' : 'Last 3 Months') :
                         periodType === '6months' ? (language === 'ar' ? 'آخر 6 أشهر' : 'Last 6 Months') :
                         periodType === 'custom' ? `${startDate} / ${endDate}` :
                         periodType === 'year' ? format(reportDate, "yyyy") : format(reportDate, "MMMM yyyy", { locale })}
                      </td>
                      <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 500, color: "#16A34A" }}>{fmt(stats.totalRev)}</td>
                      <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 500, color: "#DC2626" }}>{fmt(stats.totalExp)}</td>
                      <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 600, color: "#1a1a2e" }}>{fmt(stats.netProfit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className={activeTab === "payroll" || isPdfMode ? (isPdfMode ? "block mt-12" : "block") : "hidden print:block print:mt-12"}>
          <div className={`${isPdfMode ? 'flex' : 'hidden print:flex'} mb-6 pb-2 border-b-2 border-[#E8E8EC]`}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a2e" }}>{language === "ar" ? "رواتب الموظفين" : "Payroll"}</h2>
          </div>
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <DataTable
              columns={[
                { 
                  header: language === "ar" ? "الموظف" : "Employee", 
                  key: "employeeId",
                  render: (val) => employees.find(e => e.id === val)?.nameAr || employees.find(e => e.id === val)?.name || '---'
                },
                { header: language === "ar" ? "ساعات العمل" : "Hours", key: "totalWorkHours" },
                { header: language === "ar" ? "الراتب الأساسي" : "Gross", key: "grossSalary", render: fmt },
                { header: language === "ar" ? "الخصومات" : "Deductions", key: "deductions", render: (v) => <span style={{ color: "#DC2626", fontWeight: 500 }}>-{fmt(v)}</span> },
                { header: language === "ar" ? "صافي الراتب" : "Net", key: "netSalary", render: (v) => <span style={{ color: "#1a1a2e", fontWeight: 600 }}>{fmt(v)}</span> },
                { header: language === "ar" ? "المدفوع" : "Paid", key: "paidAmount", render: fmt },
                { header: language === "ar" ? "المتبقي" : "Remaining", key: "remainingAmount", render: fmt },
                { 
                  header: language === "ar" ? "الحالة" : "Status", 
                  key: "paymentStatus", 
                  render: (v, row) => {
                    const status = v || (row.isPaid ? 'paid' : 'pending');
                    const colors = {
                      paid: { bg: "#DCFCE7", color: "#16A34A" },
                      partial: { bg: "#FEF9C3", color: "#CA8A04" },
                      pending: { bg: "#FEE2E2", color: "#DC2626" }
                    };
                    const c = colors[status] || colors.pending;
                    const labels = {
                      paid: language === "ar" ? "تم الصرف" : "Paid",
                      partial: language === "ar" ? "جزئي" : "Partial",
                      pending: language === "ar" ? "غير مصروف" : "Unpaid"
                    };
                    return (
                      <span style={{ 
                        padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
                        background: c.bg, color: c.color 
                      }}>
                        {labels[status]}
                      </span>
                    );
                  } 
                }
              ]}
              data={stats.currentPayroll}
              searchPlaceholder={language === "ar" ? "بحث في الرواتب..." : "Search payroll..."}
            />
          </div>
        </div>

        <div className={activeTab === "revenues" || isPdfMode ? (isPdfMode ? "block mt-12" : "block") : "hidden print:block print:mt-12"}>
          <div className={`${isPdfMode ? 'flex' : 'hidden print:flex'} mb-6 pb-2 border-b-2 border-[#E8E8EC]`}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a2e" }}>{language === "ar" ? "إيرادات المركز" : "Revenues"}</h2>
          </div>
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <DataTable
              columns={[
                { header: language === "ar" ? "اسم العميل" : "Client Name", key: "clientName" },
                { header: language === "ar" ? "نوع الخدمة" : "Service Type", key: "type", render: (v) => t(v) },
                { header: language === "ar" ? "الإجمالي" : "Total", key: "totalAmount", render: fmt },
                { header: language === "ar" ? "المدفوع" : "Paid", key: "paidAmount", render: (v) => <span style={{ color: "#16A34A", fontWeight: 500 }}>{fmt(v)}</span> },
                { header: language === "ar" ? "المتبقي" : "Remaining", key: "remainingAmount", render: (v) => <span style={{ color: "#DC2626", fontWeight: 600 }}>{fmt(v)}</span> },
                { 
                  header: language === "ar" ? "حالة الدفع" : "Status", 
                  key: "paymentStatus", 
                  render: (v) => {
                    const colors = {
                      paid: { bg: "#DCFCE7", color: "#16A34A" },
                      partial: { bg: "#FEF9C3", color: "#CA8A04" },
                      pending: { bg: "#F0F0F6", color: "#6B6B80" }
                    };
                    const c = colors[v] || colors.pending;
                    return (
                      <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: c.bg, color: c.color }}>
                        {t(v)}
                      </span>
                    );
                  } 
                }
              ]}
              data={stats.currentRevenues}
              searchPlaceholder={language === "ar" ? "بحث في العملاء..." : "Search clients..."}
            />
          </div>
        </div>

        <div className={activeTab === "petty" || isPdfMode ? (isPdfMode ? "block mt-12" : "block") : "hidden print:block print:mt-12"}>
          <div className={`${isPdfMode ? 'flex' : 'hidden print:flex'} mb-6 pb-2 border-b-2 border-[#E8E8EC]`}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a2e" }}>{language === "ar" ? "العهد والمصروفات" : "Petty Cash"}</h2>
          </div>
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <DataTable
              columns={[
                { 
                  header: language === "ar" ? "نوع الحركة" : "Type", 
                  key: "type", 
                  render: (v) => (
                    <span style={{ 
                      padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
                      background: v === "topup" ? "#DCFCE7" : "#FEE2E2", color: v === "topup" ? "#16A34A" : "#DC2626" 
                    }}>
                      {v === "topup" ? (language === "ar" ? "تعبئة رصيد" : "Topup") : (language === "ar" ? "صرف" : "Spend")}
                    </span>
                  ) 
                },
                { header: language === "ar" ? "المبلغ" : "Amount", key: "amount", render: (v) => <span style={{ fontWeight: 600, color: "#1a1a2e" }}>{fmt(v)}</span> },
                { header: language === "ar" ? "الغرض / البيان" : "Purpose", key: "purpose", render: (v) => <span style={{ color: "#6B6B80" }}>{v}</span> },
                { 
                  header: language === "ar" ? "التاريخ" : "Date", 
                  key: "date", 
                  render: (val) => val?.toDate ? format(val.toDate(), "dd/MM/yyyy") : "---" 
                }
              ]}
              data={stats.currentPettyAll}
              searchPlaceholder={language === "ar" ? "بحث في المعاملات..." : "Search transactions..."}
            />
          </div>
        </div>
        </div>

        {/* Print Footer */}
        <div className={`${isPdfMode ? 'block' : 'hidden print:block'} mt-16 pt-8 border-t-2 border-[#E8E8EC]`}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#1a1a2e", marginBottom: "4px" }}>
                {language === "ar" ? "اعتماد الإدارة" : "Management Approval"}
              </p>
              <div style={{ width: "200px", height: "60px", borderBottom: "1px dashed #9090A8", marginTop: "20px" }}></div>
            </div>
            <div style={{ textAlign: "left" }}>
              <p style={{ fontSize: "11px", color: "#9090A8", lineHeight: "1.6" }}>
                {language === "ar" ? "تم استخراج هذا التقرير آلياً من نظام الإدارة." : "This report is computer generated."}<br/>
                {language === "ar" ? "صالح للاستخدام الداخلي والمراجعة." : "Valid for internal use and auditing."}
              </p>
            </div>
          </div>
        </div>

      </div>
    </PageWrapper>
  );
};

export default Reports;
