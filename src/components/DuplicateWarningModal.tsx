import React, { useMemo } from 'react';
import {
  AlertTriangle,
  X,
  Trash2,
  Info
} from 'lucide-react';
import { ProcessedInjectionRecord } from '../types/hospital';

interface DuplicateWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  injections?: ProcessedInjectionRecord[];
  duplicates?: ProcessedInjectionRecord[];
  onRemoveRecord?: (id: string) => void;
  onRemoveDuplicate?: (id: string) => void;
  onKeepAll: () => void;
}

export const DuplicateWarningModal: React.FC<DuplicateWarningModalProps> = ({
  isOpen,
  onClose,
  injections,
  duplicates,
  onRemoveRecord,
  onRemoveDuplicate,
  onKeepAll,
}) => {
  // Group duplicates by duplicateGroupKey
  const duplicateGroups = useMemo(() => {
    const map = new Map<string, ProcessedInjectionRecord[]>();
    const list = (injections && injections.length > 0) ? injections : (duplicates || []);

    list.forEach((item) => {
      if (item && item.isDuplicate && item.duplicateGroupKey) {
        const existing = map.get(item.duplicateGroupKey) || [];
        existing.push(item);
        map.set(item.duplicateGroupKey, existing);
      }
    });

    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      patientName: items[0]?.patientName || '',
      drugFullName: items[0]?.drugFullName || '',
      orderTime: items[0]?.orderTime || '',
      room: items[0]?.room || '',
      items,
    }));
  }, [injections, duplicates]);

  if (!isOpen) return null;

  const handleDelete = (id: string) => {
    if (onRemoveRecord) {
      onRemoveRecord(id);
    } else if (onRemoveDuplicate) {
      onRemoveDuplicate(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-orange-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-200" />
            <div>
              <h2 className="text-base font-bold">CẢNH BÁO TRÙNG DỮ LIỆU Y LỆNH</h2>
              <p className="text-xs text-orange-100">
                Phát hiện y lệnh cùng bệnh nhân, cùng tên thuốc, hàm lượng và giờ tiêm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-orange-200 hover:text-white hover:bg-orange-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-xs text-orange-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Nguyên tắc an toàn y tế:</span> Hệ thống không tự ý xóa dữ liệu trùng lặp từ file xuất. Điều dưỡng kiểm tra thực tế: nếu bác sĩ chỉ định 2 lần thực tế thì bấm &quot;Giữ lại cả hai&quot;, nếu do phần mềm HIS xuất đúp thì bấm &quot;Xóa bớt 1 dòng&quot;.
            </div>
          </div>

          {duplicateGroups.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Hiện tại không có nhóm y lệnh nào bị trùng lặp.
            </div>
          ) : (
            <div className="space-y-4">
              {duplicateGroups.map((grp) => (
                <div key={grp.key} className="border border-orange-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  {/* Group summary bar */}
                  <div className="bg-orange-100/60 px-4 py-2.5 flex items-center justify-between text-xs border-b border-orange-200">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{grp.patientName}</span>
                      <span className="text-slate-500">• Phòng {grp.room}</span>
                      <span className="font-semibold text-orange-800">• Thuốc: {grp.drugFullName}</span>
                      <span className="font-mono font-bold text-indigo-700">• Giờ: {grp.orderTime}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-orange-200 text-orange-800 rounded font-bold text-[10px]">
                      {grp.items.length} lần xuất hiện
                    </span>
                  </div>

                  {/* List of items in this duplicate group */}
                  <div className="p-3 divide-y divide-slate-100">
                    {grp.items.map((item) => (
                      <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 font-mono">Dòng #{item.stt}</span>
                          <span className="font-medium text-slate-800">{item.drugFullName}</span>
                          <span className="text-slate-500">({item.quantity} {item.unit})</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                            {item.route}
                          </span>
                        </div>

                        <button
                          onClick={() => handleDelete(item.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
                          title="Xóa bớt dòng y lệnh này khỏi sổ chính"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Xóa dòng này
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onKeepAll}
            className="px-4 py-2 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Xác nhận giữ nguyên tất cả y lệnh
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-slate-800 text-white hover:bg-slate-900 rounded-lg transition-colors"
          >
            Đã kiểm tra xong
          </button>
        </div>
      </div>
    </div>
  );
};
