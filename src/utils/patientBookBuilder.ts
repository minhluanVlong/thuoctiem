/**
 * Patient Grouped Injection Book Builder
 * Specifically implements:
 * 1. Division into 2 distinct lists: "KHU NỘI NHI" and "KHU NHIỄM"
 * 2. 4-Column Book Structure: | TÊN | TUỔI | SỐ PHÒNG | THUỐC TIÊM |
 * 3. Group all medications of each patient into one row
 * 4. Priority sort of medications within each patient:
 *    - 1. Thuốc kháng sinh
 *    - 2. Thuốc tiêm điều trị chính
 *    - 3. Thuốc dạ dày / thuốc hỗ trợ
 *    - 4. Thuốc giảm đau – hạ sốt
 *    - 5. Thuốc khác
 *    - 6. Thuốc phun khí dung
 * 5. Safe Patient Identity Lock: HỌ TÊN + NGÀY SINH + KHOA/PHÒNG + GIƯỜNG
 * 6. Solvent parsing: "Tenamyd-Ceftazidime 1000: 1 lọ + Nước cất pha tiêm 5ml – 2 ống – TMC"
 * 7. Precise frequency (1 x 2, 1 x 3) and actual hours (07h – 19h, 07:15 – 19:15)
 * 8. Insulin preservation: "Humalog Mix 75/25 Kwikpen: Sáng 30 UI – Chiều 25 UI – TDD"
 */
import { ProcessedInjectionRecord } from '../types/hospital';
import { normalizeVietnameseName } from './matchingEngine';
import { formatDoseAndTimeSchedule } from './matrixBuilder';

export type WardListType = 'KHU_NOI_NHI' | 'KHU_NHIEM';

export interface PatientMedicationItem {
  id: string;
  originalDrugName: string;
  drugFullName: string;
  activeIngredient?: string;
  strength?: string;
  unit?: string;
  quantity: string | number;
  route: string;
  isAerosol: boolean;
  isInsulin: boolean;
  // Formatted string according to Section 6 & 22 (e.g. "1 lọ + Nước cất pha tiêm 5ml – 2 ống – TMC")
  dosageAndSolventText: string;
  // Formatted frequency (e.g. "1 x 2", "1 x 3", "1 x 1", "Sáng 22 UI – Chiều 20 UI")
  frequencyText: string;
  // Formatted time schedule (e.g. "07h – 19h", "07:15 – 19:15", "07h – 15h – 23h")
  timeScheduleText: string;
  rawOrderTime: string;
  rawNotes?: string;
  priorityOrder: number; // 1 to 6
  categoryName: string;
  isExecuted?: boolean;
  timeSlots?: string[];
  timeSlotsExecuted?: boolean[];
  needsReview?: boolean;
  reviewReason?: string;
  rawRecord: ProcessedInjectionRecord;
}

export interface PatientBookEntry {
  patientKey: string;
  patientName: string;
  age: string;
  dob?: string;
  birthYear?: number;
  isPediatric?: boolean;
  gender?: string;
  wardList: WardListType;
  wardListTitle: string; // "KHU NỘI NHI" or "KHU NHIỄM"
  roomDisplay: string;   // e.g. "Khu Nội Nhi – Phòng 1" or "Khu Nhiễm – Phòng 3"
  shortRoom: string;     // e.g. "Phòng 1", "Hồi sức 1", "Lão khoa", "Phòng 3"
  bed: string;           // e.g. "Giường 41", "Giường 62"
  bedNumber: number;     // parsed number for sorting
  roomSortKey: number;   // parsed room order
  medications: PatientMedicationItem[];
  totalMedications: number;
  isAllExecuted?: boolean;
  hasWarning?: boolean;
  warningMessage?: string;
}

export interface GroupedInjectionBookData {
  allPatients: PatientBookEntry[];
  khuNoiNhiPatients: PatientBookEntry[];
  khuNhiemPatients: PatientBookEntry[];
  khuNoiNhi: PatientBookEntry[];
  khuNhiem: PatientBookEntry[];
  totalPatients: number;
  totalKhuNoiNhi: number;
  totalKhuNhiem: number;
  totalInjections: number;
  totalPendingValidation: number;
  validationWarnings: {
    rowIndex?: number;
    patientName: string;
    reason: string;
    severity: 'HIGH' | 'MEDIUM';
    rawRecord?: any;
  }[];
}

/**
 * Classify a room/department string into KHU NỘI NHI vs KHU NHIỄM
 * Rule from Prompt Section 3:
 * "Khu Nội - Nhi: Buồng Nhi 1", "Khu Nội - Nhi: Hồi sức 1", "Khu Nội - Nhi: Buồng Lão khoa" -> KHU NỘI NHI
 * "Khu Nhiễm: Buồng bệnh 1", "Khu Nhiễm: Buồng bệnh 2", "Khu Nhiễm: Buồng bệnh 3" -> KHU NHIỄM
 */
export function classifyWardList(deptRoomBedStr?: string, roomStr?: string, areaStr?: string): WardListType {
  const combined = `${deptRoomBedStr || ''} ${roomStr || ''} ${areaStr || ''}`.toLowerCase();

  // If contains "khu nhiễm", "truyền nhiễm", "buồng bệnh ... của khu nhiễm"
  const isKhuNhiem =
    combined.includes('khu nhiễm') ||
    combined.includes('khu nhiem') ||
    combined.includes('truyền nhiễm') ||
    combined.includes('truyen nhiem') ||
    combined.includes('buồng cách ly') ||
    combined.includes('cách ly') ||
    /\bkhu\s*nhi[eễ]m\b/i.test(combined);

  if (isKhuNhiem) {
    return 'KHU_NHIEM';
  }

  // Default to KHU NỘI NHI (Nội tổng hợp, Buồng Nhi, Hồi sức, Lão khoa, Buồng 1-5...)
  return 'KHU_NOI_NHI';
}

/**
 * Clean & Format Room Name according to Section 2:
 * "Khu Nhiễm: Buồng bệnh 3" -> "Khu Nhiễm – Phòng 3" (hoặc "Phòng 3")
 * "Khu Nội - Nhi: Buồng Nhi 1" -> "Khu Nội Nhi – Phòng 1" (hoặc "Phòng Nhi 1")
 * "Hồi sức 1" -> "Khu Nội Nhi – Hồi sức 1" (hoặc "Hồi sức 1")
 * "Khu Lão khoa" -> "Khu Nội Nhi – Lão khoa" (hoặc "Lão khoa")
 */
export function formatStandardRoom(rawRoom: string, deptRoomBed?: string, wardList?: WardListType): {
  roomDisplay: string;
  shortRoom: string;
  roomSortKey: number;
} {
  const text = `${deptRoomBed || ''} ${rawRoom || ''}`.trim();
  const textLower = text.toLowerCase();

  let shortRoom = '';
  let roomSortKey = 100;

  if (textLower.includes('hồi sức 1') || textLower.includes('hs1') || textLower.includes('hs 1')) {
    shortRoom = 'Hồi sức 1';
    roomSortKey = 1;
  } else if (textLower.includes('hồi sức 2') || textLower.includes('hs2') || textLower.includes('hs 2')) {
    shortRoom = 'Hồi sức 2';
    roomSortKey = 2;
  } else if (textLower.includes('cấp cứu') || textLower.includes('cc')) {
    shortRoom = 'Cấp cứu';
    roomSortKey = 3;
  } else if (textLower.includes('nhi 1') || textLower.includes('buồng nhi 1') || textLower.includes('phòng nhi 1')) {
    shortRoom = 'Phòng Nhi 1';
    roomSortKey = 10;
  } else if (textLower.includes('nhi 2') || textLower.includes('buồng nhi 2') || textLower.includes('phòng nhi 2')) {
    shortRoom = 'Phòng Nhi 2';
    roomSortKey = 11;
  } else if (textLower.includes('lão khoa') || textLower.includes('lao khoa') || textLower.includes('buồng lão khoa')) {
    shortRoom = 'Lão khoa';
    roomSortKey = 15;
  } else {
    // Extract room number: "Buồng bệnh 1", "Buồng 1", "Phòng 1", "Phòng 2", "Buồng bệnh 3"...
    const numMatch = text.match(/(?:buồng bệnh|buồng|phòng|p\.)\s*(\d+)/i) || text.match(/\b(\d+)\b/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      shortRoom = `Phòng ${num}`;
      roomSortKey = 20 + num;
    } else {
      shortRoom = rawRoom || 'Phòng điều trị';
      roomSortKey = 99;
    }
  }

  const wardPrefix = wardList === 'KHU_NHIEM' ? 'Khu Nhiễm' : 'Khu Nội Nhi';
  const roomDisplay = `${wardPrefix} – ${shortRoom}`;

  return { roomDisplay, shortRoom, roomSortKey };
}

/**
 * Parse bed number for secondary sorting within a room
 */
export function parseBedNumber(bedStr?: string): number {
  if (!bedStr) return 999;
  const match = bedStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999;
}

/**
 * Determine Medication Priority Order:
 * 1. Thuốc kháng sinh
 * 2. Thuốc tiêm điều trị chính (bao gồm Insulin)
 * 3. Thuốc dạ dày / thuốc hỗ trợ
 * 4. Thuốc giảm đau – hạ sốt
 * 5. Thuốc khác
 * 6. Thuốc phun khí dung
 */
export function getMedicationPriority(name: string, route: string, categoryType?: string): { priority: number; categoryName: string } {
  const n = name.toLowerCase();
  const r = (route || '').toLowerCase();

  // 6. Thuốc phun khí dung (PKD)
  if (
    n.includes('vinsalmol') ||
    n.includes('salbutamol') ||
    n.includes('zensonid') ||
    n.includes('budesonid') ||
    n.includes('pulmicort') ||
    n.includes('berodual') ||
    n.includes('combivent') ||
    n.includes('ventolin') ||
    r.includes('pkd') ||
    r.includes('khí dung')
  ) {
    return { priority: 6, categoryName: 'Thuốc phun khí dung' };
  }

  // 1. Thuốc kháng sinh
  if (
    n.includes('ceftazidim') ||
    n.includes('ceftazidime') ||
    n.includes('tenamyd') ||
    n.includes('cefotaxim') ||
    n.includes('cefotaxime') ||
    n.includes('ceftriaxon') ||
    n.includes('ceftriaxone') ||
    n.includes('cefoperazon') ||
    n.includes('sulperazon') ||
    n.includes('ampicillin') ||
    n.includes('unasyn') ||
    n.includes('klamentin') ||
    n.includes('amoxicillin') ||
    n.includes('augmentin') ||
    n.includes('meropenem') ||
    n.includes('tienam') ||
    n.includes('imipenem') ||
    n.includes('ciprofloxacin') ||
    n.includes('levofloxacin') ||
    n.includes('gentamicin') ||
    n.includes('zentamil') ||
    n.includes('amikacin') ||
    n.includes('metronidazol') ||
    n.includes('vancomycin') ||
    n.includes('linezolid') ||
    n.includes('azithromycin')
  ) {
    return { priority: 1, categoryName: 'Thuốc kháng sinh' };
  }

  // 3. Thuốc dạ dày / thuốc hỗ trợ đường tiêu hóa
  if (
    n.includes('omevin') ||
    n.includes('omeprazol') ||
    n.includes('omeprazole') ||
    n.includes('esogas') ||
    n.includes('esomeprazol') ||
    n.includes('pantoprazol') ||
    n.includes('vinphatocit') ||
    n.includes('phosphalugel') ||
    n.includes('gastro') ||
    n.includes('ranitidin')
  ) {
    return { priority: 3, categoryName: 'Thuốc dạ dày / Hỗ trợ' };
  }

  // 4. Thuốc giảm đau – hạ sốt
  if (
    n.includes('paracetamol') ||
    n.includes('perfalgan') ||
    n.includes('diclofenac') ||
    n.includes('voltaren') ||
    n.includes('tramadol') ||
    n.includes('ketorolac') ||
    n.includes('alaxan') ||
    n.includes('efferalgan') ||
    n.includes('panadol')
  ) {
    return { priority: 4, categoryName: 'Thuốc giảm đau – hạ sốt' };
  }

  // 2. Thuốc tiêm điều trị chính & Insulin
  if (
    n.includes('insulin') ||
    n.includes('humalog') ||
    n.includes('mixtard') ||
    n.includes('novorapid') ||
    n.includes('scilin') ||
    n.includes('lantus') ||
    n.includes('actrapid') ||
    n.includes('piracetam') ||
    n.includes('cerebrolysin') ||
    n.includes('citicolin') ||
    n.includes('vinpocetin') ||
    n.includes('furosemid') ||
    n.includes('lasix') ||
    n.includes('cordarone') ||
    n.includes('amiodaron') ||
    n.includes('digoxin') ||
    n.includes('enoxaparin') ||
    n.includes('lovenox')
  ) {
    return { priority: 2, categoryName: 'Thuốc điều trị chính' };
  }

  // 5. Thuốc khác (Corticoid, Hồi sức, Kháng histamin...)
  return { priority: 5, categoryName: 'Thuốc khác' };
}

/**
 * Format Dosage & Solvent according to Section 6, 22, 10, 13:
 * If Excel has:
 * "Tenamyd-Ceftazidime 1000, 1 Lọ pha với Nước cất pha tiêm 5ml 2 Ống, TMC"
 * -> "1 lọ + Nước cất pha tiêm 5ml – 2 ống – TMC"
 * If PKD:
 * "Vinsalmol 5, 1 Ống, PKD" -> "1 ống – PKD"
 * If Insulin:
 * "Humalog Mix 75/25 Kwikpen, TDD sáng 30UI, chiều 25UI" -> "Sáng 30 UI – Chiều 25 UI – TDD"
 */
export function formatDosageAndSolvent(record: ProcessedInjectionRecord): {
  dosageAndSolventText: string;
  isAerosol: boolean;
  isInsulin: boolean;
} {
  const nameLower = (record.drugFullName || record.originalDrugName || '').toLowerCase();
  const rawNotes = record.notes || '';
  const notesLower = rawNotes.toLowerCase();
  let route = (record.route || 'TMC').toUpperCase().trim();
  const qty = record.quantity !== undefined ? record.quantity : 1;
  const unit = (record.unit || 'Lọ').toLowerCase();

  const isAerosol =
    nameLower.includes('vinsalmol') ||
    nameLower.includes('salbutamol') ||
    nameLower.includes('zensonid') ||
    nameLower.includes('budesonid') ||
    nameLower.includes('pulmicort') ||
    nameLower.includes('berodual') ||
    nameLower.includes('combivent') ||
    nameLower.includes('ventolin') ||
    route.includes('PKD') ||
    route.includes('KHÍ DUNG') ||
    notesLower.includes('khí dung');

  const isInsulin =
    nameLower.includes('insulin') ||
    nameLower.includes('humalog') ||
    nameLower.includes('mixtard') ||
    nameLower.includes('scilin') ||
    nameLower.includes('novorapid') ||
    nameLower.includes('lantus') ||
    nameLower.includes('actrapid') ||
    route.includes('TDD') ||
    (record.categoryType || '').toLowerCase().includes('insulin');

  if (isAerosol) {
    return {
      dosageAndSolventText: `${qty} ${unit} – PKD`,
      isAerosol: true,
      isInsulin: false,
    };
  }

  if (isInsulin) {
    // Look for Sáng X UI, Chiều Y UI in notes
    const text = `${rawNotes} ${record.drugFullName}`;
    const scMatch = text.match(/(?:sáng|s)\s*[:\s]*(\d{1,3})\s*(?:ui|đv)?.*?(?:chiều|tối|c|t)\s*[:\s]*(\d{1,3})\s*(?:ui|đv)?/i);
    if (scMatch) {
      return {
        dosageAndSolventText: `Sáng ${scMatch[1]} UI – Chiều ${scMatch[2]} UI – TDD`,
        isAerosol: false,
        isInsulin: true,
      };
    }
    const singleMatch = text.match(/(\d{1,3})\s*(?:ui|đv)/i);
    if (singleMatch) {
      return {
        dosageAndSolventText: `${singleMatch[1]} UI – TDD`,
        isAerosol: false,
        isInsulin: true,
      };
    }
    return {
      dosageAndSolventText: `${qty} ${unit} – TDD`,
      isAerosol: false,
      isInsulin: true,
    };
  }

  // Check solvent (Nước cất pha tiêm) in notes:
  // e.g. "pha với Nước cất pha tiêm 5ml (Nước cất pha tiêm - 5ml) 2 Ống"
  const nuocCatMatch = rawNotes.match(/pha\s+với\s+([^()]+?)(?:\s*\([^)]*\))?\s*(\d+)\s*(ống|lọ|ml)?/i) ||
                        rawNotes.match(/(\+?\s*nước\s*cất[^\n\r,–]+)/i);

  let solventPart = '';
  if (nuocCatMatch) {
    if (nuocCatMatch[2]) {
      const solventName = nuocCatMatch[1].trim();
      const solventQty = nuocCatMatch[2].trim();
      const solventUnit = nuocCatMatch[3] ? nuocCatMatch[3].trim() : 'ống';
      solventPart = ` + ${solventName} – ${solventQty} ${solventUnit}`;
    } else {
      solventPart = ` + ${nuocCatMatch[1].trim()}`;
    }
  }

  // Clean Route
  if (route.includes('TĨNH MẠCH') || route.includes('TM') || route.includes('IV')) {
    route = 'TMC';
  } else if (route.includes('BẮP') || route.includes('TB')) {
    route = 'TB';
  } else if (route.includes('DƯỚI DA') || route.includes('SC')) {
    route = 'TDD';
  }

  const dosageAndSolventText = `${qty} ${unit}${solventPart} – ${route}`;

  return {
    dosageAndSolventText,
    isAerosol: false,
    isInsulin: false,
  };
}

/**
 * Format Hour Strings to hospital standard:
 * e.g. "07h – 19h" or "07:15 – 19:15"
 */
export function formatHospitalHours(slots: string[], defaultOrderTime: string): string {
  if (!slots || slots.length === 0) {
    // fallback to defaultOrderTime
    if (!defaultOrderTime) return 'Chưa có giờ y lệnh';
    const match = defaultOrderTime.match(/^(\d{1,2})[:h](\d{2})/i);
    if (match) {
      const h = match[1].padStart(2, '0');
      const m = match[2];
      return m === '00' ? `${h}h` : `${h}:${m}`;
    }
    return defaultOrderTime;
  }

  return slots
    .map((s) => {
      const clean = s.trim();
      if (clean.includes(':')) {
        const [h, m] = clean.split(':');
        if (m === '00') {
          return `${h.padStart(2, '0')}h`;
        }
        return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
      }
      return `${clean.padStart(2, '0')}h`;
    })
    .join(' – ');
}

/**
 * Build the entire 2-Zone Grouped Patient Injection Book
 */
export function buildGroupedInjectionBook(injections: ProcessedInjectionRecord[] = []): GroupedInjectionBookData {
  const safeInjections = Array.isArray(injections) ? injections : [];
  const patientGroupsMap = new Map<string, PatientBookEntry>();
  const validationWarnings: GroupedInjectionBookData['validationWarnings'] = [];

  // Track patient names to detect homonyms / identical names with different birthdays or beds
  const nameToKeysMap = new Map<string, Set<string>>();

  safeInjections.forEach((rec, idx) => {
    const rawPatientName = (rec.patientName || '').trim() || 'Chưa rõ họ tên';
    const normName = normalizeVietnameseName(rawPatientName);
    const dob = rec.dob || (rec.birthYear ? String(rec.birthYear) : '');
    const deptRoomBed = rec.departmentRoomBed || '';
    const rawRoom = rec.room || '';
    const bed = rec.bed || '—';

    // 1. Classify Zone: KHU NỘI NHI vs KHU NHIỄM
    const wardList = classifyWardList(deptRoomBed, rawRoom, rec.area);
    const wardListTitle = wardList === 'KHU_NHIEM' ? 'KHU NHIỄM' : 'KHU NỘI NHI';

    // 2. Standardize Room Display
    const { roomDisplay, shortRoom, roomSortKey } = formatStandardRoom(rawRoom, deptRoomBed, wardList);
    const bedNumber = parseBedNumber(bed);

    // 3. Strict Patient Composite Key (Section 11)
    // HỌ TÊN + NGÀY SINH + KHOA/PHÒNG + GIƯỜNG
    const patientKey = `${normName}_${dob}_${shortRoom}_${bed}`.toLowerCase().replace(/\s+/g, '_');

    // Register name tracking for duplicate detection
    if (!nameToKeysMap.has(normName)) {
      nameToKeysMap.set(normName, new Set());
    }
    nameToKeysMap.get(normName)!.add(patientKey);

    // 4. Parse Medication details
    const { priority, categoryName } = getMedicationPriority(rec.drugFullName || rec.originalDrugName, rec.route, rec.categoryType);
    const { dosageAndSolventText, isAerosol, isInsulin } = formatDosageAndSolvent(rec);
    const timeInfo = formatDoseAndTimeSchedule(rec);
    const formattedHours = formatHospitalHours(timeInfo.timeSlots, rec.orderTime);

    // Validation checks for this record
    let needsReview = false;
    let reviewReason = '';

    if (!rec.orderTime || rec.orderTime === 'Chưa rõ' || rec.orderTime === '—') {
      needsReview = true;
      reviewReason = 'Chưa có giờ y lệnh';
      validationWarnings.push({
        rowIndex: rec.stt || idx + 1,
        patientName: rawPatientName,
        reason: `Thuốc ${rec.originalDrugName}: Chưa có thời gian y lệnh cụ thể`,
        severity: 'MEDIUM',
        rawRecord: rec,
      });
    }

    // Check drug name conflict between Drug column and Notes column
    if (rec.notes) {
      const notesLower = rec.notes.toLowerCase();
      const drugLower = (rec.originalDrugName || '').toLowerCase();
      if (
        (drugLower.includes('cefotaxim') && notesLower.includes('ceftazidim')) ||
        (drugLower.includes('ceftazidim') && notesLower.includes('cefotaxim'))
      ) {
        needsReview = true;
        reviewReason = '⚠ CẦN KIỂM TRA DỮ LIỆU GỐC (Tên thuốc mâu thuẫn với Ghi chú)';
        validationWarnings.push({
          rowIndex: rec.stt || idx + 1,
          patientName: rawPatientName,
          reason: `⚠ CẦN KIỂM TRA DỮ LIỆU GỐC: Cột thuốc ghi "${rec.originalDrugName}" nhưng Ghi chú có nội dung khác`,
          severity: 'HIGH',
          rawRecord: rec,
        });
      }
    }

    const medItem: PatientMedicationItem = {
      id: rec.id,
      originalDrugName: rec.originalDrugName || rec.drugFullName,
      drugFullName: rec.drugFullName,
      activeIngredient: rec.activeIngredient,
      strength: rec.strength,
      unit: rec.unit,
      quantity: rec.quantity,
      route: rec.route,
      isAerosol,
      isInsulin,
      dosageAndSolventText,
      frequencyText: isInsulin ? dosageAndSolventText : timeInfo.doseText,
      timeScheduleText: formattedHours,
      rawOrderTime: rec.orderTime,
      rawNotes: rec.notes,
      priorityOrder: priority,
      categoryName,
      isExecuted: !!rec.isExecuted,
      timeSlots: timeInfo.timeSlots,
      timeSlotsExecuted: rec.timeSlotsExecuted,
      needsReview,
      reviewReason,
      rawRecord: rec,
    };

    // 5. Add to or update Patient Group
    if (!patientGroupsMap.has(patientKey)) {
      patientGroupsMap.set(patientKey, {
        patientKey,
        patientName: rawPatientName,
        age: rec.age || '',
        dob: rec.dob,
        birthYear: rec.birthYear,
        isPediatric: rec.isPediatric,
        gender: rec.gender,
        wardList,
        wardListTitle,
        roomDisplay,
        shortRoom,
        bed,
        bedNumber,
        roomSortKey,
        medications: [medItem],
        totalMedications: 1,
        isAllExecuted: !!rec.isExecuted,
        hasWarning: needsReview,
        warningMessage: reviewReason,
      });
    } else {
      const existing = patientGroupsMap.get(patientKey)!;
      // Check if this patient already has this medication
      const existingMedIndex = existing.medications.findIndex((m) => {
        const nameA = (m.originalDrugName || m.drugFullName).toLowerCase();
        const nameB = (medItem.originalDrugName || medItem.drugFullName).toLowerCase();
        return nameA === nameB ||
          ((nameA.includes('vinsamol') || nameA.includes('vinsalmol')) && (nameB.includes('vinsamol') || nameB.includes('vinsalmol'))) ||
          ((nameA.includes('zensonid') || nameA.includes('zensonide')) && (nameB.includes('zensonid') || nameB.includes('zensonide')));
      });

      if (existingMedIndex >= 0 && !medItem.isInsulin) {
        // Merge multiple orders of the same drug for the patient
        const existingMed = existing.medications[existingMedIndex];
        const combinedSlots = Array.from(new Set([...(existingMed.timeSlots || []), ...(medItem.timeSlots || [])]));
        const totalCount = Math.max(combinedSlots.length, (Number(existingMed.quantity) || 1) + (Number(medItem.quantity) || 1));
        const baseDose = existingMed.frequencyText.split(' x ')[0] || '1';
        existingMed.timeSlots = combinedSlots;
        existingMed.timeScheduleText = formatHospitalHours(combinedSlots, medItem.rawOrderTime);
        existingMed.frequencyText = totalCount > 1 ? `${baseDose} x ${totalCount}` : baseDose;
        existingMed.quantity = (Number(existingMed.quantity) || 1) + (Number(medItem.quantity) || 1);
      } else {
        existing.medications.push(medItem);
      }
      existing.totalMedications = existing.medications.length;
      if (needsReview) {
        existing.hasWarning = true;
        existing.warningMessage = reviewReason;
      }
    }
  });

  // Check for duplicate names with different identity keys (Section 11 Warning)
  nameToKeysMap.forEach((keys, normName) => {
    if (keys.size > 1) {
      keys.forEach((key) => {
        const patient = patientGroupsMap.get(key);
        if (patient) {
          patient.hasWarning = true;
          patient.warningMessage = 'CẢNH BÁO: Có người bệnh trùng tên hoặc dữ liệu chưa đủ để xác định duy nhất.';
          validationWarnings.push({
            patientName: patient.patientName,
            reason: `CẢNH BÁO: Bệnh nhân trùng tên "${patient.patientName}" ở phòng ${patient.shortRoom} (Giường ${patient.bed})`,
            severity: 'HIGH',
          });
        }
      });
    }
  });

  // Sort medications within each patient according to nursing priority:
  // 1. Kháng sinh -> 2. Điều trị chính -> 3. Dạ dày -> 4. Giảm đau -> 5. Khác -> 6. Khí dung
  patientGroupsMap.forEach((patient) => {
    patient.medications.sort((a, b) => {
      if (a.priorityOrder !== b.priorityOrder) {
        return a.priorityOrder - b.priorityOrder;
      }
      return a.originalDrugName.localeCompare(b.originalDrugName, 'vi');
    });
    patient.isAllExecuted = patient.medications.every((m) => m.isExecuted);
  });

  // Convert to Array
  const allPatients = Array.from(patientGroupsMap.values());

  // Sort patients: Room ascending, then Bed ascending (Section 15)
  allPatients.sort((a, b) => {
    if (a.roomSortKey !== b.roomSortKey) {
      return a.roomSortKey - b.roomSortKey;
    }
    if (a.shortRoom !== b.shortRoom) {
      return a.shortRoom.localeCompare(b.shortRoom, 'vi', { numeric: true });
    }
    return a.bedNumber - b.bedNumber;
  });

  // Split into KHU NỘI NHI and KHU NHIỄM
  const khuNoiNhiPatients = allPatients.filter((p) => p.wardList === 'KHU_NOI_NHI');
  const khuNhiemPatients = allPatients.filter((p) => p.wardList === 'KHU_NHIEM');

  return {
    allPatients,
    khuNoiNhiPatients,
    khuNhiemPatients,
    khuNoiNhi: khuNoiNhiPatients,
    khuNhiem: khuNhiemPatients,
    totalPatients: allPatients.length,
    totalKhuNoiNhi: khuNoiNhiPatients.length,
    totalKhuNhiem: khuNhiemPatients.length,
    totalInjections: safeInjections.length,
    totalPendingValidation: validationWarnings.length,
    validationWarnings,
  };
}
