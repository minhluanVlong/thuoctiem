import React from 'react';
import {
  Users,
  Syringe,
  Home,
  AlertTriangle,
  Droplets,
  PackageX,
  Copy,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { ProcessingReport } from '../types/hospital';

interface StatsCardsProps {
  report: ProcessingReport;
  activeTab: 'MAIN_INJECTIONS' | 'PENDING_CHECKS' | 'EXCLUDED_ITEMS';
  setActiveTab: (tab: 'MAIN_INJECTIONS' | 'PENDING_CHECKS' | 'EXCLUDED_ITEMS') => void;
  onOpenDuplicates: () => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  report,
  activeTab,
  setActiveTab,
  onOpenDuplicates,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
      {/* 1. Tổng bệnh nhân nội trú có tiêm */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Tổng bệnh nhân</span>
          <Users className="w-4 h-4 text-teal-600" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-slate-900">{report.patientsWithRoom}</span>
          <span className="text-[11px] text-slate-500">người bệnh</span>
        </div>
        <div className="text-[10px] text-emerald-600 mt-1 font-medium flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Đã phân buồng giường
        </div>
      </div>

      {/* 2. Tổng lượt thuốc tiêm hợp lệ */}
      <div
        onClick={() => setActiveTab('MAIN_INJECTIONS')}
        className={`bg-white rounded-xl border p-3.5 shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
          activeTab === 'MAIN_INJECTIONS'
            ? 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/20'
            : 'border-slate-200 hover:border-teal-300'
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-800">Thuốc tiêm hợp lệ</span>
          <Syringe className="w-4 h-4 text-teal-600" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-teal-900">{report.totalValidInjections}</span>
          <span className="text-[11px] text-teal-700">lượt tiêm</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-1">
          Đủ thông tin 24h & phòng
        </div>
      </div>

      {/* 3. Dữ liệu cần kiểm tra */}
      <div
        onClick={() => setActiveTab('PENDING_CHECKS')}
        className={`bg-white rounded-xl border p-3.5 shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
          report.totalPendingChecks > 0
            ? 'border-amber-300 bg-amber-50/30 hover:bg-amber-50/60'
            : 'border-slate-200'
        } ${activeTab === 'PENDING_CHECKS' ? 'ring-2 ring-amber-500/30' : ''}`}
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Cần kiểm tra</span>
          <AlertTriangle className={`w-4 h-4 ${report.totalPendingChecks > 0 ? 'text-amber-600 animate-bounce' : 'text-slate-400'}`} />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-2xl font-bold ${report.totalPendingChecks > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
            {report.totalPendingChecks}
          </span>
          <span className="text-[11px] text-slate-500">dòng</span>
        </div>
        <div className="text-[10px] text-amber-700 mt-1 font-medium truncate">
          {report.totalPendingChecks > 0 ? 'Chưa ghép phòng / Thiếu giờ' : 'Đạt chuẩn 100%'}
        </div>
      </div>

      {/* 4. Dịch truyền bị loại */}
      <div
        onClick={() => setActiveTab('EXCLUDED_ITEMS')}
        className={`bg-white rounded-xl border p-3.5 shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
          activeTab === 'EXCLUDED_ITEMS'
            ? 'border-blue-400 ring-2 ring-blue-500/20 bg-blue-50/20'
            : 'border-slate-200 hover:border-blue-300'
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">Dịch truyền loại</span>
          <Droplets className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-slate-900">{report.totalExcludedInfusions}</span>
          <span className="text-[11px] text-slate-500">chai/túi</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-1">
          NaCl, Glucose, Ringer...
        </div>
      </div>

      {/* 5. Vật tư y tế bị loại */}
      <div
        onClick={() => setActiveTab('EXCLUDED_ITEMS')}
        className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between cursor-pointer hover:border-slate-300"
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">Vật tư y tế loại</span>
          <PackageX className="w-4 h-4 text-rose-500" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-slate-900">{report.totalExcludedSupplies}</span>
          <span className="text-[11px] text-slate-500">mục</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-1">
          Bơm tiêm, kim luồn, găng...
        </div>
      </div>

      {/* 6. Cảnh báo trùng y lệnh */}
      <div
        onClick={report.duplicateWarningCount > 0 ? onOpenDuplicates : undefined}
        className={`bg-white rounded-xl border p-3.5 shadow-xs flex flex-col justify-between ${
          report.duplicateWarningCount > 0
            ? 'border-orange-300 bg-orange-50/30 cursor-pointer hover:bg-orange-50/60'
            : 'border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-800">Cảnh báo trùng</span>
          <Copy className="w-4 h-4 text-orange-600" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-2xl font-bold ${report.duplicateWarningCount > 0 ? 'text-orange-700' : 'text-slate-700'}`}>
            {report.duplicateWarningCount}
          </span>
          <span className="text-[11px] text-slate-500">lượt</span>
        </div>
        <div className="text-[10px] text-orange-700 mt-1 font-medium truncate">
          {report.duplicateWarningCount > 0 ? 'Bấm để kiểm tra trùng' : 'Không trùng lặp'}
        </div>
      </div>

      {/* 7. Tổng dòng file gốc */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Tổng dòng gốc</span>
          <FileSpreadsheet className="w-4 h-4 text-slate-500" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-slate-900">{report.totalDrugRows}</span>
          <span className="text-[11px] text-slate-500">dòng</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-1">
          Tỷ lệ khớp: {report.totalDrugRows > 0 ? Math.round((report.totalValidInjections / report.totalDrugRows) * 100) : 0}%
        </div>
      </div>
    </div>
  );
};
