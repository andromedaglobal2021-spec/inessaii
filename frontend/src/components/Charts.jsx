import React from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Charts = ({ stats }) => {
  if (!stats) return null;

  // Mock data for dynamics (Line/Area Chart)
  const dynamicsData = [
    { name: 'Пн', calls: 35 },
    { name: 'Вт', calls: 50 },
    { name: 'Ср', calls: 45 },
    { name: 'Чт', calls: 80 },
    { name: 'Пт', calls: 65 },
    { name: 'Сб', calls: 40 },
    { name: 'Вс', calls: 30 },
  ];

  // Mock data for conversion (Bar Chart)
  const conversionData = [
    { name: 'Пн', rate: 20 },
    { name: 'Вт', rate: 25 },
    { name: 'Ср', rate: 22 },
    { name: 'Чт', rate: 30 },
    { name: 'Пт', rate: 28 },
    { name: 'Сб', rate: 18 },
    { name: 'Вс', rate: 15 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Dynamics Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-6">Динамика звонков</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dynamicsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9CA3AF', fontSize: 12 }} 
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey="calls" 
                stroke="#3B82F6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorCalls)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conversion Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-6">Конверсия по дням</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={conversionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                unit="%"
              />
              <Tooltip 
                cursor={{ fill: '#F3F4F6' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Bar 
                dataKey="rate" 
                fill="#10B981" 
                radius={[4, 4, 0, 0]} 
                barSize={30} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Charts;
