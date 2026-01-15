import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Calendar, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import StatsCards from '../components/StatsCards';
import CallsTable from '../components/CallsTable';
import Charts from '../components/Charts';

const Dashboard = () => {
  const [calls, setCalls] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('day'); // day, week, month, year

  const fetchData = async (search = '', status = '') => {
    try {
      // In a real app, we would pass dateFilter to the backend
      const [callsRes, statsRes] = await Promise.all([
        axios.get('/api/calls', { params: { search, status } }),
        axios.get('/api/calls/stats')
      ]);
      setCalls(callsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Fallback to mock data for demo purposes if backend is unreachable
      console.warn('Using mock data for demo');
      const mockCalls = [
        { id: 1, caller_number: '+79991234567', duration: 120, status: 'completed', source: 'Voxiplan', timestamp: new Date().toISOString(), transcription: 'Здравствуйте, интересуют тарифы.', sentiment: 'neutral' },
        { id: 2, caller_number: '+79997654321', duration: 45, status: 'completed', source: 'ElevenLabs', timestamp: new Date(Date.now() - 3600000).toISOString(), transcription: 'Спасибо, все понятно.', sentiment: 'positive' },
        { id: 3, caller_number: '+79001112233', duration: 0, status: 'missed', source: 'Voxiplan', timestamp: new Date(Date.now() - 7200000).toISOString(), transcription: null, sentiment: null },
        { id: 4, caller_number: '+79112223344', duration: 180, status: 'completed', source: 'ElevenLabs', timestamp: new Date(Date.now() - 86400000).toISOString(), transcription: 'Перезвоните мне позже.', sentiment: 'negative' },
      ];
      const mockStats = {
        totalCalls: 150,
        completedCalls: 120,
        missedCalls: 30,
        averageDuration: 85,
        balance: 12500 // Mock balance for demo
      };
      setCalls(mockCalls);
      setStats(mockStats);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  const handleSearch = (searchTerm, statusFilter) => {
    fetchData(searchTerm, statusFilter);
  };

  const handleExportCSV = () => {
    const headers = ['ID,Date,Number,Duration,Status,Source,Sentiment,Transcription,Audio URL'];
    const csvContent = calls.map(call => {
      return [
        call.id,
        new Date(call.timestamp).toISOString(),
        call.caller_number,
        call.duration,
        call.status,
        call.source,
        call.sentiment,
        `"${(call.transcription || '').replace(/"/g, '""')}"`,
        call.audio_url || ''
      ].join(',');
    });
    
    const blob = new Blob([[...headers, ...csvContent].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'calls_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Note: Standard jsPDF fonts do not support Cyrillic. Using English for PDF reliability.
    doc.setFontSize(18);
    doc.text("Calls Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    
    const tableColumn = ["Date", "Source", "Number", "Duration (s)", "Status"];
    const tableRows = calls.map(call => [
      new Date(call.timestamp).toLocaleString(),
      call.source || 'Unknown',
      call.caller_number,
      call.duration,
      call.status
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 40,
    });
    
    doc.save("calls_report.pdf");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section with Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Обзор метрик</h2>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex space-x-2">
            <button 
              onClick={handleExportCSV}
              className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm text-sm font-medium"
              title="Экспорт в CSV"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
            <button 
              onClick={handleExportPDF}
              className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm text-sm font-medium"
              title="Экспорт в PDF"
            >
              <FileText className="w-4 h-4" />
              <span>PDF</span>
            </button>
          </div>
          
          <div className="bg-gray-100 p-1 rounded-lg flex items-center">
            {['day', 'week', 'month', 'year'].map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  dateFilter === filter 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {filter === 'day' && 'День'}
                {filter === 'week' && 'Неделя'}
                {filter === 'month' && 'Месяц'}
                {filter === 'year' && 'Год'}
              </button>
            ))}
          </div>
          
          <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm text-sm font-medium">
            <Calendar className="w-4 h-4" />
            <span>Выбрать даты</span>
          </button>
        </div>
      </div>

      <StatsCards stats={stats} />
      
      <Charts stats={stats} />
      
      <CallsTable calls={calls} onSearch={handleSearch} />
    </div>
  );
};

export default Dashboard;
