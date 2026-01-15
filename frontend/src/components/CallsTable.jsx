import React, { useState, useRef } from 'react';
import { Search, Filter, Play, Pause, ChevronDown, ChevronUp, FileText } from 'lucide-react';

const CallsTable = ({ calls, onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(new Audio());

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    onSearch(e.target.value, statusFilter);
  };

  const handleFilterChange = (e) => {
    setStatusFilter(e.target.value);
    onSearch(searchTerm, e.target.value);
  };

  const togglePlay = (url, id) => {
    if (playingId === id) {
      audioRef.current.pause();
      setPlayingId(null);
    } else {
      if (url) {
        audioRef.current.src = url;
        audioRef.current.play();
        setPlayingId(id);
        audioRef.current.onended = () => setPlayingId(null);
      }
    }
  };

  const toggleExpand = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
        <h3 className="text-lg font-bold text-gray-800">Список звонков</h3>
        <div className="flex space-x-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Поиск..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64 bg-gray-50"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <div className="relative">
             <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-gray-50 text-gray-700"
              value={statusFilter}
              onChange={handleFilterChange}
            >
              <option value="">Все статусы</option>
              <option value="completed">Успешные</option>
              <option value="missed">Пропущенные</option>
            </select>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 w-12"></th>
              <th className="px-6 py-4">Дата</th>
              <th className="px-6 py-4">Номер</th>
              <th className="px-6 py-4">Длительность</th>
              <th className="px-6 py-4">Статус</th>
              <th className="px-6 py-4">Тональность</th>
              <th className="px-6 py-4 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {calls.map((call) => (
              <React.Fragment key={call.id}>
                <tr className={`hover:bg-gray-50 transition ${expandedRow === call.id ? 'bg-blue-50' : ''}`}>
                  <td className="px-6 py-4">
                    {call.audio_url && (
                      <button 
                        onClick={() => togglePlay(call.audio_url, call.id)}
                        className={`p-2 rounded-full hover:bg-blue-100 transition ${playingId === call.id ? 'text-blue-600' : 'text-gray-400'}`}
                      >
                        {playingId === call.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {formatDate(call.timestamp)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      call.source === 'ElevenLabs' 
                        ? 'bg-purple-100 text-purple-700' 
                        : call.source === 'Voximplant'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {call.source || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {call.caller_number}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{formatDuration(call.duration)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                      call.status === 'completed' 
                        ? 'bg-green-50 text-green-700 border-green-100' 
                        : 'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {call.status === 'completed' ? 'Успешный' : 'Пропущенный'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {call.sentiment && (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        call.sentiment === 'positive' ? 'bg-green-50 text-green-700 border-green-100' : 
                        call.sentiment === 'negative' ? 'bg-red-50 text-red-700 border-red-100' : 
                        'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {call.sentiment === 'positive' ? 'Позитив' : call.sentiment === 'negative' ? 'Негатив' : 'Нейтрально'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => toggleExpand(call.id)}
                      className="text-gray-400 hover:text-blue-600 transition"
                    >
                      {expandedRow === call.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </td>
                </tr>
                {expandedRow === call.id && (
                  <tr className="bg-gray-50">
                    <td colSpan="7" className="px-6 py-6">
                      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-inner">
                        <div className="flex items-start space-x-3 mb-4">
                          <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">Транскрибация разговора</h4>
                            <p className="text-xs text-gray-500 mt-1">Источник: {call.source}</p>
                          </div>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                          {call.transcription || 'Транскрибация отсутствует.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {calls.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  Записи не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CallsTable;
