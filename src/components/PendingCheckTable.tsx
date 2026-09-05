import React, { useState } from 'react';
import {
  AlertTriangle,
  HelpCircle,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Eye,
  X
} from 'lucide-react';
import { PendingCheckRecord, RawRoomRecord } from '../types/hospital';

interface PendingCheckTableProps {
  pendingChecks: PendingCheckRecord[];
  roomRecords?: RawRoomRecord[];
  onManualMatch?: (pendingItem: PendingCheckRecord) => void;
  onDismissPending: (id: string) => void;
}

export const PendingCheckTable: React.FC<PendingCheckTableProps> = ({
  pendingChecks = [],
  onDismissPending,
}) => {
  const safePending = pendingChecks || [];
  const [selectedItemForRaw, setSelectedItemForRaw] = useState<PendingCheckRecord | null>(null);

  if (safePending.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">
          Không có dữ liệu bất thường nào cần kiểm tra!
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Tất cả y lệnh thuốc tiêm đã được hệ thống trích xuất đầy đủ buồng giường, tên thuốc, liều và giờ y lệnh chính xác.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Notification - Section 19 */}
      <div className="bg-amber-500/10 border-b border-amber-200 px-5 py-3.5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wide">
            CÁC DÒNG CẦN KIỂM TRA ({safePending.length} TRƯỜNG HỢP)
          </h3>
          <p className="text-xs text-amber-800 mt-0.5">
            Theo nguyên tắc an toàn y lệnh: Tuyệt đối không tự ý suy đoán dữ liệu thiếu. Điều dưỡng có thể bấm vào dòng để xem chi tiết dữ liệu Excel gốc.
          </p>
        </div>
      </div>

      {/* Table: STT | Người bệnh | Nội dung bất thường */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/90 text-slate-800 border-b border-slate-200 uppercase font-bold text-[11px] tracking-wider">
              <th className="py-3 px-3 text-center w-12">STT</th>
              <th className="py-3 px-3.5 min-w-[200px]">Người Bệnh</th>
              <th className="py-3 px-3.5 min-w-[220px]">Thuốc & Y Lệnh</th>
              <th className="py-3 px-4 min-w-[280px]">Nội Dung Bất Thường</th>
              <th className="py-3 px-3 text-center w-36">Dữ Liệu Gốc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {safePending.map((item, idx) => (
              <tr
                key={item.id}
                onClick={() => setSelectedItemForRaw(item)}
                className="hover:bg-amber-50/60 transition-colors cursor-pointer group"
                title="Bấm vào để xem dữ liệu Excel gốc"
              >
                {/* STT */}
                <td className="py-3 px-3 text-center text-slate-500 font-medium">
                  {idx + 1}
                </td>

                {/* Người bệnh */}
                <td className="py-3 px-3.5">
                  <div className="font-bold text-slate-950 text-sm group-hover:text-amber-900">
                    {item.patientName}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    {item.age && <span>{item.age} tuổi</span>}
                    {item.gender && <span>• {item.gender}</span>}
                    {item.departmentRoomBed && (
                      <span className="font-mono text-slate-600 bg-slate-100 px-1 rounded">
                        {item.departmentRoomBed}
                      </span>
                    )}
                  </div>
                </td>

                {/* Thuốc & Y lệnh */}
                <td className="py-3 px-3.5">
                  <div className="font-bold text-slate-800">
                    {item.drugName} {item.strength || ''}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {item.rawDrugRecord?.orderTime && (
                      <span>Giờ: <strong>{item.rawDrugRecord.orderTime}</strong></span>
                    )}
                    {item.rawDrugRecord?.notes && (
                      <span className="ml-2 italic text-slate-600 font-mono">({item.rawDrugRecord.notes})</span>
                    )}
                  </div>
                </td>

                {/* Nội dung bất thường */}
                <td className="py-3 px-4">
                  <div className="inline-flex items-start gap-1.5 p-2 bg-amber-50 text-amber-900 rounded-lg border border-amber-200 text-xs w-full">
                    <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">{item.reason}</span>
                      {item.suggestedAction && (
                        <div className="text-[11px] text-amber-700 mt-0.5 italic">
                          → {item.suggestedAction}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Thao tác: Xem dữ liệu Excel gốc */}
                <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => setSelectedItemForRaw(item)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      Xem Excel
                    </button>
                    <button
                      onClick={() => onDismissPending(item.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Bỏ qua dòng này"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Raw Data Modal - Section 19 Mandate: "bấm vào dòng đó để xem dữ liệu Excel gốc" */}
      {selectedItemForRaw && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm">DỮ LIỆU EXCEL GỐC TỪ PHẦN MỀM BỆNH VIỆN</h3>
                  <p className="text-xs text-slate-300">
                    Bệnh nhân: <strong className="text-white">{selectedItemForRaw.patientName}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItemForRaw(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900">
                <span className="font-bold">Lý do cảnh báo:</span> {selectedItemForRaw.reason}
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2 uppercase text-[11px] tracking-wider">
                  Các cột dữ liệu gốc trích xuất từ file Excel:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Họ tên người bệnh:</span>
                    <span className="font-bold text-slate-900">{selectedItemForRaw.patientName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Tuổi / Ngày sinh:</span>
                    <span className="font-mono text-slate-900">{selectedItemForRaw.age || selectedItemForRaw.dob || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Khoa Buồng - Giường:</span>
                    <span className="font-bold text-blue-900">{selectedItemForRaw.departmentRoomBed || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Tên thuốc:</span>
                    <span className="font-bold text-slate-900">{selectedItemForRaw.drugName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Thời gian y lệnh:</span>
                    <span className="font-mono font-bold text-red-700">{selectedItemForRaw.rawDrugRecord?.orderTime || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Ghi chú:</span>
                    <span className="font-mono text-slate-800">{selectedItemForRaw.rawDrugRecord?.notes || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Tờ điều trị:</span>
                    <span className="text-slate-800">{selectedItemForRaw.rawDrugRecord?.treatmentSheet || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Loại:</span>
                    <span className="text-slate-800">{selectedItemForRaw.rawDrugRecord?.categoryType || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Số lượng:</span>
                    <span className="font-mono text-slate-800">{selectedItemForRaw.rawDrugRecord?.quantity} {selectedItemForRaw.rawDrugRecord?.unit}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Bác sĩ chỉ định:</span>
                    <span className="text-slate-800">{selectedItemForRaw.rawDrugRecord?.doctor || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedItemForRaw(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-slate-800 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
