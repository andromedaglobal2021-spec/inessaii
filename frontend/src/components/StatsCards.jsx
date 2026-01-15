import React from 'react';
import { Phone, Clock, PhoneOff, TrendingUp, TrendingDown, Activity, Wallet, CreditCard } from 'lucide-react';

const StatCard = ({ title, value, subtext, trend, trendValue, icon: Icon }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className="p-2 bg-gray-50 rounded-lg">
        <Icon className="w-5 h-5 text-gray-400" />
      </div>
    </div>
    
    <div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-500 mb-3">{subtext}</div>
      
      {trend && (
        <div className={`flex items-center text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
          {trendValue}
        </div>
      )}
    </div>
  </div>
);

const StatsCards = ({ stats }) => {
  if (!stats) return null;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const conversionRate = stats.totalCalls > 0 
    ? ((stats.completedCalls / stats.totalCalls) * 100).toFixed(0) 
    : 0;

  const reachabilityRate = stats.totalCalls > 0
    ? ((stats.completedCalls / stats.totalCalls) * 100).toFixed(0)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Успешные звонки"
        value={stats.completedCalls}
        subtext="установлено соединение"
        trend="up"
        trendValue="12% за период"
        icon={Phone}
      />
      <StatCard
        title="Неуспешные звонки"
        value={stats.missedCalls}
        subtext="сбои / отказы"
        trend="down"
        trendValue="3% за период"
        icon={PhoneOff}
      />
      <StatCard
        title="Показатель дозвона"
        value={`${reachabilityRate}%`}
        subtext="от общего числа"
        icon={Activity}
      />
      <StatCard
        title="Конверсия"
        value={`${conversionRate}%`}
        subtext="целевое действие"
        trend="up"
        trendValue="5% за период"
        icon={TrendingUp}
      />
      <StatCard
        title="Баланс Voximplant"
        value={`${stats.balance || 0} ₽`}
        subtext="остаток средств"
        icon={Wallet}
      />
    </div>
  );
};

export default StatsCards;
