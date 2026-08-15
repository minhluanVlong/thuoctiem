import React, { useState, useMemo } from 'react';
import {
  Droplets,
  PackageX,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { ExcludedItemRecord } from '../types/hospital';

interface ExcludedItemsTableProps {
  excludedItems: ExcludedItemRecord[];
}

export const ExcludedItemsTable: React.FC<ExcludedItemsTableProps> = ({
  excludedItems,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'INFUSION' | 'MEDICAL_SUPPLY' | 'ORAL_OR_OTHER'>('ALL');

  const filteredItems = useMemo(() => {
    let result = [...excludedItems];

    if (categoryFilter !== 'ALL') {
      result = result.filter((i) => i.category === categoryFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((i) =>
        i.itemName.toLowerCase().includes(q) ||
        i.patientName.toLowerCase().includes(q) ||
        (i.patientCode && i.patientCode.toLowerCase().includes(q)) ||
        i.reason.toLowerCase().includes(q)
      );
    }

    return result;
  }, [excludedItems, categoryFilter, searchTerm]);

  const infusionCount = excludedItems.filter((i) => i.category === 'INFUSION').length;
  const supplyCount = excludedItems.filter((i) => i.category === 'MEDICAL_SUPPLY').length;
  const otherCount = excludedItems.filter((i) => i.category === 'ORAL_OR_OTHER').length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Notice Header */}
      <div className="bg-blue-500/10 border-b border-blue-200 px-5 py-3.5 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-blue-900">
            DỮ LIỆU ĐÃ TỰ ĐỘNG LOẠI KHỎI SỔ THUỐC TIÊM ({excludedItems.length} DÒNG)
          </h3>
          <p className="text-xs text-blue-800 mt-0.5">
            Bao gồm dịch truyền tĩnh mạch (NaCl, Glucose, Ringer Lactate...), vật tư y tế (bơm tiêm, kim luồn, dây truyền...) và các dạng thuốc không phải tiêm theo quy chuẩn điều dưỡng.
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm mục đã loại trừ..."
            className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-xs"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              categoryFilter === 'ALL'
                ? 'bg-slate-800 text-white shadow-2xs font-semibold'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Tất cả ({excludedItems.length})
          </button>
          <button
            onClick={() => setCategoryFilter('INFUSION')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
              categoryFilter === 'INFUSION'
                ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            Dịch truyền ({infusionCount})
          </button>
          <button
            onClick={() => setCategoryFilter('MEDICAL_SUPPLY')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
              categoryFilter === 'MEDICAL_SUPPLY'
                ? 'bg-rose-600 text-white shadow-2xs font-semibold'
                : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
            }`}
          >
            <PackageX className="w-3.5 h-3.5" />
            Vật tư y tế ({supplyCount})
          </button>
          {otherCount > 0 && (
            <button
              onClick={() => setCategoryFilter('ORAL_OR_OTHER')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                categoryFilter === 'ORAL_OR_OTHER'
                  ? 'bg-slate-600 text-white shadow-2xs font-semibold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Khác ({otherCount})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs">
          Không có mục nào phù hợp với bộ lọc
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 uppercase font-bold text-[11px]">
                <th className="py-2.5 px-3 text-center w-12">STT</th>
                <th className="py-2.5 px-3.5 min-w-[160px]">Bệnh Nhân</th>
                <th className="py-2.5 px-3.5 min-w-[220px]">Tên Mục / Thuốc / Vật Tư</th>
                <th className="py-2.5 px-3 text-center w-28">Phân Loại</th>
                <th className="py-2.5 px-3 text-center w-24">Đơn Vị</th>
                <th className="py-2.5 px-3.5 min-w-[200px]">Lý Do Loại Trừ Khỏi Sổ Tiêm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <div className="font-semibold text-slate-800">{item.patientName}</div>
                    {item.patientCode && (
                      <div className="text-[11px] font-mono text-slate-400">{item.patientCode}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-3.5 font-medium text-slate-900">
                    {item.itemName}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {item.category === 'INFUSION' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                        <Droplets className="w-3 h-3" /> Dịch truyền
                      </span>
                    ) : item.category === 'MEDICAL_SUPPLY' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                        <PackageX className="w-3 h-3" /> Vật tư y tế
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        Khác
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-500">
                    {item.unit || '—'}
                  </td>
                  <td className="py-2.5 px-3.5 text-slate-600">
                    {item.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
