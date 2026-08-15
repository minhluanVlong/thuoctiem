/**
 * Matching and Processing Engine for Sổ Thuốc Tiêm Điện Tử
 */
import {
  RawDrugRecord,
  RawRoomRecord,
  ProcessedInjectionRecord,
  PendingCheckRecord,
  ExcludedItemRecord,
  ProcessingReport,
} from '../types/hospital';
import { classifyMedicationItem } from './drugClassifier';
import { formatOrderDate, parseAgeAndDob } from './excelParser';

/**
 * Standardize Vietnamese Full Name for Safe Strict Matching
 * - Trims whitespaces
 * - Collapses multiple spaces into single space
 * - Lowercases with Unicode NFC normalization
 * - Preserves Vietnamese accents (DO NOT remove tones)
 */
export function normalizeVietnameseName(name?: string): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Clean & normalize patient codes (Preserve leading zeros)
 */
export function normalizeCode(code: any): string {
  if (code === undefined || code === null) return '';
  return String(code).trim().toLowerCase();
}

/**
 * Compare ages with safe parsing
 */
function isAgeMatching(age1?: any, age2?: any): boolean {
  if (!age1 || !age2) return true; // not conflicting
  const num1 = parseInt(String(age1).replace(/\D/g, ''), 10);
  const num2 = parseInt(String(age2).replace(/\D/g, ''), 10);
  if (isNaN(num1) || isNaN(num2)) return true;
  return Math.abs(num1 - num2) <= 1; // Allow 1-year variance for birth year calculation
}

/**
 * Compare genders
 */
function isGenderMatching(g1?: string, g2?: string): boolean {
  if (!g1 || !g2) return true;
  const n1 = normalizeVietnameseName(g1);
  const n2 = normalizeVietnameseName(g2);
  const isMale1 = n1.includes('nam') || n1 === 'm' || n1 === 'male';
  const isMale2 = n2.includes('nam') || n2 === 'm' || n2 === 'male';
  const isFemale1 = n1.includes('nu') || n1.includes('nữ') || n1 === 'f' || n1 === 'female';
  const isFemale2 = n2.includes('nu') || n2.includes('nữ') || n2 === 'f' || n2 === 'female';

  if (isMale1 && isFemale2) return false;
  if (isFemale1 && isMale2) return false;
  return true;
}

/**
 * Resolve Patient Age from drug record, room record, or DOB
 */
export function resolvePatientAge(drugRec: RawDrugRecord, matchedRoom?: RawRoomRecord | null): string {
  // 1. Direct Age from Drug Record
  if (drugRec.age !== undefined && drugRec.age !== null && String(drugRec.age).trim() !== '') {
    return String(drugRec.age).trim();
  }

  // 2. Direct Age from Room Record
  if (matchedRoom?.age !== undefined && matchedRoom.age !== null && String(matchedRoom.age).trim() !== '') {
    return String(matchedRoom.age).trim();
  }

  // 3. Calculate from DOB (Drug Record or Room Record)
  const dobToUse = drugRec.dob || matchedRoom?.dob;
  if (dobToUse) {
    const { age } = parseAgeAndDob('', dobToUse);
    if (age) return age;
  }

  return '';
}

/**
 * Assemble Drug Full Name preserving original details
 */
export function buildDrugFullName(raw: RawDrugRecord): string {
  const name = (raw.drugName || '').trim();
  const strength = raw.strength ? raw.strength.trim() : '';

  // If strength is already in the drug name, avoid repeating
  if (strength && !name.toLowerCase().includes(strength.toLowerCase())) {
    return `${name} ${strength}`;
  }
  return name;
}

/**
 * Main Process & Match Function
 * Fully includes all records from order statistics (thống kê truyền dịch / thuốc tiêm),
 * gracefully preserving records with missing routes so users can manually supplement them.
 */
export function processAndMatchHospitalData(params: {
  drugRecords: RawDrugRecord[];
  roomRecords: RawRoomRecord[];
  selectedDate?: string;
  includeAllOrders?: boolean;
}): {
  injections: ProcessedInjectionRecord[];
  pendingChecks: PendingCheckRecord[];
  excludedItems: ExcludedItemRecord[];
  report: ProcessingReport;
} {
  const { drugRecords, roomRecords, selectedDate, includeAllOrders = true } = params;

  // Extract all distinct dates
  const datesSet = new Set<string>();
  drugRecords.forEach(r => {
    if (r.orderDate) datesSet.add(r.orderDate);
  });
  const availableDates = Array.from(datesSet).sort();

  // Filter drug records by selected date if provided
  const targetDrugRecords = selectedDate && selectedDate !== 'ALL'
    ? drugRecords.filter(r => r.orderDate === selectedDate || !r.orderDate)
    : drugRecords;

  // Build Lookups from Room Records
  const codeToRoomsMap = new Map<string, RawRoomRecord[]>();
  const medicalRecordToRoomsMap = new Map<string, RawRoomRecord[]>();
  const nameToRoomsMap = new Map<string, RawRoomRecord[]>();

  roomRecords.forEach(roomRec => {
    // By Patient Code
    const pCode = normalizeCode(roomRec.patientCode);
    if (pCode) {
      const list = codeToRoomsMap.get(pCode) || [];
      list.push(roomRec);
      codeToRoomsMap.set(pCode, list);
    }

    // By Medical Record Code
    const mCode = normalizeCode(roomRec.medicalRecordCode);
    if (mCode) {
      const list = medicalRecordToRoomsMap.get(mCode) || [];
      list.push(roomRec);
      medicalRecordToRoomsMap.set(mCode, list);
    }

    // By Normalized Name
    const normName = normalizeVietnameseName(roomRec.patientName);
    if (normName) {
      const list = nameToRoomsMap.get(normName) || [];
      list.push(roomRec);
      nameToRoomsMap.set(normName, list);
    }
  });

  const validInjections: ProcessedInjectionRecord[] = [];
  const pendingChecks: PendingCheckRecord[] = [];
  const excludedItems: ExcludedItemRecord[] = [];

  let totalExcludedInfusions = 0;
  let totalExcludedSupplies = 0;
  let totalExcludedOther = 0;

  const matchedPatientsSet = new Set<string>();
  const unmatchedPatientsSet = new Set<string>();

  // Process Each Drug Order Record
  targetDrugRecords.forEach((drugRec, idx) => {
    const rawPatientName = drugRec.patientName?.trim() || 'Chưa rõ họ tên';
    const normPatientName = normalizeVietnameseName(drugRec.patientName);
    const pCode = normalizeCode(drugRec.patientCode);
    const mCode = normalizeCode(drugRec.medicalRecordCode);

    // 1. Check Drug Classification
    const classificationResult = classifyMedicationItem({
      drugName: drugRec.drugName,
      route: drugRec.route,
      unit: drugRec.unit,
      activeIngredient: drugRec.activeIngredient,
      dosageForm: drugRec.dosageForm,
    });

    // Medical supplies (pure materials like gloves, syringes, cotton) -> Exclude to keep medication list clean
    if (classificationResult.classification === 'MEDICAL_SUPPLY') {
      totalExcludedSupplies++;
      excludedItems.push({
        id: `ex-${idx}`,
        stt: excludedItems.length + 1,
        patientName: rawPatientName,
        patientCode: drugRec.patientCode,
        itemName: buildDrugFullName(drugRec),
        category: 'MEDICAL_SUPPLY',
        route: drugRec.route,
        unit: drugRec.unit,
        orderTime: drugRec.orderTime,
        reason: classificationResult.reason,
      });
      return;
    }

    // Match with Room List (Priority 1: Code, Priority 2: Medical Record Code, Priority 3: Full Name)
    let matchedRoom: RawRoomRecord | null = null;
    let matchType: 'CODE' | 'NAME_STRICT' | 'MANUAL' = 'CODE';

    // Try Patient Code
    if (pCode && codeToRoomsMap.has(pCode)) {
      const candidates = codeToRoomsMap.get(pCode)!;
      if (candidates.length === 1) {
        matchedRoom = candidates[0];
        matchType = 'CODE';
      } else {
        const exactNameCandidate = candidates.find(c => normalizeVietnameseName(c.patientName) === normPatientName);
        if (exactNameCandidate) {
          matchedRoom = exactNameCandidate;
          matchType = 'CODE';
        }
      }
    }

    // Try Medical Record Code
    if (!matchedRoom && mCode && medicalRecordToRoomsMap.has(mCode)) {
      const candidates = medicalRecordToRoomsMap.get(mCode)!;
      if (candidates.length === 1) {
        matchedRoom = candidates[0];
        matchType = 'CODE';
      }
    }

    // Try Strict Name Match
    if (!matchedRoom && normPatientName && nameToRoomsMap.has(normPatientName)) {
      const candidates = nameToRoomsMap.get(normPatientName)!;
      if (candidates.length === 1) {
        matchedRoom = candidates[0];
        matchType = 'NAME_STRICT';
      } else {
        // Disambiguate by DOB / Age / Gender
        const filtered = candidates.filter(cand => {
          const ageOk = isAgeMatching(drugRec.age, cand.age);
          const genderOk = isGenderMatching(drugRec.gender, cand.gender);
          const dobOk = !drugRec.dob || !cand.dob || drugRec.dob === cand.dob;
          return ageOk && genderOk && dobOk;
        });

        if (filtered.length === 1) {
          matchedRoom = filtered[0];
          matchType = 'NAME_STRICT';
        } else {
          matchedRoom = candidates[0]; // fallback candidate
          matchType = 'MANUAL';
        }
      }
    }

    if (matchedRoom) {
      matchedPatientsSet.add(rawPatientName);
    } else {
      unmatchedPatientsSet.add(rawPatientName);
    }

    // Calculate final fields
    const patientCodeFinal = drugRec.patientCode || matchedRoom?.patientCode || 'Chưa có mã';
    const ageFinal = resolvePatientAge(drugRec, matchedRoom);
    const genderFinal = drugRec.gender || matchedRoom?.gender || '';
    const roomFinal = matchedRoom?.room || 'Chưa xếp phòng';
    const bedFinal = matchedRoom?.bed || '—';
    const drugFullName = buildDrugFullName(drugRec);
    const orderTimeFinal = drugRec.orderTime || '08:00';
    const routeFinal = drugRec.route ? drugRec.route.trim() : (classificationResult.classification === 'INFUSION' ? 'Truyền TM' : '');

    // Add note if route is missing
    let recordNote = '';
    if (!drugRec.route) {
      recordNote = 'Chưa có đường dùng (cần bổ sung)';
    }
    if (!matchedRoom) {
      recordNote = recordNote ? `${recordNote} • Chưa tìm thấy phòng` : 'Chưa tìm thấy phòng';
    }

    // Push into Primary Valid Injections list
    validInjections.push({
      id: `inj-${idx}-${Date.now()}`,
      stt: validInjections.length + 1,
      patientCode: patientCodeFinal,
      medicalRecordCode: drugRec.medicalRecordCode || matchedRoom?.medicalRecordCode,
      patientName: rawPatientName,
      age: ageFinal,
      gender: genderFinal,
      dob: drugRec.dob || matchedRoom?.dob,
      room: roomFinal,
      bed: bedFinal,
      drugFullName,
      originalDrugName: drugRec.drugName,
      strength: drugRec.strength || '',
      unit: drugRec.unit || 'Ống',
      quantity: drugRec.quantity !== undefined ? drugRec.quantity : 1,
      route: routeFinal,
      orderTime: orderTimeFinal,
      orderDate: drugRec.orderDate || formatOrderDate(new Date()),
      activeIngredient: drugRec.activeIngredient,
      matchType,
      isExecuted: false,
      notes: recordNote,
    });
  });

  // Duplicate Check (Cảnh báo trùng dữ liệu)
  const dupMap = new Map<string, number[]>();
  validInjections.forEach((item, index) => {
    const key = `${normalizeVietnameseName(item.patientName)}|${item.drugFullName.toLowerCase()}|${item.orderTime}|${item.orderDate}`;
    const list = dupMap.get(key) || [];
    list.push(index);
    dupMap.set(key, list);
  });

  let duplicateWarningCount = 0;
  dupMap.forEach((indices, key) => {
    if (indices.length > 1) {
      duplicateWarningCount += indices.length;
      indices.forEach(idx => {
        validInjections[idx].isDuplicate = true;
        validInjections[idx].duplicateGroupKey = key;
      });
    }
  });

  // Default Sort: PHÒNG -> BỆNH NHÂN -> THỜI GIAN
  sortInjectionRecords(validInjections, 'ROOM_PATIENT_TIME');

  // Re-index STT
  validInjections.forEach((item, idx) => {
    item.stt = idx + 1;
  });

  const report: ProcessingReport = {
    totalDrugRows: targetDrugRecords.length,
    totalRoomRows: roomRecords.length,
    identifiedPatientRows: validInjections.length,
    unidentifiedPatientRows: pendingChecks.length,
    patientsWithRoom: matchedPatientsSet.size,
    patientsWithoutRoom: unmatchedPatientsSet.size,
    totalValidInjections: validInjections.length,
    totalExcludedInfusions,
    totalExcludedSupplies,
    totalExcludedOther,
    totalPendingChecks: pendingChecks.length,
    duplicateWarningCount,
    availableDates,
    departmentName: roomRecords.find(r => r.department)?.department || 'Khoa Nội Tổng Hợp',
  };

  return {
    injections: validInjections,
    pendingChecks,
    excludedItems,
    report,
  };
}

export type SortMode = 'ROOM_PATIENT_TIME' | 'TIME' | 'PATIENT_NAME' | 'BED';

/**
 * Sort injection records according to nursing workflows
 */
export function sortInjectionRecords(records: ProcessedInjectionRecord[], sortMode: SortMode): void {
  records.sort((a, b) => {
    if (sortMode === 'ROOM_PATIENT_TIME') {
      // 1. Room
      const roomComp = a.room.localeCompare(b.room, 'vi', { numeric: true });
      if (roomComp !== 0) return roomComp;

      // 2. Bed
      const bedComp = (a.bed || '').localeCompare(b.bed || '', 'vi', { numeric: true });
      if (bedComp !== 0) return bedComp;

      // 3. Patient Name
      const nameComp = a.patientName.localeCompare(b.patientName, 'vi');
      if (nameComp !== 0) return nameComp;

      // 4. Order Time
      return (a.orderTime || '').localeCompare(b.orderTime || '');
    }

    if (sortMode === 'TIME') {
      const timeComp = (a.orderTime || '').localeCompare(b.orderTime || '');
      if (timeComp !== 0) return timeComp;
      const roomComp = a.room.localeCompare(b.room, 'vi', { numeric: true });
      if (roomComp !== 0) return roomComp;
      return a.patientName.localeCompare(b.patientName, 'vi');
    }

    if (sortMode === 'PATIENT_NAME') {
      const nameComp = a.patientName.localeCompare(b.patientName, 'vi');
      if (nameComp !== 0) return nameComp;
      return (a.orderTime || '').localeCompare(b.orderTime || '');
    }

    if (sortMode === 'BED') {
      const roomComp = a.room.localeCompare(b.room, 'vi', { numeric: true });
      if (roomComp !== 0) return roomComp;
      const bedComp = (a.bed || '').localeCompare(b.bed || '', 'vi', { numeric: true });
      if (bedComp !== 0) return bedComp;
      return (a.orderTime || '').localeCompare(b.orderTime || '');
    }

    return 0;
  });
}

