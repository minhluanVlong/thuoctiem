import React, { useState } from 'react';
import {
  GitCompare,
  PlusCircle,
  RefreshCw,
  XCircle,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Filter,
  Check,
  AlertCircle
} from 'lucide-react';
import { DayComparisonReport, ProcessedInjectionRecord } from '../types/hospital';

interface MedicationReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DayComparisonReport | null;
  onSelectPatient?: (patientName: string) => void;
}

export const MedicationReconciliationModal: React.FC<MedicationReconciliationModalProps> = ({
  isOpen,
  onClose,
  report,
  onSelectPatient,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'NEW' | 'CHANGED' | 'DISCONTINUED' | 'UNCHANGED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen || !report) return null;

  const {
    currentDate,
    previousDate,
    totalToday,
    totalYesterday,
    newOrdersCount,
    discontinuedOrdersCount,
    changedOrdersCount,
    unchangedOrdersCount,
    patientSummaries,
    discontinuedList,
  } = report;

  // Filter patients based on tab & query
  const filteredSummaries = patientSummaries.filter(summary => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = summary.patientName.toLowerCase().includes(q);
      const matchRoom = summary.room.toLowerCase().includes(q);
      const matchDrug = [...summary.newOrders, ...summary.modifiedOrders, ...summary.discontinuedOrders]
        .some(d => d.drugFullName.toLowerCase().includes(q));
      if (!matchName && !matchRoom && !matchDrug) return false;
    }

    if (filterType === 'NEW') return summary.newOrders.length > 0;
    if (filterType === 'CHANGED') return summary.modifiedOrders.length > 0;
    if (filterType === 'DISCONTINUED') return summary.discontinuedOrders.length > 0;
    if (filterType === 'UNCHANGED') return summary.unchangedOrders.length > 0;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">SO SÁNH ĐỐI CHIẾU Y LỆNH THUỐC VỚI NGÀY HÔM TRƯỚC</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                  {currentDate} vs {previousDate}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Nhận diện tự động thuốc mới thêm, đổi liều lượng/giờ dùng, ngưng thuốc và thuốc duy trì
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card 1: New Orders */}
          <button
            onClick={() => setFilterType('NEW')}
            className={`p-3 rounded-xl border text-left transition-all ${
              filterType === 'NEW'
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                Thuốc mới chỉ định
              </span>
              <span className="text-lg font-bold text-emerald-700">{newOrdersCount}</span>
            </div>
            <p className="text-[11px] text-emerald-600/90 mt-1">Mới bổ sung hôm nay (+)</p>
          </button>

          {/* Card 2: Changed Orders */}
          <button
            onClick={() => setFilterType('CHANGED')}
            className={`p-3 rounded-xl border text-left transition-all ${
              filterType === 'CHANGED'
                ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20'
                : 'bg-white border-slate-200 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-800 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-purple-600" />
                Đổi liều / Đổi giờ
              </span>
              <span className="text-lg font-bold text-purple-700">{changedOrdersCount}</span>
            </div>
            <p className="text-[11px] text-purple-600/90 mt-1">Thay đổi cữ hoặc số lượng (⟳)</p>
          </button>

          {/* Card 3: Discontinued Orders */}
          <button
            onClick={() => setFilterType('DISCONTINUED')}
            className={`p-3 rounded-xl border text-left transition-all ${
              filterType === 'DISCONTINUED'
                ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20'
                : 'bg-white border-slate-200 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-800 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-600" />
                Thuốc đã ngưng / dừng
              </span>
              <span className="text-lg font-bold text-rose-700">{discontinuedOrdersCount}</span>
            </div>
            <p className="text-[11px] text-rose-600/90 mt-1">Hôm qua có, hôm nay dừng (✕)</p>
          </button>

          {/* Card 4: Unchanged Orders */}
          <button
            onClick={() => setFilterType('UNCHANGED')}
            className={`p-3 rounded-xl border text-left transition-all ${
              filterType === 'UNCHANGED'
                ? 'bg-slate-100 border-slate-500 ring-2 ring-slate-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-slate-500" />
                Thuốc duy trì đều
              </span>
              <span className="text-lg font-bold text-slate-800">{unchangedOrdersCount}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Tiếp tục phác đồ (=)</p>
          </button>
        </div>

        {/* Filter bar & Search */}
        <div className="px-5 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-600 mr-1">Bộ lọc:</span>
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterType === 'ALL'
                  ? 'bg-teal-700 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tất cả bệnh nhân ({patientSummaries.length})
            </button>
            <button
              onClick={() => setFilterType('NEW')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterType === 'NEW'
                  ? 'bg-emerald-700 text-white font-bold'
                  : 'bg-slate-100 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Có thuốc mới ({patientSummaries.filter(p => p.newOrders.length > 0).length})
            </button>
            <button
              onClick={() => setFilterType('CHANGED')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterType === 'CHANGED'
                  ? 'bg-purple-700 text-white font-bold'
                  : 'bg-slate-100 text-purple-800 hover:bg-purple-100'
              }`}
            >
              Có đổi liều ({patientSummaries.filter(p => p.modifiedOrders.length > 0).length})
            </button>
            <button
              onClick={() => setFilterType('DISCONTINUED')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterType === 'DISCONTINUED'
                  ? 'bg-rose-700 text-white font-bold'
                  : 'bg-slate-100 text-rose-800 hover:bg-rose-100'
              }`}
            >
              Có thuốc ngưng ({patientSummaries.filter(p => p.discontinuedOrders.length > 0).length})
            </button>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Lọc tên bệnh nhân, phòng, thuốc..."
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-teal-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Detailed Patient Comparison List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-100 space-y-4">
          {filteredSummaries.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Không tìm thấy bệnh nhân nào khớp với bộ lọc</p>
              <p className="text-xs text-slate-500 mt-1">Hãy thử chọn chế độ "Tất cả bệnh nhân" hoặc xóa từ khóa tìm kiếm</p>
            </div>
          ) : (
            filteredSummaries.map((summary) => (
              <div
                key={summary.patientName}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Patient Banner */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-600"></div>
                    <span className="font-bold text-sm text-slate-900">{summary.patientName}</span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                      {summary.room}
                    </span>
                    {summary.patientCode && (
                      <span className="text-xs text-slate-500 font-mono">[{summary.patientCode}]</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {summary.newOrders.length > 0 && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        +{summary.newOrders.length} Thuốc mới
                      </span>
                    )}
                    {summary.modifiedOrders.length > 0 && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800">
                        ⟳ {summary.modifiedOrders.length} Đổi liều/giờ
                      </span>
                    )}
                    {summary.discontinuedOrders.length > 0 && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800">
                        ✕ {summary.discontinuedOrders.length} Đã ngưng
                      </span>
                    )}
                  </div>
                </div>

                {/* Patient Drug Details Table */}
                <div className="divide-y divide-slate-100">
                  {/* 1. New Orders */}
                  {summary.newOrders.map((drug) => (
                    <div key={drug.id} className="p-3 bg-emerald-50/40 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white uppercase tracking-wider">
                          Mới
                        </span>
                        <div>
                          <div className="font-bold text-slate-900">{drug.drugFullName}</div>
                          <div className="text-slate-600 text-[11px] mt-0.5">
                            Liều: <strong>{drug.quantity} {drug.unit}</strong> • Giờ y lệnh: <strong>{drug.orderTime}</strong>
                            {drug.notes && <span className="ml-2 italic text-slate-500">({drug.notes})</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-emerald-800 font-semibold">
                        Bắt đầu chỉ định hôm nay
                      </div>
                    </div>
                  ))}

                  {/* 2. Modified Orders */}
                  {summary.modifiedOrders.map((drug) => (
                    <div key={drug.id} className="p-3 bg-purple-50/40 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white uppercase tracking-wider">
                          Đổi
                        </span>
                        <div>
                          <div className="font-bold text-slate-900">{drug.drugFullName}</div>
                          <div className="text-slate-600 text-[11px] mt-0.5 flex items-center gap-2">
                            <span>Hôm qua: <strong className="line-through text-slate-500">{drug.previousDayDetails?.quantity} {drug.unit} ({drug.previousDayDetails?.orderTime})</strong></span>
                            <ArrowRight className="w-3.5 h-3.5 text-purple-600" />
                            <span>Hôm nay: <strong className="text-purple-900">{drug.quantity} {drug.unit} ({drug.orderTime})</strong></span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-purple-800 font-semibold">
                        {drug.changeStatus === 'CHANGED_DOSE' ? 'Thay đổi liều lượng' : 'Thay đổi giờ dùng'}
                      </div>
                    </div>
                  ))}

                  {/* 3. Discontinued Orders */}
                  {summary.discontinuedOrders.map((drug) => (
                    <div key={drug.id} className="p-3 bg-rose-50/40 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white uppercase tracking-wider">
                          Ngưng
                        </span>
                        <div>
                          <div className="font-semibold text-rose-950 line-through">{drug.drugFullName}</div>
                          <div className="text-rose-700 text-[11px] mt-0.5">
                            Y lệnh cũ: {drug.quantity} {drug.unit} ({drug.orderTime})
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-rose-700 font-semibold">
                        Bác sĩ đã cho dừng thuốc
                      </div>
                    </div>
                  ))}

                  {/* 4. Unchanged Orders (Collapsible or subtle) */}
                  {filterType === 'ALL' && summary.unchangedOrders.length > 0 && (
                    <div className="p-2.5 bg-slate-50/50 text-[11px] text-slate-600 flex items-center justify-between">
                      <span>Duy trì {summary.unchangedOrders.length} thuốc không thay đổi: {summary.unchangedOrders.map(u => u.originalDrugName || u.drugFullName).join(', ')}</span>
                      <span className="text-slate-400 font-semibold">Duy trì (=)</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-600">
            Dữ liệu đối chiếu tự động giúp điều dưỡng nắm bắt chính xác mọi biến động y lệnh giữa 2 ca trực.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 font-bold bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-xs"
          >
            Đóng bảng đối chiếu
          </button>
        </div>
      </div>
    </div>
  );
};
