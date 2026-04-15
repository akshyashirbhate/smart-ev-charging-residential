import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

export default function AnalyticsChart({ selectedFilter }) {
    const [data, setData] = useState([]);
    const [predictedTotal, setPredictedTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const userId = localStorage.getItem("userId");
                if (!userId) return;

                const res = await axios.get(`http://localhost:5000/api/charging/${userId}/forecast`, {
                    params: { month: selectedFilter?.month, year: selectedFilter?.year }
                });

                // Merge historical and predicted data for a seamless chart
                const combinedData = [
                    ...res.data.historicalData,
                    ...res.data.predictedData
                ];

                setData(combinedData);
                setPredictedTotal(res.data.predicted30DayTotal);
            } catch (error) {
                console.error("Failed to load analytics data", error);
            } finally {
                setLoading(false);
            }
        };

        if (selectedFilter) {
            fetchAnalytics();
        }
    }, [selectedFilter]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 bg-gray-900 rounded-2xl border border-indigo-500/30">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-gray-900 rounded-2xl p-1 border border-indigo-500/30 overflow-hidden shadow-2xl relative mt-8">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500"></div>

            <div className="p-6 sm:p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <h4 className="text-teal-300 text-sm font-bold uppercase tracking-widest">Energy Forecast Analytics</h4>
                    <div className="mt-4 md:mt-0 bg-gray-950 px-4 py-2 rounded-xl border border-gray-800 flex items-center gap-3">
                        <span className="text-gray-500 text-xs uppercase tracking-widest font-medium">30-Day Forecast</span>
                        <strong className="text-xl font-mono text-teal-400">{predictedTotal.toFixed(2)} kWh</strong>
                    </div>
                </div>

                {data.length === 0 ? (
                    <div className="h-64 flex flex-col justify-center items-center text-gray-500">
                        <span className="text-4xl mb-2">📊</span>
                        <p>Not enough charging history yet.</p>
                        <p className="text-sm">Complete a session to generate insights.</p>
                    </div>
                ) : (
                    <div className="h-72 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={data}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4fd1c5" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#4fd1c5" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#9ca3af"
                                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                                    tickFormatter={(val) => {
                                        const d = new Date(val);
                                        return `${d.getMonth() + 1}/${d.getDate()}`;
                                    }}
                                />
                                <YAxis
                                    stroke="#9ca3af"
                                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                                    tickFormatter={(val) => `${val} kWh`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                                    itemStyle={{ color: '#4fd1c5' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="actualUsage"
                                    stroke="#4fd1c5"
                                    fillOpacity={1}
                                    fill="url(#colorActual)"
                                    name="Recorded Usage"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="predictedUsage"
                                    stroke="#818cf8"
                                    strokeDasharray="5 5"
                                    fillOpacity={1}
                                    fill="url(#colorPredicted)"
                                    name="Forecasted Usage"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}
