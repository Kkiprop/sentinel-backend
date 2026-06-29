import { useEffect, useState, useMemo } from "react";
import { FiChevronLeft, FiChevronRight, FiClock, FiMapPin, FiCheckCircle } from "react-icons/fi";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { loadOfflineShifts } from "../../lib/offline.js";

export default function GuardShiftsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [shiftsData, setShiftsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizeShift = (shift) => ({
    ...shift,
    title: shift.title || shift.site_name || "Assigned Shift",
    location: shift.location || shift.site_name || "Assigned site",
    start: shift.start || shift.start_time || null,
    end: shift.end || shift.end_time || null,
  });

  // Fetch shift schedule data for the displayed calendar month
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    setLoading(true);
    setError("");

    api
      .get(endpoints.patrols.shifts, {
        params: {
          year,
          month,
          page_size: 100,
        },
      })
      .then((response) => {
        const rawData = (response.data?.results || []).map(normalizeShift);
        setShiftsData(rawData);
      })
      .catch(() => {
        const cached = loadOfflineShifts().map(normalizeShift);
        if (cached.length) {
          setShiftsData(cached);
          setError("Offline: showing cached shift logs.");
        } else {
          setError("Unable to load shift logs.");
          setShiftsData([]);
        }
      })
      .finally(() => setLoading(false));
  }, [currentDate]);

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];

  // Helper utility to safely format JavaScript dates to UTC-insensitive YYYY-MM-DD keys
  const formatDateString = (date) => {
    const d = new Date(date);
    const monthStr = String(d.getMonth() + 1).padStart(2, "0");
    const dayStr = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${monthStr}-${dayStr}`;
  };

  const selectedDateStr = useMemo(() => formatDateString(selectedDate), [selectedDate]);

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const daysArray = [];
    
    // Padding days for previous month boundaries
    for (let i = 0; i < firstDayIndex; i++) {
      daysArray.push({ day: null, dateStr: null });
    }
    
    // Populating current month rows
    for (let day = 1; day <= totalDays; day++) {
      const dateObj = new Date(year, month, day);
      const dateStr = formatDateString(dateObj);
      
      // ADDED DEFENSIVE CHECK HERE: s.start && s.start.startsWith...
      const dayShifts = shiftsData.filter(s => s?.start && s.start.startsWith(dateStr));

      daysArray.push({
        day,
        dateObj,
        dateStr,
        hasShifts: dayShifts.length > 0,
        shifts: dayShifts
      });
    }
    return daysArray;
  }, [year, month, shiftsData]);

  // Filter out agenda items matching the actively selected date node item
  const selectedDaysShifts = useMemo(() => {
    // ADDED DEFENSIVE CHECK HERE: s.start && s.start.startsWith...
    return shiftsData.filter(s => s?.start && s.start.startsWith(selectedDateStr));
  }, [selectedDateStr, shiftsData]);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const formatTime = (isoString) => {
    if (!isoString) return "--:--";
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderAgendaContent = () => {
    if (loading && !error) {
      return (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", backgroundColor: "#ffffff", borderRadius: "1rem", border: "1px solid #e2e8f0", color: "#64748b", fontSize: "0.9rem" }}>
          Loading patrol schedule...
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", backgroundColor: "#ffffff", borderRadius: "1rem", border: "1px solid #e2e8f0", color: "#dc2626", fontSize: "0.9rem" }}>
          {error}
        </div>
      );
    }

    if (selectedDaysShifts.length === 0) {
      return (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", backgroundColor: "#ffffff", borderRadius: "1rem", border: "1px solid #e2e8f0", color: "#94a3b8", fontSize: "0.9rem" }}>
          No active patrol assignments registered for this calendar date node.
        </div>
      );
    }

    return selectedDaysShifts.map((shift) => {
      const isActive = shift.status === "active";
      const isCompleted = shift.status === "completed";
      const themeColor = isActive ? "#2563eb" : isCompleted ? "#059669" : "#64748b";
      const bgTheme = isActive ? "#eff6ff" : isCompleted ? "#f0fdf4" : "#ffffff";

      return (
        <div 
          key={shift.id}
          style={{
            display: "flex",
            backgroundColor: bgTheme,
            borderRadius: "1rem",
            border: "1px solid #e2e8f0",
            padding: "1rem",
            gap: "0.85rem",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.02)",
            position: "relative",
            overflow: "hidden"
          }}
        >
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", backgroundColor: themeColor }} />

          <div style={{ color: themeColor, display: "flex", alignItems: "flex-start", marginTop: "0.15rem" }}>
            {isCompleted ? <FiCheckCircle size={18} /> : <FiClock size={18} />}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flexGrow: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h5 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>{shift.title}</h5>
              <span style={{ 
                fontSize: "0.65rem", 
                fontWeight: 700, 
                textTransform: "uppercase", 
                color: themeColor,
                backgroundColor: isActive ? "#dbeafe" : isCompleted ? "#dcfce7" : "#f1f5f9",
                padding: "0.15rem 0.4rem",
                borderRadius: "0.25rem"
              }}>
                {shift.status}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#64748b", fontSize: "0.8rem" }}>
              <FiMapPin size={12} />
              <span>{shift.location || "Main Precinct Facility"}</span>
            </div>

            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginTop: "0.15rem" }}>
              {formatTime(shift.start)} - {formatTime(shift.end)}
            </div>
          </div>
        </div>
      );
    });
  };

  const nativeTapStyle = `
    .btn-tap-effect:active { transform: scale(0.95); opacity: 0.85; transition: transform 0.1s ease; }
    .day-cell-tap:active { background-color: #e2e8f0 !important; border-radius: 50%; }
  `;

  return (
    <div style={{ 
      backgroundColor: "#f8fafc", 
      minHeight: "100%", 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      WebkitUserSelect: "none",
      userSelect: "none"
    }}>
      <style>{nativeTapStyle}</style>

      {/* Top Functional Title Navbar */}
      <header style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        backgroundColor: "#ffffff",
        padding: "0.85rem 1.25rem",
        borderBottom: "1px solid #f1f5f9",
        flexShrink: 0
      }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>Patrol Schedule</h2>
        <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, backgroundColor: "#f1f5f9", padding: "0.25rem 0.6rem", borderRadius: "0.5rem" }}>
          {year}
        </span>
      </header>

      {/* Primary Shell Area */}
      <main style={{ 
        flexGrow: 1, 
        display: "flex", 
        flexDirection: "column", 
        padding: "1rem", 
        gap: "1rem",
        overflowY: "auto"
      }}>
        
        {/* Full Size Calendar Block UI Wrapper Container */}
        <section style={{
          backgroundColor: "#ffffff",
          borderRadius: "1rem",
          padding: "1rem",
          boxShadow: "0 4px 14px rgba(15, 23, 42, 0.03)",
          border: "1px solid #e2e8f0",
          flexShrink: 0
        }}>
          {/* Calendar Month Selector Controls Header Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
              {monthNames[month]} {year}
            </h3>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={handlePrevMonth} className="btn-tap-effect" style={{ border: "none", background: "#f1f5f9", padding: "0.4rem", borderRadius: "50%", cursor: "pointer", display: "grid", placeItems: "center" }}>
                <FiChevronLeft size={16} color="#475569" />
              </button>
              <button onClick={handleNextMonth} className="btn-tap-effect" style={{ border: "none", background: "#f1f5f9", padding: "0.4rem", borderRadius: "50%", cursor: "pointer", display: "grid", placeItems: "center" }}>
                <FiChevronRight size={16} color="#475569" />
              </button>
            </div>
          </div>

          {/* Days Of Week Text Headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", marginBottom: "0.5rem" }}>
            {daysOfWeek.map((day, index) => (
              <span key={index} style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8" }}>{day}</span>
            ))}
          </div>

          {/* Grid Layout Core Generation */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: "0.5rem" }}>
            {calendarDays.map((cell, idx) => {
              if (!cell.day) return <div key={`empty-${idx}`} />;

              const isSelected = cell.dateStr === selectedDateStr;
              const isToday = formatDateString(new Date()) === cell.dateStr;

              // Determine dot indicator colors for the day cell
              const shiftMarkers = cell.shifts.slice(0, 3).map((shift) => {
                if (shift.status === "active") return "#2563eb";
                if (shift.status === "pending") return "#eab308";
                return "#22c55e";
              });

              return (
                <div 
                  key={`day-${cell.day}`}
                  onClick={() => setSelectedDate(cell.dateObj)}
                  className="day-cell-tap"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0.5rem 0",
                    cursor: "pointer",
                    position: "relative",
                    borderRadius: "50%",
                    backgroundColor: isSelected ? "#0f172a" : "transparent",
                    border: cell.hasShifts && !isSelected ? "1px solid #c7d2fe" : "none",
                    transition: "all 0.1s ease"
                  }}
                >
                  <span style={{
                    fontSize: "0.9rem",
                    fontWeight: isSelected || isToday ? 700 : 500,
                    color: isSelected ? "#ffffff" : isToday ? "#2563eb" : "#334155"
                  }}>
                    {cell.day}
                  </span>

                  <div style={{ display: "flex", gap: "0.2rem", marginTop: "0.35rem" }}>
                    {shiftMarkers.map((color, idx) => (
                      <span
                        key={idx}
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor: color,
                          boxShadow: isSelected ? "0 0 0 1px rgba(255,255,255,0.4)" : "none"
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Dynamic Agenda Day Segment Timeline Lists Block */}
        <section style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flexGrow: 1 }}>
          <h4 style={{ margin: "0 0 0.15rem 0.25rem", fontSize: "0.9rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.025em" }}>
            Agenda Logs: {selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </h4>

          {renderAgendaContent()}
        </section>

      </main>
    </div>
  );
}