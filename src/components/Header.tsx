import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Sparkles,
  Calendar,
  Building2,
  Stethoscope,
  BookOpen,
  Trash2
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
  onViewBook?: () => void;
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
  onViewBook,
  hasData,
}) => {
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Brand & Hospital Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white shadow-xs shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
                  SỔ THUỐC TIÊM – KHOA NỘI TỔNG HỢP NHI TRUYỀN NHIỄM
                </h1>
              </div>

              {/* Facility & Department editable */}
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                {isEditingInfo ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      placeholder="Tên Bệnh viện / Trung tâm"
                      className="px-2 py-0.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <span>/</span>
                    <input
                      type="text"
                      value={departmentName}
                      onChange={(e) => setDepartmentName(e.target.value)}
                      placeholder="Khoa điều trị"
                      className="px-2 py-0.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <button
                      onClick={() => setIsEditingInfo(false)}
                      className="px-2 py-0.5 text-xs bg-blue-700 text-white rounded hover:bg-blue-800"
                    >
                      Lưu
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingInfo(true)}
                    className="flex items-center gap-1.5 hover:text-blue-700 group text-left cursor-pointer"
                    title="Bấm để thay đổi tên Bệnh viện và Khoa"
                  >
                    <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                    <span className="font-medium text-slate-700">
                      {hospitalName}
                    </span>
                    <span>•</span>
                    <span className="font-bold text-blue-900">
                      {departmentName}
                    </span>
                    <span className="text-[10px] text-slate-400 group-hover:text-blue-600">(Sửa tên)</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Date Selector & Required Action Buttons (Section 24) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Input / Filter */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 shadow-xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <Calendar className="w-3.5 h-3.5 text-blue-700 mr-1.5 shrink-0" />
              <span className="font-semibold text-slate-700 mr-1.5 whitespace-nowrap">Ngày:</span>
              <input
                type="text"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                placeholder="Nhập ngày hoặc để trống"
                className="w-32 sm:w-36 px-1.5 py-0.5 font-bold text-blue-950 bg-white border border-slate-300 rounded outline-none focus:border-blue-600 text-xs"
                title="Nhập ngày y lệnh theo ý muốn (hoặc để trống)"
              />
              {availableDates.length > 0 && (
                <select
                  value={availableDates.includes(selectedDate) ? selectedDate : ''}
                  onChange={(e) => {
                    if (e.target.value !== undefined) {
                      setSelectedDate(e.target.value);
                    }
                  }}
                  className="ml-1 text-[11px] bg-white text-slate-700 rounded px-1 py-0.5 border border-slate-300 outline-none cursor-pointer hover:border-blue-500"
                  title="Chọn nhanh từ file Excel"
                >
                  <option value="">-- Chọn ngày --</option>
                  <option value="">Để trống</option>
                  <option value="ALL">Tất cả ngày</option>
                  {availableDates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Load Sample Demo */}
            {!hasData && (
              <button
                id="btn-load-demo"
                onClick={onLoadDemo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors shadow-xs cursor-pointer"
                title="Nạp dữ liệu mẫu thực tế BV Chợ Lách"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Dữ liệu mẫu BV
              </button>
            )}

            {/* 1. NÚT BẮT BUỘC: XEM SỔ THUỐC */}
            {hasData && onViewBook && (
              <button
                id="btn-view-book"
                onClick={onViewBook}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-300 hover:bg-blue-100 transition-all shadow-xs cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-700" />
                XEM SỔ THUỐC
              </button>
            )}

            {/* 2. NÚT BẮT BUỘC: IN SỔ */}
            <button
              id="btn-open-print"
              disabled={!hasData}
              onClick={onOpenPrint}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                hasData
                  ? 'bg-blue-700 text-white hover:bg-blue-800 active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              IN SỔ
            </button>

            {/* 3. NÚT BẮT BUỘC: XUẤT EXCEL */}
            <button
              id="btn-export-excel"
              disabled={!hasData}
              onClick={onExportExcel}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                hasData
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800 active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              XUẤT EXCEL
            </button>

            {/* 4. NÚT BẮT BUỘC: XÓA DỮ LIỆU */}
            {hasData && (
              <button
                id="btn-reset-data"
                onClick={onReset}
                title="Xóa toàn bộ dữ liệu hiện tại để tải file mới"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>XÓA DỮ LIỆU</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
