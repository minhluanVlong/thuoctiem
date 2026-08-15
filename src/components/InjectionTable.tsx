import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  Layers,
  LayoutList,
  Calendar,
  Building,
  User,
  Pill,
  Syringe,
  ChevronDown,
  ChevronRight,
  Edit2,
  Check,
  X,
  Sparkles,
  Plus
} from 'lucide-react';
import { ProcessedInjectionRecord, SortMode } from '../types/hospital';
import { sortInjectionRecords } from '../utils/matchingEngine';

interface InjectionTableProps {
  injections: ProcessedInjectionRecord[];
  onToggleExecution: (id: string) => void;
  onBatchToggleExecution?: (ids: string[], status: boolean) => void;
  onOpenDuplicateModal: () => void;
  onUpdateRecord?: (updated: ProcessedInjectionRecord) => void;
  onBatchUpdateRoute?: (route: string) => void;
}

export type ViewGroupingMode = 'FLAT' | 'GROUP_BY_ROOM' | 'GROUP_BY_TIME';

const COMMON_ROUTES = [
  'Tiêm TM (IV)',
  'Tiêm bắp (IM)',
  'Truyền TM',
  'Tiêm dưới da (SC)',
  'Tiêm trong da (ID)',
  'Tiêm khớp',
  'Uống (PO)',
];

export const InjectionTable: React.FC<InjectionTableProps> = ({
  injections,
  onToggleExecution,
  onBatchToggleExecution,
  onOpenDuplicateModal,
  onUpdateRecord,
  onBatchUpdateRoute,
}) => {
  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string>('ALL');
  const [selectedRoute, setSelectedRoute] = useState<string>('ALL');
  const [selectedShift, setSelectedShift] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [missingRouteOnly, setMissingRouteOnly] = useState<boolean>(false);
  const [sortMode, setSortMode] = useState<SortMode>('ROOM_PATIENT_TIME');
  const [viewMode, setViewMode] = useState<ViewGroupingMode>('FLAT');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'route' | 'age' | 'room' | 'bed' | 'orderTime' | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Extract distinct filter values
  const roomList = useMemo(() => {
    const set = new Set<string>();
    injections.forEach((item) => {
      if (item.room) set.add(item.room);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  }, [injections]);

  const routeList = useMemo(() => {
    const set = new Set<string>();
    injections.forEach((item) => {
      if (item.route && item.route.trim()) set.add(item.route.trim());
    });
    return Array.from(set).sort();
  }, [injections]);

  const missingRouteCount = useMemo(() => {
    return injections.filter((i) => !i.route || !i.route.trim()).length;
  }, [injections]);

  // Filter & Search Logic
  const filteredInjections = useMemo(() => {
    let result = [...injections];

    // Missing route filter
    if (missingRouteOnly) {
      result = result.filter((item) => !item.route || !item.route.trim());
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((item) =>
        item.patientName.toLowerCase().includes(q) ||
        item.drugFullName.toLowerCase().includes(q) ||
        item.room.toLowerCase().includes(q) ||
        (item.bed && item.bed.toLowerCase().includes(q)) ||
        (item.patientCode && item.patientCode.toLowerCase().includes(q)) ||
        (item.route && item.route.toLowerCase().includes(q)) ||
        (item.age && item.age.toLowerCase().includes(q)) ||
        item.orderTime.includes(q)
      );
    }

    // Room filter
    if (selectedRoom !== 'ALL') {
      result = result.filter((item) => item.room === selectedRoom);
    }

    // Route filter
    if (selectedRoute !== 'ALL') {
      result = result.filter((item) => item.route === selectedRoute);
    }

    // Status filter
    if (selectedStatus === 'EXECUTED') {
      result = result.filter((item) => item.isExecuted);
    } else if (selectedStatus === 'PENDING') {
      result = result.filter((item) => !item.isExecuted);
    }

    // Shift / Time slot filter
    if (selectedShift !== 'ALL') {
      result = result.filter((item) => {
        const hour = parseInt(item.orderTime.split(':')[0], 10);
        if (isNaN(hour)) return true;
        if (selectedShift === 'MORNING') return hour >= 6 && hour < 12;   // 06:00 - 11:59
        if (selectedShift === 'AFTERNOON') return hour >= 12 && hour < 18; // 12:00 - 17:59
        if (selectedShift === 'EVENING') return hour >= 18 && hour < 24;  // 18:00 - 23:59
        if (selectedShift === 'NIGHT') return hour >= 0 && hour < 6;      // 00:00 - 05:59
        return true;
      });
    }

    // Apply Sorting
    sortInjectionRecords(result, sortMode);

    return result;
  }, [injections, searchTerm, selectedRoom, selectedRoute, selectedShift, selectedStatus, missingRouteOnly, sortMode]);

  // Grouping for ROOM mode
  const roomGroups = useMemo(() => {
    if (viewMode !== 'GROUP_BY_ROOM') return [];
    const groups: { room: string; items: ProcessedInjectionRecord[] }[] = [];
    const map = new Map<string, ProcessedInjectionRecord[]>();

    filteredInjections.forEach((item) => {
      const list = map.get(item.room) || [];
      list.push(item);
      map.set(item.room, list);
    });

    map.forEach((items, room) => {
      groups.push({ room, items });
    });

    return groups.sort((a, b) => a.room.localeCompare(b.room, 'vi', { numeric: true }));
  }, [filteredInjections, viewMode]);

  // Grouping for TIME mode
  const timeGroups = useMemo(() => {
    if (viewMode !== 'GROUP_BY_TIME') return [];
    const groups: { time: string; items: ProcessedInjectionRecord[] }[] = [];
    const map = new Map<string, ProcessedInjectionRecord[]>();

    filteredInjections.forEach((item) => {
      const list = map.get(item.orderTime) || [];
      list.push(item);
      map.set(item.orderTime, list);
    });

    map.forEach((items, time) => {
      groups.push({ time, items });
    });

    return groups.sort((a, b) => a.time.localeCompare(b.time));
  }, [filteredInjections, viewMode]);

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStartEdit = (item: ProcessedInjectionRecord, field: 'route' | 'age' | 'room' | 'bed' | 'orderTime') => {
    setEditingId(item.id);
    setEditingField(field);
    setEditValue(item[field] || '');
  };

  const handleSaveEdit = (item: ProcessedInjectionRecord) => {
    if (!editingField || !onUpdateRecord) return;
    const updated: ProcessedInjectionRecord = {
      ...item,
      [editingField]: editValue.trim(),
    };
    onUpdateRecord(updated);
    setEditingId(null);
    setEditingField(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingField(null);
  };

  const handleQuickSetRoute = (item: ProcessedInjectionRecord, route: string) => {
    if (!onUpdateRecord) return;
    onUpdateRecord({
      ...item,
      route,
      notes: item.notes?.replace('Chưa có đường dùng (cần bổ sung)', '').trim() || undefined,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Top Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 space-y-3">
        {/* Row 1: Search + View Modes + Count */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="input-search-injections"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên bệnh nhân, mã BN, thuốc, phòng, giờ, tuổi..."
              className="w-full pl-9 pr-4 py-2 bg-white rounded-lg border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all shadow-2xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-200/80 p-0.5 rounded-lg flex items-center text-xs">
              <button
                onClick={() => setViewMode('FLAT')}
                className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all ${
                  viewMode === 'FLAT'
                    ? 'bg-white text-teal-800 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                Danh sách bảng
              </button>
              <button
                onClick={() => setViewMode('GROUP_BY_ROOM')}
                className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all ${
                  viewMode === 'GROUP_BY_ROOM'
                    ? 'bg-white text-teal-800 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                Gom theo phòng
              </button>
              <button
                onClick={() => setViewMode('GROUP_BY_TIME')}
                className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all ${
                  viewMode === 'GROUP_BY_TIME'
                    ? 'bg-white text-teal-800 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Gom theo giờ
              </button>
            </div>
          </div>
        </div>

        {/* Missing Route Quick Action Banner */}
        {missingRouteCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Có <strong>{missingRouteCount}</strong> thuốc chưa có đường dùng trong file gốc:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-500 text-[11px]">Gán nhanh tất cả:</span>
              {['Tiêm TM (IV)', 'Truyền TM', 'Tiêm bắp (IM)', 'Tiêm dưới da (SC)'].map((r) => (
                <button
                  key={r}
                  onClick={() => onBatchUpdateRoute && onBatchUpdateRoute(r)}
                  className="px-2 py-0.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer"
                >
                  + {r}
                </button>
              ))}
              <button
                onClick={() => setMissingRouteOnly(!missingRouteOnly)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ml-1 ${
                  missingRouteOnly
                    ? 'bg-amber-600 text-white border-amber-700'
                    : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                }`}
              >
                {missingRouteOnly ? '✓ Đang lọc chưa có đường dùng' : 'Lọc danh sách này'}
              </button>
            </div>
          </div>
        )}

        {/* Row 2: Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Sắp xếp:</span>
            <select
              id="select-sort-mode"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="bg-transparent font-semibold text-slate-800 border-none outline-none cursor-pointer"
            >
              <option value="ROOM_PATIENT_TIME">Phòng → Bệnh nhân → Giờ</option>
              <option value="TIME">Thời gian y lệnh (00:00 → 23:59)</option>
              <option value="PATIENT_NAME">Tên bệnh nhân (A → Z)</option>
              <option value="BED">Giường bệnh</option>
            </select>
          </div>

          {/* Room Filter */}
          <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-slate-500 font-medium">Phòng:</span>
            <select
              id="select-filter-room"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 border-none outline-none cursor-pointer max-w-[120px]"
            >
              <option value="ALL">Tất cả ({roomList.length} phòng)</option>
              {roomList.map((r) => (
                <option key={r} value={r}>
                  Phòng {r}
                </option>
              ))}
            </select>
          </div>

          {/* Shift / Time Slot Filter */}
          <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-slate-500 font-medium">Khung giờ:</span>
            <select
              id="select-filter-shift"
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 border-none outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả các giờ</option>
              <option value="MORNING">Ca Sáng (06:00 - 11:59)</option>
              <option value="AFTERNOON">Ca Chiều (12:00 - 17:59)</option>
              <option value="EVENING">Ca Tối (18:00 - 23:59)</option>
              <option value="NIGHT">Ca Đêm (00:00 - 05:59)</option>
            </select>
          </div>

          {/* Route Filter */}
          {routeList.length > 0 && (
            <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-medium">Đường dùng:</span>
              <select
                id="select-filter-route"
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 border-none outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả đường dùng</option>
                {routeList.map((rt) => (
                  <option key={rt} value={rt}>
                    {rt}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-slate-500 font-medium">Trạng thái:</span>
            <select
              id="select-filter-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 border-none outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chưa tiêm</option>
              <option value="EXECUTED">Đã tiêm</option>
            </select>
          </div>

          {/* Active Filter Clear */}
          {(searchTerm || selectedRoom !== 'ALL' || selectedRoute !== 'ALL' || selectedShift !== 'ALL' || selectedStatus !== 'ALL' || missingRouteOnly) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedRoom('ALL');
                setSelectedRoute('ALL');
                setSelectedShift('ALL');
                setSelectedStatus('ALL');
                setMissingRouteOnly(false);
              }}
              className="text-teal-700 font-medium hover:underline ml-auto"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Primary Table Render */}
      {filteredInjections.length === 0 ? (
        <div className="text-center py-16 px-4">
          <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">Không tìm thấy y lệnh thuốc tiêm phù hợp</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc điều chỉnh các bộ lọc phòng / khung giờ.
          </p>
        </div>
      ) : viewMode === 'FLAT' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 uppercase font-bold text-[11px] tracking-wider">
                <th className="py-3 px-3 text-center w-12">STT</th>
                <th className="py-3 px-3.5 min-w-[200px]">Họ và Tên Bệnh Nhân & Tuổi</th>
                <th className="py-3 px-2.5 text-center w-24">Phòng</th>
                <th className="py-3 px-2.5 text-center w-20">Giường</th>
                <th className="py-3 px-4 min-w-[220px]">Thuốc Tiêm / Truyền & Hàm Lượng</th>
                <th className="py-3 px-2.5 text-center min-w-[150px]">Đường Dùng</th>
                <th className="py-3 px-3 text-center w-28">Thời Gian Y Lệnh</th>
                <th className="py-3 px-3 text-center w-28">Thực Hiện</th>
                <th className="py-3 px-3 text-center w-28">Cảnh Báo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredInjections.map((item, idx) => {
                const isEditingRoute = editingId === item.id && editingField === 'route';
                const isEditingAge = editingId === item.id && editingField === 'age';
                const isEditingRoom = editingId === item.id && editingField === 'room';
                const isEditingBed = editingId === item.id && editingField === 'bed';
                const isEditingTime = editingId === item.id && editingField === 'orderTime';

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-teal-50/40 transition-colors ${
                      item.isExecuted ? 'bg-emerald-50/20' : ''
                    } ${item.isDuplicate ? 'bg-orange-50/30' : ''}`}
                  >
                    {/* STT */}
                    <td className="py-3 px-3 text-center text-slate-500 font-medium">
                      {idx + 1}
                    </td>

                    {/* Patient Name + Code + Age + Gender */}
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900 text-sm">
                        {item.patientName}
                      </div>
                      <div className="flex items-center flex-wrap gap-2 text-[11px] text-slate-500 mt-1">
                        {item.patientCode && (
                          <span className="font-mono font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {item.patientCode}
                          </span>
                        )}

                        {/* Inline Age display / editor */}
                        {isEditingAge ? (
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              placeholder="Tuổi"
                              className="w-14 px-1.5 py-0.5 text-[11px] border border-teal-500 rounded bg-white"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(item)}
                              className="text-emerald-700 hover:bg-emerald-100 p-0.5 rounded"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-slate-400 hover:bg-slate-100 p-0.5 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(item, 'age')}
                            title="Bấm để chỉnh sửa hoặc thêm tuổi"
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium transition-colors ${
                              item.age
                                ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                : 'bg-amber-50 text-amber-700 border border-dashed border-amber-300 hover:bg-amber-100'
                            }`}
                          >
                            <span>{item.age ? `${item.age} tuổi` : '+ Thêm tuổi'}</span>
                            <Edit2 className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        )}

                        {item.gender && <span className="text-slate-600">• {item.gender}</span>}
                      </div>
                    </td>

                    {/* Room */}
                    <td className="py-3 px-2.5 text-center">
                      {isEditingRoom ? (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-16 px-1.5 py-0.5 text-xs border border-teal-500 rounded bg-white text-center"
                            autoFocus
                          />
                          <button onClick={() => handleSaveEdit(item)} className="text-emerald-700">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(item, 'room')}
                          title="Bấm để sửa phòng"
                          className="inline-block px-2.5 py-1 rounded-md font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200 hover:border-teal-400 transition-colors"
                        >
                          {item.room || 'Chưa xếp'}
                        </button>
                      )}
                    </td>

                    {/* Bed */}
                    <td className="py-3 px-2.5 text-center">
                      {isEditingBed ? (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-14 px-1.5 py-0.5 text-xs border border-teal-500 rounded bg-white text-center"
                            autoFocus
                          />
                          <button onClick={() => handleSaveEdit(item)} className="text-emerald-700">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(item, 'bed')}
                          title="Bấm để sửa giường"
                          className="inline-block px-2 py-0.5 rounded text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 hover:border-teal-400 transition-colors"
                        >
                          {item.bed || '—'}
                        </button>
                      )}
                    </td>

                    {/* Drug Name & Strength */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-teal-900 text-sm">
                        {item.drugFullName}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        {item.quantity && (
                          <span>
                            Số lượng: <strong className="text-slate-700">{item.quantity}</strong> {item.unit}
                          </span>
                        )}
                        {item.activeIngredient && (
                          <span className="truncate max-w-[160px]" title={`Hoạt chất: ${item.activeIngredient}`}>
                            • HC: {item.activeIngredient}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Route (Đường dùng) with Quick-Select Dropdown & Custom Editing */}
                    <td className="py-3 px-2.5 text-center">
                      {isEditingRoute ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              placeholder="Đường dùng..."
                              className="w-24 px-1.5 py-0.5 text-xs border border-teal-500 rounded bg-white"
                              autoFocus
                            />
                            <button onClick={() => handleSaveEdit(item)} className="text-emerald-700">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={handleCancelEdit} className="text-slate-400">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {/* Quick suggestions */}
                          <div className="flex flex-wrap gap-1 justify-center max-w-[180px]">
                            {COMMON_ROUTES.slice(0, 4).map((r) => (
                              <button
                                key={r}
                                onClick={() => {
                                  setEditValue(r);
                                  handleQuickSetRoute(item, r);
                                  setEditingId(null);
                                  setEditingField(null);
                                }}
                                className="px-1 py-0.5 text-[10px] bg-slate-100 hover:bg-teal-100 rounded text-slate-700"
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : item.route && item.route.trim() ? (
                        <div className="inline-flex items-center gap-1 group">
                          <button
                            onClick={() => handleStartEdit(item, 'route')}
                            title="Bấm để đổi đường dùng"
                            className="inline-block px-2.5 py-1 rounded-full font-bold text-[11px] bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 transition-colors"
                          >
                            {item.route}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => handleStartEdit(item, 'route')}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-colors animate-pulse hover:animate-none"
                          >
                            <Plus className="w-3 h-3" />
                            Chọn đường dùng
                          </button>
                          {/* Quick buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleQuickSetRoute(item, 'Tiêm TM (IV)')}
                              className="text-[10px] text-teal-700 bg-teal-50 hover:bg-teal-100 px-1 py-0.5 rounded border border-teal-200"
                            >
                              IV
                            </button>
                            <button
                              onClick={() => handleQuickSetRoute(item, 'Tiêm bắp (IM)')}
                              className="text-[10px] text-teal-700 bg-teal-50 hover:bg-teal-100 px-1 py-0.5 rounded border border-teal-200"
                            >
                              IM
                            </button>
                            <button
                              onClick={() => handleQuickSetRoute(item, 'Truyền TM')}
                              className="text-[10px] text-teal-700 bg-teal-50 hover:bg-teal-100 px-1 py-0.5 rounded border border-teal-200"
                            >
                              Truyền
                            </button>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Order Time (Strict 24h) */}
                    <td className="py-3 px-3 text-center">
                      {isEditingTime ? (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="08:00"
                            className="w-16 px-1.5 py-0.5 text-xs border border-teal-500 rounded bg-white text-center font-mono"
                            autoFocus
                          />
                          <button onClick={() => handleSaveEdit(item)} className="text-emerald-700">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(item, 'orderTime')}
                          title="Bấm để sửa giờ y lệnh"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-2xs hover:bg-indigo-100 transition-colors"
                        >
                          <Clock className="w-3 h-3 text-indigo-600" />
                          {item.orderTime || '08:00'}
                        </button>
                      )}
                    </td>

                    {/* Nursing Administration Checkbox */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onToggleExecution(item.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-xs transition-all ${
                          item.isExecuted
                            ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                            : 'bg-slate-100 text-slate-600 border border-slate-300 hover:border-emerald-500 hover:text-emerald-700'
                        }`}
                      >
                        {item.isExecuted ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Đã tiêm
                          </>
                        ) : (
                          <>
                            <Circle className="w-3.5 h-3.5" />
                            Chưa tiêm
                          </>
                        )}
                      </button>
                    </td>

                    {/* Duplicate / Audit Warning */}
                    <td className="py-3 px-3 text-center">
                      {item.isDuplicate ? (
                        <button
                          onClick={onOpenDuplicateModal}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200"
                          title="Trùng lặp y lệnh: cùng bệnh nhân, thuốc, hàm lượng, giờ"
                        >
                          <AlertTriangle className="w-3 h-3 text-orange-600" />
                          Trùng lệnh
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Hợp lệ</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'GROUP_BY_ROOM' ? (
        /* Group by Room View */
        <div className="p-4 space-y-4">
          {roomGroups.map((grp) => {
            const isCollapsed = collapsedGroups[grp.room];
            const groupExecuted = grp.items.filter((i) => i.isExecuted).length;

            return (
              <div key={grp.room} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                {/* Room Group Header */}
                <div
                  onClick={() => toggleGroupCollapse(grp.room)}
                  className="bg-slate-100 px-4 py-3 flex items-center justify-between cursor-pointer select-none hover:bg-slate-200/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-teal-700 text-white font-bold rounded text-xs">
                        PHÒNG {grp.room}
                      </span>
                      <span className="text-xs text-slate-600 font-medium">
                        ({grp.items.length} lượt tiêm • {new Set(grp.items.map(i => i.patientName)).size} bệnh nhân)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-600">
                      Tiến độ: <strong>{groupExecuted}/{grp.items.length}</strong>
                    </span>
                    {onBatchToggleExecution && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const allDone = groupExecuted === grp.items.length;
                          onBatchToggleExecution(grp.items.map(i => i.id), !allDone);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded font-semibold text-slate-700 transition-colors"
                      >
                        {groupExecuted === grp.items.length ? 'Bỏ tích phòng này' : 'Tích xong cả phòng'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Room Table */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">STT</th>
                          <th className="py-2.5 px-3 min-w-[180px]">Bệnh nhân & Tuổi</th>
                          <th className="py-2.5 px-2 text-center w-20">Giường</th>
                          <th className="py-2.5 px-3 min-w-[200px]">Thuốc tiêm / Dịch truyền</th>
                          <th className="py-2.5 px-2 text-center w-28">Đường dùng</th>
                          <th className="py-2.5 px-2 text-center w-24">Giờ tiêm</th>
                          <th className="py-2.5 px-3 text-center w-28">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {grp.items.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {item.patientName}
                              <span className="text-[11px] text-slate-500 font-normal ml-2">
                                ({item.age ? `${item.age}t` : 'chưa có tuổi'})
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span className="px-1.5 py-0.5 bg-slate-100 rounded font-medium text-slate-700">
                                {item.bed || '—'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-teal-900">{item.drugFullName}</div>
                              <div className="text-[11px] text-slate-500">{item.quantity} {item.unit}</div>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              {item.route ? (
                                <span className="px-2 py-0.5 bg-sky-50 text-sky-800 rounded-full font-semibold text-[11px]">
                                  {item.route}
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleQuickSetRoute(item, 'Tiêm TM (IV)')}
                                  className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold"
                                >
                                  + IV
                                </button>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800">
                              {item.orderTime}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => onToggleExecution(item.id)}
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  item.isExecuted
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {item.isExecuted ? '✓ Đã tiêm' : 'Chưa tiêm'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Group by Time View */
        <div className="p-4 space-y-4">
          {timeGroups.map((grp) => {
            const isCollapsed = collapsedGroups[grp.time];
            const groupExecuted = grp.items.filter((i) => i.isExecuted).length;

            return (
              <div key={grp.time} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                {/* Time Group Header */}
                <div
                  onClick={() => toggleGroupCollapse(grp.time)}
                  className="bg-indigo-50/80 px-4 py-3 flex items-center justify-between cursor-pointer select-none hover:bg-indigo-100/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-indigo-700 text-white font-bold rounded text-xs font-mono">
                        KHUNG GIỜ {grp.time}
                      </span>
                      <span className="text-xs text-indigo-900 font-medium">
                        ({grp.items.length} lượt tiêm • {new Set(grp.items.map(i => i.room)).size} phòng)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-600">
                      Tiến độ: <strong>{groupExecuted}/{grp.items.length}</strong>
                    </span>
                    {onBatchToggleExecution && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const allDone = groupExecuted === grp.items.length;
                          onBatchToggleExecution(grp.items.map(i => i.id), !allDone);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded font-semibold text-slate-700 transition-colors"
                      >
                        {groupExecuted === grp.items.length ? 'Bỏ tích giờ này' : 'Tích xong cả giờ'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Time Table */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">STT</th>
                          <th className="py-2.5 px-2 text-center w-20">Phòng</th>
                          <th className="py-2.5 px-2 text-center w-20">Giường</th>
                          <th className="py-2.5 px-3 min-w-[180px]">Bệnh nhân & Tuổi</th>
                          <th className="py-2.5 px-3 min-w-[200px]">Thuốc tiêm / Dịch truyền</th>
                          <th className="py-2.5 px-2 text-center w-28">Đường dùng</th>
                          <th className="py-2.5 px-3 text-center w-28">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {grp.items.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-2 text-center font-bold text-slate-800">{item.room}</td>
                            <td className="py-2.5 px-2 text-center font-semibold text-teal-800">{item.bed || '—'}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {item.patientName}
                              <span className="text-[11px] text-slate-500 font-normal ml-2">
                                ({item.age ? `${item.age}t` : 'chưa có tuổi'})
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-teal-900">{item.drugFullName}</div>
                              <div className="text-[11px] text-slate-500">{item.quantity} {item.unit}</div>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              {item.route ? (
                                <span className="px-2 py-0.5 bg-sky-50 text-sky-800 rounded-full font-semibold text-[11px]">
                                  {item.route}
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleQuickSetRoute(item, 'Tiêm TM (IV)')}
                                  className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold"
                                >
                                  + IV
                                </button>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => onToggleExecution(item.id)}
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  item.isExecuted
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {item.isExecuted ? '✓ Đã tiêm' : 'Chưa tiêm'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
