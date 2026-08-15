import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Sparkles,
  Calendar,
  Building2,
  Stethoscope,
  Clock
} from 'lucide-react';

interface HeaderProps {
  hospitalName: string;
  setHospitalName: (name: string) => void;
  departmentName: string;
  setDepartmentName: (name: string) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  availableDates: string[];
  onLoadDemo: () => void;
  onExportExcel: () => void;
  onOpenPrint: () => void;
  onReset: () => void;
  hasData: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  hospitalName,
  setHospitalName,
  departmentName,
  setDepartmentName,
  selectedDate,
  setSelectedDate,
  availableDates,
  onLoadDemo,
  onExportExcel,
  onOpenPrint,
  onReset,
  hasData,
}) => {
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  const todayStr = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Brand & Hospital Info */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  SỔ THUỐC TIÊM ĐIỆN TỬ
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                  Điều Dưỡng Nội Trú
                </span>
              </div>
              
              {/* Facility & Department clickable edit */}
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                {isEditingInfo ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      placeholder="Tên Bệnh viện / Trung tâm"
                      className="px-2 py-0.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                    <span>/</span>
                    <input
                      type="text"
                      value={departmentName}
                      onChange={(e) => setDepartmentName(e.target.value)}
                      placeholder="Khoa điều trị"
                      className="px-2 py-0.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                    <button
                      onClick={() => setIsEditingInfo(false)}
                      className="px-2 py-0.5 text-xs bg-teal-600 text-white rounded hover:bg-teal-700"
                    >
                      Lưu
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingInfo(true)}
                    className="flex items-center gap-1.5 hover:text-teal-700 group text-left"
                    title="Bấm để thay đổi tên Bệnh viện và Khoa"
                  >
                    <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600" />
                    <span className="font-medium text-slate-700 underline decoration-slate-300 decoration-dotted underline-offset-2">
                      {hospitalName}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-teal-800">
                      {departmentName}
                    </span>
                    <span className="text-[10px] text-slate-400 group-hover:text-teal-600">(Đổi tên)</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Date Selector & Primary Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date Picker / Date Filter */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500 mr-1.5 shrink-0" />
              <span className="font-medium text-slate-600 mr-1.5 whitespace-nowrap">Ngày thực hiện:</span>
              
              {availableDates.length > 1 ? (
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent font-bold text-teal-800 border-none outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">Tất cả các ngày ({availableDates.length} ngày)</option>
                  {availableDates.map((d) => (
                    <option key={d} value={d}>
                      {d} {d === todayStr ? '(Hôm nay)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-bold text-teal-800">
                  {selectedDate || todayStr}
                </span>
              )}
            </div>

            {/* Load Sample Demo */}
            {!hasData && (
              <button
                id="btn-load-demo"
                onClick={onLoadDemo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 transition-colors shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Dữ liệu mẫu (1-Click)
              </button>
            )}

            {/* Export Excel Button */}
            <button
              id="btn-export-excel"
              disabled={!hasData}
              onClick={onExportExcel}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                hasData
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Xuất Excel (3 Sheet)
            </button>

            {/* Print Button */}
            <button
              id="btn-open-print"
              disabled={!hasData}
              onClick={onOpenPrint}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                hasData
                  ? 'bg-teal-700 text-white hover:bg-teal-800 active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              In Sổ Tiêm (A4)
            </button>

            {/* Reset Data Button */}
            {hasData && (
              <button
                id="btn-reset-data"
                onClick={onReset}
                title="Làm mới để tải cặp file mới"
                className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
