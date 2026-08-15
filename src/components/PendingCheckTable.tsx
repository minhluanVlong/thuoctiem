import React from 'react';
import {
  AlertTriangle,
  HelpCircle,
  Edit3,
  UserCheck,
  Building,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { PendingCheckRecord, RawRoomRecord } from '../types/hospital';

interface PendingCheckTableProps {
  pendingChecks: PendingCheckRecord[];
  roomRecords: RawRoomRecord[];
  onManualMatch: (pendingItem: PendingCheckRecord) => void;
  onDismissPending: (id: string) => void;
}

export const PendingCheckTable: React.FC<PendingCheckTableProps> = ({
  pendingChecks,
  roomRecords,
  onManualMatch,
  onDismissPending,
}) => {
  if (pendingChecks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">
          Tuyệt vời! Không có dữ liệu nào cần kiểm tra
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Tất cả y lệnh thuốc tiêm đã được hệ thống đối chiếu chính xác với danh sách phòng bệnh và thời gian y lệnh hợp lệ.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Notification */}
      <div className="bg-amber-500/10 border-b border-amber-200 px-5 py-3.5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-amber-900">
            DANH SÁCH DỮ LIỆU CẦN KIỂM TRA ({pendingChecks.length} DÒNG)
          </h3>
          <p className="text-xs text-amber-800 mt-0.5">
            Theo nguyên tắc an toàn y tế: các dòng dữ liệu chưa tìm thấy phòng, trùng tên chưa xác định, hoặc thiếu giờ y lệnh sẽ KHÔNG tự ý đưa vào sổ chính. Điều dưỡng có thể bấm &quot;Xử lý thủ công&quot; để gán phòng hoặc xác nhận.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 uppercase font-bold text-[11px] tracking-wider">
              <th className="py-3 px-3 text-center w-12">STT</th>
              <th className="py-3 px-3.5 min-w-[180px]">Họ và Tên Bệnh Nhân</th>
              <th className="py-3 px-3.5 min-w-[200px]">Tên Thuốc / Y Lệnh</th>
              <th className="py-3 px-2.5 text-center w-24">Đường Dùng</th>
              <th className="py-3 px-2.5 text-center w-24">Thời Gian</th>
              <th className="py-3 px-4 min-w-[240px]">Lý Do Cần Kiểm Tra</th>
              <th className="py-3 px-3 text-center w-36">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {pendingChecks.map((item, idx) => (
              <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                {/* STT */}
                <td className="py-3 px-3 text-center text-slate-500 font-medium">
                  {idx + 1}
                </td>

                {/* Patient Name */}
                <td className="py-3 px-3.5">
                  <div className="font-bold text-slate-900 text-sm">
                    {item.patientName}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    {item.patientCode && (
                      <span className="font-mono bg-slate-100 px-1 rounded text-slate-600">
                        {item.patientCode}
                      </span>
                    )}
                    {item.age && <span>{item.age} tuổi</span>}
                    {item.gender && <span>• {item.gender}</span>}
                  </div>
                </td>

                {/* Drug Name */}
                <td className="py-3 px-3.5">
                  <div className="font-semibold text-slate-800">
                    {item.drugName} {item.strength || ''}
                  </div>
                  {item.rawDrugRecord?.dosageForm && (
                    <div className="text-[11px] text-slate-400">
                      Dạng: {item.rawDrugRecord.dosageForm}
                    </div>
                  )}
                </td>

                {/* Route */}
                <td className="py-3 px-2.5 text-center">
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                    {item.route || 'Chưa rõ'}
                  </span>
                </td>

                {/* Order Time */}
                <td className="py-3 px-2.5 text-center font-mono font-bold text-slate-700">
                  {item.orderTime || '—'}
                </td>

                {/* Reason */}
                <td className="py-3 px-4">
                  <div className="flex items-start gap-1.5 text-amber-900 font-medium">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{item.reason}</span>
                  </div>
                  {item.possibleMatches && item.possibleMatches.length > 0 && (
                    <div className="mt-1.5 p-1.5 bg-amber-50/80 rounded border border-amber-200 text-[11px] text-amber-800">
                      <span className="font-semibold">Ứng viên trùng tên trong DS phòng:</span>
                      <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                        {item.possibleMatches.map((cand, cIdx) => (
                          <li key={cIdx}>
                            Phòng <strong>{cand.room}</strong> - Giường {cand.bed || '—'} (Mã: {cand.patientCode || 'Không có'}, {cand.age || '—'} tuổi)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </td>

                {/* Actions */}
                <td className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => onManualMatch(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-2xs"
                      title="Gán phòng giường hoặc bổ sung thông tin để đưa vào sổ chính"
                    >
                      <Edit3 className="w-3 h-3" />
                      Xử lý
                    </button>

                    <button
                      onClick={() => onDismissPending(item.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Loại bỏ dòng này khỏi danh sách kiểm tra"
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
    </div>
  );
};
