import { useState, useEffect } from "react";
import axios from "axios";
import AnalyticsChart from "../components/AnalyticsChart";

export default function Dashboard() {
  const [charging, setCharging] = useState(false);
  const [currentSessionBill, setCurrentSessionBill] = useState(0);
  const [monthlyBill, setMonthlyBill] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [wingName, setWingName] = useState("");
  const [flatNumber, setFlatNumber] = useState("");

  // Real-time tracking states
  const [livePower, setLivePower] = useState(0);
  const [liveVoltage, setLiveVoltage] = useState(0);
  const [liveCurrent, setLiveCurrent] = useState(0);
  const [liveEnergy, setLiveEnergy] = useState(0);
  const [liveTime, setLiveTime] = useState(0);
  const [batteryPercentage, setBatteryPercentage] = useState(0);

  // Hardware Fault State
  const [hardwareFault, setHardwareFault] = useState(null);

  // History State
  const [historyData, setHistoryData] = useState([]);

  // UI State
  const [activeTab, setActiveTab] = useState("overview");

  // Filter State
  const generateAllMonths = () => {
    const months = [];
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 12; i++) {
      const d = new Date(currentYear, i, 1);
      months.push({
        id: `${currentYear}-${i}`,
        month: i,
        year: currentYear,
        label: d.toLocaleString('default', { month: 'short' })
      });
    }
    return months;
  };

  const [availableMonths] = useState(generateAllMonths());
  const [selectedFilter, setSelectedFilter] = useState(
    availableMonths[new Date().getMonth()] // Default to current month
  );

  const filteredHistory = historyData.filter(session => {
    if (!session.startTime) return false;
    const sessionDate = new Date(session.startTime);
    return sessionDate.getMonth() === selectedFilter.month && sessionDate.getFullYear() === selectedFilter.year;
  });

  // Fetch Monthly Bill
  useEffect(() => {
    const fetchMonthlyBill = async () => {
      try {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        const res = await axios.get(`http://localhost:5000/api/charging/${userId}/bill`, {
          params: { month: selectedFilter.month, year: selectedFilter.year }
        });
        setMonthlyBill(res.data.monthlyBill);
        setWingName(res.data.wingName);
        setFlatNumber(res.data.flatNumber);
      } catch (error) {
        console.error("Error fetching bill:", error);
      }
    };
    fetchMonthlyBill();
  }, [selectedFilter]);

  // Initial Data Fetch
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const userId = localStorage.getItem("userId");
        if (!userId) return;
        const res = await axios.get(`http://localhost:5000/api/charging/${userId}/history`);
        setHistoryData(res.data);
      } catch (error) {
        console.error("Error fetching history:", error);
      }
    };
    fetchHistory();

    if (localStorage.getItem("sessionId")) {
      setCharging(true);
      setSessionId(localStorage.getItem("sessionId"));
    }
  }, []);

  // Live Data Poller
  useEffect(() => {
    let intervalId;

    if (charging) {
      intervalId = setInterval(async () => {
        try {
          const userId = localStorage.getItem("userId");
          if (!userId) return;

          const res = await axios.get(`http://localhost:5000/api/charging/status/${userId}`);

          if (res.data && res.data.sessionEndedViaFault) {
            console.error("CRITICAL HARDWARE FAULT:", res.data.fault);
            setHardwareFault(res.data.fault || "UNKNOWN CRITICAL HARDWARE ERROR");

            // Auto-Cleanup since the backend forcefully killed the session
            setCharging(false);
            setSessionId(null);
            localStorage.removeItem("sessionId");
            setCurrentSessionBill(res.data.liveCost || 0);
            setMonthlyBill((prev) => prev + (res.data.liveCost || 0));
            clearInterval(intervalId); // Stop polling immediately

            alert("Charging failed: " + (res.data.fault || "Hardware Error"));
            return;
          }

          if (res.data && !res.data.error) {
            setLivePower(res.data.power_kW || 0);
            setLiveVoltage(res.data.voltage || 0);
            setLiveCurrent(res.data.current || 0);
            setLiveEnergy(res.data.energyConsumed_kWh || 0);
            setLiveTime(res.data.timeElapsed_sec || 0);
            setCurrentSessionBill(res.data.liveCost || 0);

            // REAL Battery Percentage from Hardware (STM32 -> ESP32 -> Node)
            const currentPercentage = res.data.soc || 0;
            setBatteryPercentage(currentPercentage.toFixed(1));

            // Auto Stop when 100% is reached
            if (currentPercentage >= 100) {
              console.log("🔋 Battery reached 100%. Auto-stopping charge...");
              clearInterval(intervalId); // Stop polling immediately to avoid duplicate stop requests

              try {
                const stopRes = await axios.post("http://localhost:5000/api/charging/stop", {
                  userId: localStorage.getItem("userId"),
                  sessionId: localStorage.getItem("sessionId")
                });

                setCharging(false);
                setCurrentSessionBill(stopRes.data.cost);
                setMonthlyBill((prev) => prev + stopRes.data.cost);
                setSessionId(null);
                localStorage.removeItem("sessionId");

                alert(`🔋 Battery 100% Full! Charging automatically stopped.\nFinal Cost: ₹${stopRes.data.cost.toFixed(2)}`);
              } catch (err) {
                console.error("❌ Auto stop failed:", err);
                alert("Battery reached 100%, but auto-stop failed to communicate with hardware.");
              }
            }
          }
        } catch (error) {
          console.error("Error fetching live polling data", error);
        }
      }, 3000); // Poll every 3 seconds
    } else {
      setLivePower(0);
      setLiveVoltage(0);
      setLiveCurrent(0);
      setLiveTime(0);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [charging]);

  const handleStartCharging = async () => {
    setHardwareFault(null); // Clear old faults
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        alert("User not logged in. Please log in.");
        return;
      }

      const res = await axios.post("http://localhost:5000/api/charging/start", { userId });

      if (res.status === 201) {
        setCharging(true);
        setSessionId(res.data.sessionId);
        localStorage.setItem("sessionId", res.data.sessionId);
        setCurrentSessionBill(0);
        setLiveEnergy(0);
        setLiveTime(0);
        setBatteryPercentage(0.0); // Reset until live data streams in
        alert("Charging started!");
      }
    } catch (error) {
      console.error("❌ Start Charging Error:", error);
      alert(error.response?.data?.message || "Failed to start charging");
    }
  };

  const handleStopCharging = async () => {
    const userId = localStorage.getItem("userId");
    const sessionId = localStorage.getItem("sessionId");

    if (!userId) return alert("User not logged in. Please log in.");
    if (!sessionId) return alert("No active charging session!");

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/charging/stop", { userId, sessionId });

      setCharging(false);
      setCurrentSessionBill(res.data.cost);
      setMonthlyBill((prev) => prev + res.data.cost);
      setSessionId(null);
      localStorage.removeItem("sessionId");

      alert(`Charging stopped! Final Cost: ₹${res.data.cost.toFixed(2)}`);
    } catch (error) {
      console.error("❌ Stop Charging Error:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Failed to stop charging");
    }
    setLoading(false);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col pt-8 shrink-0">
        <div className="px-6 mb-8">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 tracking-tight mb-2">
            EV Power
          </h2>
          <div className="text-gray-500 text-xs font-semibold tracking-wide uppercase">
            Station Control Room
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}
          >
            <span className="text-lg">⚡</span>
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab("billing")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'billing' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}
          >
            <span className="text-lg">💳</span>
            Billing & Analytics
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}
          >
            <span className="text-lg">📅</span>
            Charging History
          </button>
        </nav>

        <div className="relative p-6 mt-auto border-t border-gray-800 bg-gray-900 text-sm">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center text-gray-400">
              <span className="uppercase tracking-wider text-xs">Wing</span>
              <span className="text-white font-mono bg-gray-800 px-2 py-1 rounded border border-gray-700">{wingName || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center text-gray-400">
              <span className="uppercase tracking-wider text-xs">Flat</span>
              <span className="text-white font-mono bg-gray-800 px-2 py-1 rounded border border-gray-700">{flatNumber || "N/A"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-950">

        {/* Header Bar */}
        <header className="bg-gray-900 border-b border-gray-800 p-6 flex justify-between items-center shrink-0 shadow-sm z-10">
          <h1 className="text-2xl font-bold text-gray-200 tracking-tight">
            {activeTab === 'overview' && "System Dashboard"}
            {activeTab === 'billing' && "Billing & Energy Analytics"}
            {activeTab === 'history' && "Charging Session History"}
          </h1>
          <div className="flex items-center gap-4">
            <div className={`px-4 py-1.5 rounded-full font-bold text-xs tracking-widest flex items-center gap-2 transition-all ${charging ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
              {charging && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
              {charging ? "ACTIVELY CHARGING" : "SYSTEM STANDBY"}
            </div>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-10 relative">
          <div className="max-w-5xl mx-auto">

            {/* HARDWARE FAULT MODAL ALERT - ALWAYS AT TOP IF FAULT */}
            {hardwareFault && (
              <div className="bg-red-950 border border-red-500 rounded-2xl p-6 mb-8 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-pulse">
                <h3 className="text-2xl font-black text-red-400 mb-2 flex items-center gap-2">
                  ⚠️ EMERGENCY STOP
                </h3>
                <p className="text-red-200 mb-4">The charging session was forcefully terminated by hardware safety protocols.</p>
                <div className="h-px w-full bg-red-800/50 my-4"></div>
                <p className="text-xl font-bold text-white tracking-widest bg-red-900 inline-block px-4 py-2 rounded-lg">REASON: {hardwareFault}</p>
                <p className="text-sm text-red-300 mt-4">Please disconnect your vehicle and contact support.</p>
              </div>
            )}

            {/* Global Calendar Month Selector for Billing and History */}
            {!hardwareFault && (activeTab === 'billing' || activeTab === 'history') && (
              <div className="flex flex-wrap gap-2 mb-6 bg-gray-950/50 p-2 rounded-xl border border-gray-800">
                {availableMonths.map((m) => {
                  const isActive = selectedFilter.id === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedFilter(m)}
                      className={`flex-1 min-w-[60px] py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                          ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                          : 'bg-transparent text-gray-400 border border-transparent hover:bg-gray-800 hover:text-gray-200'
                        }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            )}

            {!hardwareFault && activeTab === 'overview' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Action Buttons */}
                <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl flex flex-col sm:flex-row justify-center gap-6">
                  <button
                    onClick={handleStartCharging}
                    disabled={loading || charging}
                    className={`px-8 py-4 rounded-xl font-bold text-lg tracking-wide transition-all duration-300 flex-1 ${loading || charging
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transform hover:-translate-y-1'
                      }`}>
                    {loading && charging ? "STARTING NETWORK..." : "INITIATE CHARGE"}
                  </button>

                  <button
                    onClick={handleStopCharging}
                    disabled={loading || !charging}
                    className={`px-8 py-4 rounded-xl font-bold text-lg tracking-wide transition-all duration-300 flex-1 ${loading || !charging
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_30px_rgba(225,29,72,0.5)] transform hover:-translate-y-1'
                      }`}>
                    {loading && !charging ? "HALTING..." : "STOP CHARGING"}
                  </button>
                </div>

                {charging && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Telemetry Matrix */}
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-blue-900/40 shadow-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
                      <h5 className="text-blue-400 font-bold tracking-widest mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        LIVE TELEMETRY
                      </h5>

                      <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-gray-700/50 pb-2">
                          <span className="text-gray-400 uppercase text-xs tracking-wider">Voltage</span>
                          <span className="text-2xl font-mono text-gray-200">{liveVoltage} <span className="text-sm text-gray-500">V</span></span>
                        </div>
                        <div className="flex justify-between items-end border-b border-gray-700/50 pb-2">
                          <span className="text-gray-400 uppercase text-xs tracking-wider">Current</span>
                          <span className="text-2xl font-mono text-gray-200">{liveCurrent} <span className="text-sm text-gray-500">A</span></span>
                        </div>
                        <div className="flex justify-between items-end border-b border-gray-700/50 pb-2">
                          <span className="text-gray-400 uppercase text-xs tracking-wider">Power draw</span>
                          <span className="text-2xl font-mono text-blue-300 font-bold">{livePower} <span className="text-sm text-blue-500/70">kW</span></span>
                        </div>
                        <div className="pt-3 mt-1">
                          <div className="flex gap-2 items-center mb-2">
                            <span className="text-gray-400 uppercase text-xs tracking-wider">Est. Battery</span>
                            <span className="text-sm font-mono text-green-400 font-bold ml-auto">{batteryPercentage}%</span>
                          </div>
                          {/* Battery Progress Bar */}
                          <div className="flex items-center w-full">
                            <div className="flex-grow bg-gray-800 rounded-lg h-8 border-2 border-gray-600 p-0.5 relative shadow-inner overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-green-500 to-emerald-400 h-full rounded-md transition-all duration-1000 ease-in-out relative"
                                style={{ width: `${batteryPercentage}%` }}
                              >
                                <div className="absolute inset-0 bg-white/20 w-full h-1/3 top-0 rounded-t-sm"></div>
                              </div>
                              <div className="absolute inset-0 flex items-center justify-center z-10 font-bold text-sm text-white drop-shadow-md tracking-wider">
                                ⚡ {batteryPercentage}%
                              </div>
                            </div>
                            <div className="w-1.5 h-4 bg-gray-500 rounded-r-sm ml-[1px]"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Energy Consumed & Timer */}
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-teal-900/40 shadow-[0_0_30px_rgba(20,184,166,0.1)] flex flex-col justify-center items-center relative overflow-hidden">
                      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-teal-500/10 blur-2xl"></div>

                      {/* Timer Display */}
                      <div className="flex flex-col items-center mb-6 z-10 w-full border-b border-gray-700/50 pb-6">
                        <h5 className="text-gray-400 font-bold tracking-widest mb-1 text-xs">ELAPSED TIME</h5>
                        <div className="text-4xl font-mono text-gray-200 font-bold tracking-widest">
                          {formatTime(liveTime)}
                        </div>
                      </div>

                      <h5 className="text-teal-400 font-bold tracking-widest mb-2 z-10">ENERGY DELIVERED</h5>
                      <div className="flex items-baseline gap-2 z-10">
                        <h2 className="text-5xl sm:text-6xl font-black text-white font-mono">{liveEnergy.toFixed(3)}</h2>
                        <span className="text-teal-500 text-xl font-bold">kWh</span>
                      </div>
                    </div>
                  </div>
                )}

                {!charging && (
                  <div className="bg-gray-900/50 rounded-2xl p-10 border border-gray-800 border-dashed text-center flex flex-col items-center justify-center min-h-[300px]">
                    <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-6 shadow-inner">
                      <span className="text-4xl opacity-50">🔌</span>
                    </div>
                    <h3 className="text-xl font-medium text-gray-300 mb-2">Ready to Charge</h3>
                    <p className="text-gray-500 max-w-sm">Connect your vehicle and initiate the session using the controls above to monitor real-time telemetry.</p>
                  </div>
                )}
              </div>
            )}

            {!hardwareFault && activeTab === 'billing' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Billing Overview */}
                <div className="bg-gray-900 rounded-2xl p-1 border border-indigo-500/30 overflow-hidden shadow-2xl relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500"></div>
                  <div className="p-6 sm:p-8 flex flex-col sm:flex-row justify-around items-center w-full gap-8">
                    <div className="flex flex-col items-center flex-1 w-full">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="p-1.5 bg-gray-800 rounded text-indigo-400 shadow-sm">💵</span>
                        <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Current Session Cost</p>
                      </div>
                      <div className="bg-gray-950 px-6 py-4 rounded-xl border border-gray-800 w-full text-center shadow-inner">
                        <strong className="text-3xl font-mono text-white">₹{currentSessionBill.toFixed(2)}</strong>
                      </div>
                    </div>

                    <div className="w-px h-16 bg-gray-800 hidden sm:block shadow-sm"></div>

                    <div className="flex flex-col items-center flex-1 w-full">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="p-1.5 bg-gray-800 rounded text-purple-400 shadow-sm">📅</span>
                        <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Monthly Cumulative Total</p>
                      </div>
                      <div className="bg-gray-950 px-6 py-4 rounded-xl border border-gray-800 w-full text-center shadow-inner">
                        <strong className="text-3xl font-mono text-indigo-400">
                          ₹{(monthlyBill + (charging ? currentSessionBill : 0)).toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Predictive Analytics Chart */}
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-xl">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-200">Cost Projections & Analytics</h3>
                    <p className="text-gray-500 text-sm mt-1">Machine learning based predictions for your monthly EV charging expenditures.</p>
                  </div>
                  <AnalyticsChart selectedFilter={selectedFilter} />
                </div>
              </div>
            )}

            {!hardwareFault && activeTab === 'history' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Charging History Table */}
                <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h4 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                        <span className="text-emerald-500">🗓️</span> Session Ledger
                      </h4>
                      <p className="text-gray-500 text-sm mt-1">Detailed history of all your completed charging sessions.</p>
                    </div>
                    <div className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm text-gray-400 flex items-center gap-2 border border-gray-700 shadow-inner">
                      Total Sessions: <span className="font-bold text-white">{filteredHistory.length}</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-gray-800 shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-950">
                        <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                          <th className="py-4 px-6 font-semibold">Date</th>
                          <th className="py-4 px-6 font-semibold">Start Time</th>
                          <th className="py-4 px-6 font-semibold">Stop Time</th>
                          <th className="py-4 px-6 font-semibold text-right">Energy (kWh)</th>
                          <th className="py-4 px-6 font-semibold text-right">Cost (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-300 text-sm bg-gray-900/50 divide-y divide-gray-800/50">
                        {filteredHistory.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-12 text-center text-gray-500">
                              <div className="flex flex-col items-center justify-center">
                                <span className="text-4xl mb-4 opacity-50">📭</span>
                                <p className="font-medium text-gray-400">No charging sessions recorded yet.</p>
                                <p className="text-xs mt-1 opacity-70">Start your first session to see history data.</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredHistory.map((session, index) => {
                            const start = new Date(session.startTime);
                            const end = session.endTime ? new Date(session.endTime) : null;
                            return (
                              <tr key={session._id || index} className="hover:bg-gray-800/80 transition-colors">
                                <td className="py-4 px-6 font-medium">{start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                <td className="py-4 px-6 text-gray-400">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                <td className="py-4 px-6">
                                  {end ? (
                                    <span className="text-gray-400">{end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-sm">
                                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1.5 animate-pulse"></span>
                                      In Progress
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-6 text-right font-mono text-teal-400 font-medium">{session.energyConsumed?.toFixed(3)}</td>
                                <td className="py-4 px-6 text-right font-mono text-indigo-400 font-medium z-10">₹{session.cost?.toFixed(2)}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
