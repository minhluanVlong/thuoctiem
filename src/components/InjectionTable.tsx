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
  Plus,
  GitCompare,
  Baby,
  FileEdit,
  ArrowRight
} from 'lucide-react';
import { ProcessedInjectionRecord, SortMode, MedicationChangeStatus } from '../types/hospital';
import { sortInjectionRecords } from '../utils/matchingEngine';

interface InjectionTableProps {
  injections: ProcessedInjectionRecord[];
  onToggleExecution: (id: string) => void;
  onBatchToggleExecution?: (ids: string[], status: boolean) => void;
  onOpenDuplicateModal: () => void;
  onUpdateRecord?: (updated: ProcessedInjectionRecord) => void;
  onBatchUpdateRoute?: (route: string) => void;
  onOpenReconciliationModal?: () => void;
  hasReconciliationData?: boolean;
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
  onOpenReconciliationModal,
  hasReconciliationData,
}) => {
  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string>('ALL');
  const [selectedRoute, setSelectedRoute] = useState<string>('ALL');
  const [selectedShift, setSelectedShift] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedChangeStatus, setSelectedChangeStatus] = useState<string>('ALL');
  const [missingRouteOnly, setMissingRouteOnly] = useState<boolean>(false);
  const [sortMode, setSortMode] = useState<SortMode>('ROOM_PATIENT_TIME');
  const [viewMode, setViewMode] = useState<ViewGroupingMode>('FLAT');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'notes' | 'route' | 'age' | 'room' | 'orderTime' | 'quantity' | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Extract distinct filter values
  const roomList = useMemo(() => {
    const set = new Set<string>();
    (injections || []).forEach((item) => {
      if (item.room) set.add(item.room);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  }, [injections]);

  const routeList = useMemo(() => {
    const set = new Set<string>();
    (injections || []).forEach((item) => {
      if (item.route && item.route.trim()) set.add(item.route.trim());
    });
    return Array.from(set).sort();
  }, [injections]);

  const changeCounts = useMemo(() => {
    let newCount = 0;
    let changedCount = 0;
    let unchangedCount = 0;
    (injections || []).forEach(i => {
      if (i.changeStatus === 'NEW') newCount++;
      else if (i.changeStatus === 'CHANGED_DOSE' || i.changeStatus === 'CHANGED_TIME') changedCount++;
      else if (i.changeStatus === 'UNCHANGED') unchangedCount++;
    });
    return { newCount, changedCount, unchangedCount };
  }, [injections]);

  // Filter & Search Logic
  const filteredInjections = useMemo(() => {
    let result = Array.isArray(injections) ? [...injections] : [];

    // Missing route filter
    if (missingRouteOnly) {
      result = result.filter((item) => !item.route || !item.route.trim());
    }

    // Change status filter (Day Comparison)
    if (selectedChangeStatus !== 'ALL') {
      if (selectedChangeStatus === 'NEW') {
        result = result.filter(item => item.changeStatus === 'NEW');
      } else if (selectedChangeStatus === 'CHANGED') {
        result = result.filter(item => item.changeStatus === 'CHANGED_DOSE' || item.changeStatus === 'CHANGED_TIME');
      } else if (selectedChangeStatus === 'UNCHANGED') {
        result = result.filter(item => item.changeStatus === 'UNCHANGED');
      }
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
        (item.notes && item.notes.toLowerCase().includes(q)) ||
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
        if (selectedShift === 'MORNING') return hour >= 6 && hour < 12;
        if (selectedShift === 'AFTERNOON') return hour >= 12 && hour < 18;
        if (selectedShift === 'EVENING') return hour >= 18 && hour < 24;
        if (selectedShift === 'NIGHT') return hour >= 0 && hour < 6;
        return true;
      });
    }

    // Apply Sorting
    sortInjectionRecords(result, sortMode);

    return result;
  }, [injections, searchTerm, selectedRoom, selectedRoute, selectedShift, selectedStatus, selectedChangeStatus, missingRouteOnly, sortMode]);

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

  const handleStartEdit = (item: ProcessedInjectionRecord, field: 'notes' | 'route' | 'age' | 'room' | 'orderTime' | 'quantity') => {
    setEditingId(item.id);
    setEditingField(field);
    setEditValue(String(item[field] || ''));
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

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Top Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 space-y-3">
        {/* Row 1: Search + View Modes + Day Comparison Button */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="input-search-injections"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên người bệnh, phòng, thuốc, tuổi, ghi chú, giờ..."
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

          {/* View Modes & Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Selector */}
            <div className="bg-white p-1 rounded-lg border border-slate-300 flex items-center shadow-2xs">
              <button
                onClick={() => setViewMode('FLAT')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === 'FLAT'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Xem danh sách liên tục"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Bảng liên tục</span>
              </button>

              <button
                onClick={() => setViewMode('GROUP_BY_ROOM')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === 'GROUP_BY_ROOM'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Gom nhóm theo từng Buồng/Phòng"
              >
                <Building className="w-3.5 h-3.5" />
                <span>Theo Khu - Buồng</span>
              </button>

              <button
                onClick={() => setViewMode('GROUP_BY_TIME')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === 'GROUP_BY_TIME'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Gom nhóm theo Khung giờ y lệnh"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Theo Giờ Y Lệnh</span>
              </button>
            </div>

            {/* Reconciliation Trigger Button */}
            {onOpenReconciliationModal && (
              <button
                onClick={onOpenReconciliationModal}
                className="px-3 py-1.5 bg-white border border-teal-600 text-teal-800 hover:bg-teal-50 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-2xs"
                title="Xem bảng so sánh đối chiếu y lệnh thuốc với ngày hôm trước"
              >
                <GitCompare className="w-3.5 h-3.5 text-teal-700" />
                <span>So sánh hôm trước</span>
                {changeCounts.newCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-600 text-white">
                    +{changeCounts.newCount} mới
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Filter dropdowns & Quick status tags */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/80 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Room Filter */}
            <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="bg-transparent font-medium text-slate-700 outline-none pr-1"
              >
                <option value="ALL">Tất cả Khu/Buồng ({roomList.length})</option>
                {roomList.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Shift Filter */}
            <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="bg-transparent font-medium text-slate-700 outline-none pr-1"
              >
                <option value="ALL">Tất cả ca trực</option>
                <option value="MORNING">Ca Sáng (06h - 12h)</option>
                <option value="AFTERNOON">Ca Chiều (12h - 18h)</option>
                <option value="EVENING">Ca Tối (18h - 24h)</option>
                <option value="NIGHT">Ca Đêm (00h - 06h)</option>
              </select>
            </div>

            {/* Execution Status Filter */}
            <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent font-medium text-slate-700 outline-none pr-1"
              >
                <option value="ALL">Trạng thái tiêm (Tất cả)</option>
                <option value="PENDING">Chưa thực hiện tiêm</option>
                <option value="EXECUTED">Đã thực hiện tiêm</option>
              </select>
            </div>

            {/* Day Comparison Change Filter (if available) */}
            {(changeCounts.newCount > 0 || changeCounts.changedCount > 0) && (
              <div className="flex items-center gap-1 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-300 shadow-2xs">
                <GitCompare className="w-3.5 h-3.5 text-teal-700" />
                <select
                  value={selectedChangeStatus}
                  onChange={(e) => setSelectedChangeStatus(e.target.value)}
                  className="bg-transparent font-bold text-teal-900 outline-none pr-1"
                >
                  <option value="ALL">Đối chiếu: Tất cả ({injections.length})</option>
                  <option value="NEW">✨ Thuốc mới hôm nay (+{changeCounts.newCount})</option>
                  <option value="CHANGED">⟳ Đổi liều/giờ ({changeCounts.changedCount})</option>
                  <option value="UNCHANGED">= Duy trì ({changeCounts.unchangedCount})</option>
                </select>
              </div>
            )}
          </div>

          {/* Sort Mode Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Sắp xếp:</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="bg-white px-2.5 py-1 rounded-lg border border-slate-300 font-semibold text-slate-800 outline-none shadow-2xs"
            >
              <option value="ROOM_PATIENT_TIME">Khu/Buồng → Tên BN → Giờ</option>
              <option value="TIME">Thời gian y lệnh (Sớm → Muộn)</option>
              <option value="PATIENT_NAME">Tên bệnh nhân (A → Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table: 7 Exact Columns */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/90 text-slate-800 uppercase text-[11px] font-bold border-b border-slate-200 tracking-wider">
              {/* Column 1: STT & Check */}
              <th className="py-3 px-3 w-12 text-center">STT</th>

              {/* Column 2: Tên bệnh nhân */}
              <th className="py-3 px-3 min-w-[180px]">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tên người bệnh</span>
                </div>
              </th>

              {/* Column 3: Tuổi */}
              <th className="py-3 px-3 w-28 text-center">
                <span>Tuổi (Năm sinh)</span>
              </th>

              {/* Column 4: Phòng (Khu - Buồng) */}
              <th className="py-3 px-3 min-w-[150px]">
                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  <span>Phòng (Khu - Buồng)</span>
                </div>
              </th>

              {/* Column 5: Tên thuốc & Hàm lượng đầy đủ */}
              <th className="py-3 px-3 min-w-[240px]">
                <div className="flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tên thuốc & Hàm lượng</span>
                </div>
              </th>

              {/* Column 6: Ghi chú */}
              <th className="py-3 px-3 min-w-[200px]">
                <div className="flex items-center gap-1.5">
                  <FileEdit className="w-3.5 h-3.5 text-slate-500" />
                  <span>Ghi chú (Đường dùng / Dặn dò)</span>
                </div>
              </th>

              {/* Column 7: Thời gian y lệnh (Cột cuối cùng) */}
              <th className="py-3 px-3 w-32 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Thời gian y lệnh</span>
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {filteredInjections.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="max-w-sm mx-auto space-y-2">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="font-semibold text-slate-700">Không có dữ liệu thuốc tiêm phù hợp bộ lọc</p>
                    <p className="text-xs text-slate-400">Hãy thử đổi từ khóa tìm kiếm hoặc chọn "Tất cả"</p>
                  </div>
                </td>
              </tr>
            ) : viewMode === 'FLAT' ? (
              filteredInjections.map((item, idx) => (
                <InjectionTableRow
                  key={item.id}
                  item={item}
                  displayIndex={idx + 1}
                  onToggleExecution={onToggleExecution}
                  editingId={editingId}
                  editingField={editingField}
                  editValue={editValue}
                  setEditValue={setEditValue}
                  onStartEdit={handleStartEdit}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                />
              ))
            ) : viewMode === 'GROUP_BY_ROOM' ? (
              roomGroups.map((group) => {
                const isCollapsed = !!collapsedGroups[group.room];
                const executedCount = group.items.filter((i) => i.isExecuted).length;

                return (
                  <React.Fragment key={group.room}>
                    {/* Room Group Header Row */}
                    <tr
                      onClick={() => toggleGroupCollapse(group.room)}
                      className="bg-slate-100/95 font-bold text-slate-800 cursor-pointer hover:bg-slate-200/80 transition-colors border-t border-b border-slate-300"
                    >
                      <td colSpan={7} className="py-2.5 px-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            )}
                            <Building className="w-4 h-4 text-teal-700" />
                            <span className="text-sm font-bold text-slate-900">{group.room}</span>
                            <span className="text-xs font-normal text-slate-500">
                              ({group.items.length} lượt tiêm • {new Set(group.items.map((i) => i.patientName)).size} bệnh nhân)
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-semibold">
                            <span
                              className={`px-2 py-0.5 rounded-full ${
                                executedCount === group.items.length
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {executedCount}/{group.items.length} đã tiêm
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Room Group Items */}
                    {!isCollapsed &&
                      group.items.map((item, idx) => (
                        <InjectionTableRow
                          key={item.id}
                          item={item}
                          displayIndex={idx + 1}
                          onToggleExecution={onToggleExecution}
                          editingId={editingId}
                          editingField={editingField}
                          editValue={editValue}
                          setEditValue={setEditValue}
                          onStartEdit={handleStartEdit}
                          onSaveEdit={handleSaveEdit}
                          onCancelEdit={handleCancelEdit}
                        />
                      ))}
                  </React.Fragment>
                );
              })
            ) : (
              // GROUP BY TIME
              timeGroups.map((group) => {
                const isCollapsed = !!collapsedGroups[group.time];
                const executedCount = group.items.filter((i) => i.isExecuted).length;

                return (
                  <React.Fragment key={group.time}>
                    <tr
                      onClick={() => toggleGroupCollapse(group.time)}
                      className="bg-slate-100/95 font-bold text-slate-800 cursor-pointer hover:bg-slate-200/80 transition-colors border-t border-b border-slate-300"
                    >
                      <td colSpan={7} className="py-2.5 px-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            )}
                            <Clock className="w-4 h-4 text-teal-700" />
                            <span className="text-sm font-bold text-slate-900 font-mono">
                              Cữ {group.time}
                            </span>
                            <span className="text-xs font-normal text-slate-500">
                              ({group.items.length} lượt tiêm)
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-semibold">
                            <span
                              className={`px-2 py-0.5 rounded-full ${
                                executedCount === group.items.length
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {executedCount}/{group.items.length} đã tiêm
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {!isCollapsed &&
                      group.items.map((item, idx) => (
                        <InjectionTableRow
                          key={item.id}
                          item={item}
                          displayIndex={idx + 1}
                          onToggleExecution={onToggleExecution}
                          editingId={editingId}
                          editingField={editingField}
                          editValue={editValue}
                          setEditValue={setEditValue}
                          onStartEdit={handleStartEdit}
                          onSaveEdit={handleSaveEdit}
                          onCancelEdit={handleCancelEdit}
                        />
                      ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer Status */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <span>
            Tổng hiển thị: <strong>{filteredInjections.length}</strong> / {injections.length} lượt tiêm
          </span>
          <span>
            Đã tiêm: <strong className="text-emerald-700">{injections.filter((i) => i.isExecuted).length}</strong>
          </span>
          <span>
            Chưa tiêm: <strong className="text-amber-700">{injections.filter((i) => !i.isExecuted).length}</strong>
          </span>
        </div>

        <div className="text-[11px] text-slate-500 italic">
          * Nhấp vào ô Ghi chú để chỉnh sửa nhanh dặn dò hoặc đường dùng
        </div>
      </div>
    </div>
  );
};

interface InjectionTableRowProps {
  item: ProcessedInjectionRecord;
  displayIndex: number;
  onToggleExecution: (id: string) => void;
  editingId: string | null;
  editingField: string | null;
  editValue: string;
  setEditValue: (val: string) => void;
  onStartEdit: (item: ProcessedInjectionRecord, field: any) => void;
  onSaveEdit: (item: ProcessedInjectionRecord) => void;
  onCancelEdit: () => void;
}

const InjectionTableRow: React.FC<InjectionTableRowProps> = ({
  item,
  displayIndex,
  onToggleExecution,
  editingId,
  editingField,
  editValue,
  setEditValue,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}) => {
  const isEditingThis = editingId === item.id;

  return (
    <tr
      className={`transition-colors hover:bg-slate-50/80 ${
        item.isExecuted
          ? 'bg-emerald-50/30 text-slate-600'
          : item.isDuplicate
          ? 'bg-amber-50/40'
          : ''
      }`}
    >
      {/* 1. STT & Checkmark */}
      <td className="py-3 px-3 text-center">
        <button
          onClick={() => onToggleExecution(item.id)}
          className="inline-flex items-center justify-center group"
          title={item.isExecuted ? 'Bấm để hủy đánh dấu đã tiêm' : 'Bấm để đánh dấu đã tiêm'}
        >
          {item.isExecuted ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <div className="w-5 h-5 rounded-md border-2 border-slate-300 group-hover:border-teal-600 flex items-center justify-center text-[10px] font-bold text-slate-600">
              {displayIndex}
            </div>
          )}
        </button>
      </td>

      {/* 2. Tên người bệnh */}
      <td className="py-3 px-3">
        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
          <span className={item.isExecuted ? 'line-through text-slate-500' : ''}>
            {item.patientName}
          </span>
          {item.isDuplicate && (
            <span
              className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
              title="Có khả năng trùng lặp y lệnh cùng giờ"
            >
              Trùng
            </span>
          )}
        </div>
        {item.patientCode && (
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            {item.patientCode}
          </div>
        )}
      </td>

      {/* 3. Tuổi (Năm sinh / X tháng nếu bé nhi) */}
      <td className="py-3 px-3 text-center">
        {isEditingThis && editingField === 'age' ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-16 px-1.5 py-0.5 border border-teal-500 rounded text-xs text-center"
              autoFocus
            />
            <button onClick={() => onSaveEdit(item)} className="text-emerald-600">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={onCancelEdit} className="text-slate-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => onStartEdit(item, 'age')}
            className="cursor-pointer hover:bg-slate-100 p-1 rounded inline-block"
            title="Nhấp để sửa tuổi"
          >
            {item.isPediatric ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-pink-100 text-pink-800 border border-pink-200">
                <Baby className="w-3 h-3 text-pink-600" />
                {item.age || 'Nhi'}
              </span>
            ) : (
              <span className="font-semibold text-slate-800 text-xs">
                {item.age || '—'}
              </span>
            )}
          </div>
        )}
      </td>

      {/* 4. Phòng (Khu nào - Buồng số mấy) */}
      <td className="py-3 px-3">
        {isEditingThis && editingField === 'room' ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-1.5 py-0.5 border border-teal-500 rounded text-xs font-semibold"
              autoFocus
            />
            <button onClick={() => onSaveEdit(item)} className="text-emerald-600">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={onCancelEdit} className="text-slate-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => onStartEdit(item, 'room')}
            className="cursor-pointer hover:bg-slate-100 p-1 rounded inline-flex flex-col"
            title="Nhấp để sửa Khu - Buồng"
          >
            <span className="font-bold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {item.room || 'Chưa xếp phòng'}
            </span>
            {item.bed && item.bed !== '—' && (
              <span className="text-[10px] text-slate-500 mt-0.5 pl-1">
                {item.bed}
              </span>
            )}
          </div>
        )}
      </td>

      {/* 5. Tên thuốc & Hàm lượng đầy đủ */}
      <td className="py-3 px-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-900 text-xs">
              {item.drugFullName}
            </span>

            {/* Change Status Badge (from Day Reconciliation) */}
            {item.changeStatus === 'NEW' && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                + Thuốc mới
              </span>
            )}
            {item.changeStatus === 'CHANGED_DOSE' && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                ⟳ Đổi liều
              </span>
            )}
            {item.changeStatus === 'CHANGED_TIME' && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                ⟳ Đổi giờ
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-600 mt-0.5 font-medium flex items-center gap-2">
            <span>
              Số lượng: <strong>{item.quantity} {item.unit}</strong>
            </span>
            {item.activeIngredient && (
              <span className="text-slate-400">({item.activeIngredient})</span>
            )}
          </div>
        </div>
      </td>

      {/* 6. Ghi chú (Đường dùng / Dặn dò) */}
      <td className="py-3 px-3">
        {isEditingThis && editingField === 'notes' ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-2 py-1 border border-teal-500 rounded text-xs"
              placeholder="Nhập đường dùng, dặn dò..."
              autoFocus
            />
            <button onClick={() => onSaveEdit(item)} className="text-emerald-600">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={onCancelEdit} className="text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => onStartEdit(item, 'notes')}
            className="cursor-pointer group p-1 rounded hover:bg-teal-50/50 flex items-center justify-between"
            title="Nhấp để sửa ghi chú / dặn dò"
          >
            <div className="text-xs text-slate-700">
              {item.notes ? (
                <span>{item.notes}</span>
              ) : item.route ? (
                <span className="font-semibold text-teal-800">Đường dùng: {item.route}</span>
              ) : (
                <span className="text-amber-600 italic text-[11px] flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Chưa có đường dùng (bấm để thêm)
                </span>
              )}
            </div>
            <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 shrink-0" />
          </div>
        )}
      </td>

      {/* 7. Thời gian y lệnh (Cột cuối cùng) */}
      <td className="py-3 px-3 text-center">
        {isEditingThis && editingField === 'orderTime' ? (
          <div className="flex items-center justify-center gap-1">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-16 px-1.5 py-0.5 border border-teal-500 rounded text-xs font-mono text-center"
              autoFocus
            />
            <button onClick={() => onSaveEdit(item)} className="text-emerald-600">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={onCancelEdit} className="text-slate-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => onStartEdit(item, 'orderTime')}
            className="cursor-pointer hover:bg-slate-100 p-1 rounded inline-block"
            title="Nhấp để sửa giờ y lệnh"
          >
            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-900 border border-slate-200">
              {item.orderTime}
            </span>
          </div>
        )}
      </td>
    </tr>
  );
};
