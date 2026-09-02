/**
 * Matching, Processing & Medication Reconciliation Engine for SỔ THUỐC TIÊM ĐIỆN TỬ
 */
import {
  RawDrugRecord,
  RawRoomRecord,
  ProcessedInjectionRecord,
  PendingCheckRecord,
  ExcludedItemRecord,
  ProcessingReport,
  DayComparisonReport,
  PatientReconciliationSummary,
  MedicationChangeStatus,
} from '../types/hospital';
import { classifyMedicationItem } from './drugClassifier';
import {
  formatOrderDate,
  calculatePatientAgeAndPediatric,
  extractHospitalAreaAndRoom
} from './excelParser';

/**
 * Standardize Vietnamese Full Name for Safe Strict Matching
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
  if (!age1 || !age2) return true;
  const num1 = parseInt(String(age1).replace(/\D/g, ''), 10);
  const num2 = parseInt(String(age2).replace(/\D/g, ''), 10);
  if (isNaN(num1) || isNaN(num2)) return true;
  return Math.abs(num1 - num2) <= 1;
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
 * Resolve Patient Age & Pediatric formatting
 * Tuổi = Năm hiện tại - Năm sinh (hoặc X tháng nếu bé nhi)
 */
export function resolvePatientAge(
  drugRec: RawDrugRecord,
  matchedRoom?: RawRoomRecord | null
): { age: string; isPediatric: boolean } {
  // 1. If drug record already has parsed age
  if (drugRec.age) {
    const isP = String(drugRec.age).includes('tháng') || (drugRec.birthYear && new Date().getFullYear() - drugRec.birthYear < 16);
    return { age: String(drugRec.age).trim(), isPediatric: !!isP };
  }

  // 2. If room record has parsed age
  if (matchedRoom?.age) {
    const isP = String(matchedRoom.age).includes('tháng') || (matchedRoom.birthYear && new Date().getFullYear() - matchedRoom.birthYear < 16);
    return { age: String(matchedRoom.age).trim(), isPediatric: !!isP };
  }

  // 3. Calculate from DOB/BirthYear
  const rawDob = drugRec.dob || matchedRoom?.dob || drugRec.birthYear || matchedRoom?.birthYear;
  const rawAge = drugRec.age || matchedRoom?.age;
  const { age, isPediatric } = calculatePatientAgeAndPediatric(rawAge, rawDob);

  return { age: age || 'Chưa rõ tuổi', isPediatric };
}

/**
 * Resolve Room Display: Khu nào & Buồng số mấy
 */
export function resolveRoomAndArea(
  drugRec: RawDrugRecord,
  matchedRoom?: RawRoomRecord | null
): { roomDisplay: string; bed: string; area: string; roomNumber: string } {
  // Priority 1: From drug record's "Khoa Buồng - Giường" column
  if (drugRec.departmentRoomBed) {
    const extracted = extractHospitalAreaAndRoom(drugRec.departmentRoomBed);
    if (extracted.roomDisplay && extracted.roomDisplay !== 'Chưa xếp phòng') {
      return {
        roomDisplay: extracted.roomDisplay,
        bed: extracted.bed || '—',
        area: extracted.area,
        roomNumber: extracted.roomNumber,
      };
    }
  }

  // Priority 2: From matched Room Record
  if (matchedRoom) {
    if (matchedRoom.departmentRoomBed) {
      const extracted = extractHospitalAreaAndRoom(matchedRoom.departmentRoomBed);
      if (extracted.roomDisplay && extracted.roomDisplay !== 'Chưa xếp phòng') {
        return {
          roomDisplay: extracted.roomDisplay,
          bed: matchedRoom.bed || extracted.bed || '—',
          area: extracted.area,
          roomNumber: extracted.roomNumber,
        };
      }
    }
    const extractedRoom = extractHospitalAreaAndRoom(matchedRoom.room);
    return {
      roomDisplay: extractedRoom.roomDisplay || matchedRoom.room || 'Chưa xếp phòng',
      bed: matchedRoom.bed || '—',
      area: extractedRoom.area,
      roomNumber: extractedRoom.roomNumber,
    };
  }

  // Priority 3: Drug record raw room/area fields
  if (drugRec.area && drugRec.roomNumber) {
    return {
      roomDisplay: `${drugRec.area} - ${drugRec.roomNumber}`,
      bed: '—',
      area: drugRec.area,
      roomNumber: drugRec.roomNumber,
    };
  }

  return {
    roomDisplay: 'Chưa xếp phòng',
    bed: '—',
    area: '',
    roomNumber: '',
  };
}

/**
 * Assemble Drug Full Name preserving complete details
 */
export function buildDrugFullName(raw: RawDrugRecord): string {
  const name = (raw.drugName || '').trim();
  const strength = raw.strength ? raw.strength.trim() : '';

  if (strength && !name.toLowerCase().includes(strength.toLowerCase())) {
    return `${name} ${strength}`;
  }
  return name;
}

/**
 * Main Process & Match Function
 * Fully aligns with user request:
 * 1. Tên bệnh nhân
 * 2. Tuổi (Năm hiện tại - Năm sinh / X tháng)
 * 3. Phòng (Khu & Buồng)
 * 4. Tên thuốc & hàm lượng đầy đủ
 * 5. Ghi chú (đường dùng / dặn dò)
 * 6. Thời gian y lệnh (cột cuối cùng)
 */
export function processAndMatchHospitalData(params: {
  drugRecords: RawDrugRecord[];
  roomRecords?: RawRoomRecord[];
  selectedDate?: string;
  previousDayRecords?: ProcessedInjectionRecord[];
  previousDayDrugRecords?: RawDrugRecord[];
}): {
  injections: ProcessedInjectionRecord[];
  pendingChecks: PendingCheckRecord[];
  excludedItems: ExcludedItemRecord[];
  report: ProcessingReport;
  reconciliationReport?: DayComparisonReport;
} {
  const { drugRecords, roomRecords = [], selectedDate, previousDayRecords, previousDayDrugRecords } = params;

  // Extract all distinct dates
  const datesSet = new Set<string>();
  drugRecords.forEach(r => {
    if (r.orderDate) datesSet.add(r.orderDate);
  });
  const availableDates = Array.from(datesSet).sort();

  // Filter drug records by selected date if provided (if selectedDate is empty string, include all records)
  const trimmedSelectedDate = selectedDate ? selectedDate.trim() : '';
  const targetDrugRecords = trimmedSelectedDate && trimmedSelectedDate !== 'ALL'
    ? (drugRecords.some(r => r.orderDate === trimmedSelectedDate)
        ? drugRecords.filter(r => r.orderDate === trimmedSelectedDate || !r.orderDate)
        : drugRecords)
    : drugRecords;

  // Build Lookups from Room Records if available
  const codeToRoomsMap = new Map<string, RawRoomRecord[]>();
  const medicalRecordToRoomsMap = new Map<string, RawRoomRecord[]>();
  const nameToRoomsMap = new Map<string, RawRoomRecord[]>();

  roomRecords.forEach(roomRec => {
    const pCode = normalizeCode(roomRec.patientCode);
    if (pCode) {
      const list = codeToRoomsMap.get(pCode) || [];
      list.push(roomRec);
      codeToRoomsMap.set(pCode, list);
    }

    const mCode = normalizeCode(roomRec.medicalRecordCode);
    if (mCode) {
      const list = medicalRecordToRoomsMap.get(mCode) || [];
      list.push(roomRec);
      medicalRecordToRoomsMap.set(mCode, list);
    }

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

    // Medical supplies (pure materials like gloves, syringes, cotton) -> Exclude
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

    // Match with Room List if provided
    let matchedRoom: RawRoomRecord | null = null;
    let matchType: 'CODE' | 'NAME_STRICT' | 'MANUAL' = 'CODE';

    if (pCode && codeToRoomsMap.has(pCode)) {
      const candidates = codeToRoomsMap.get(pCode)!;
      matchedRoom = candidates[0];
      matchType = 'CODE';
    } else if (mCode && medicalRecordToRoomsMap.has(mCode)) {
      const candidates = medicalRecordToRoomsMap.get(mCode)!;
      matchedRoom = candidates[0];
      matchType = 'CODE';
    } else if (normPatientName && nameToRoomsMap.has(normPatientName)) {
      const candidates = nameToRoomsMap.get(normPatientName)!;
      matchedRoom = candidates[0];
      matchType = 'NAME_STRICT';
    }

    // Resolve Room Display: Khu nào - Buồng số mấy
    const roomInfo = resolveRoomAndArea(drugRec, matchedRoom);
    if (roomInfo.roomDisplay && roomInfo.roomDisplay !== 'Chưa xếp phòng') {
      matchedPatientsSet.add(rawPatientName);
    } else {
      unmatchedPatientsSet.add(rawPatientName);
    }

    // Resolve Age & Pediatric formatting (Năm hiện tại - Năm sinh / X tháng)
    const { age: ageFinal, isPediatric } = resolvePatientAge(drugRec, matchedRoom);

    const patientCodeFinal = drugRec.patientCode || matchedRoom?.patientCode || '';
    const genderFinal = drugRec.gender || matchedRoom?.gender || '';
    const drugFullName = buildDrugFullName(drugRec);
    const orderTimeFinal = drugRec.orderTime || '08:00';
    const routeFinal = drugRec.route ? drugRec.route.trim() : (classificationResult.classification === 'INFUSION' ? 'Truyền TM' : '');

    // Format Notes
    let notesFinal = drugRec.notes || '';
    if (!notesFinal) {
      if (routeFinal) {
        notesFinal = `Đường dùng: ${routeFinal}`;
      } else {
        notesFinal = 'Cần bổ sung đường dùng';
      }
    }

    validInjections.push({
      id: `inj-${idx}-${Date.now()}`,
      stt: validInjections.length + 1,
      patientCode: patientCodeFinal,
      medicalRecordCode: drugRec.medicalRecordCode || matchedRoom?.medicalRecordCode,
      patientName: rawPatientName,
      age: ageFinal,
      isPediatric,
      gender: genderFinal,
      dob: drugRec.dob || matchedRoom?.dob,
      birthYear: drugRec.birthYear || matchedRoom?.birthYear,
      patientAddress: drugRec.patientAddress,
      treatmentSheet: drugRec.treatmentSheet,
      categoryType: drugRec.categoryType,
      doctor: drugRec.doctor,
      departmentRoomBed: drugRec.departmentRoomBed || matchedRoom?.departmentRoomBed,
      room: roomInfo.roomDisplay,
      area: roomInfo.area,
      roomNumber: roomInfo.roomNumber,
      bed: roomInfo.bed,
      drugFullName,
      originalDrugName: drugRec.drugName,
      strength: drugRec.strength || '',
      unit: drugRec.unit || 'Ống',
      quantity: drugRec.quantity !== undefined ? drugRec.quantity : 1,
      route: routeFinal,
      notes: notesFinal,
      orderTime: orderTimeFinal,
      orderDate: drugRec.orderDate || formatOrderDate(new Date()),
      activeIngredient: drugRec.activeIngredient,
      matchType,
      isExecuted: false,
      changeStatus: 'NONE',
    });
  });

  // Duplicate Check
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

  // Day Reconciliation / Previous Day Comparison if requested
  let reconciliationReport: DayComparisonReport | undefined = undefined;
  
  let compPreviousList: ProcessedInjectionRecord[] = previousDayRecords || [];
  if ((!compPreviousList || compPreviousList.length === 0) && previousDayDrugRecords && previousDayDrugRecords.length > 0) {
    const prevProcessed = processAndMatchHospitalData({
      drugRecords: previousDayDrugRecords,
      roomRecords,
    });
    compPreviousList = prevProcessed.injections;
  }

  if (compPreviousList && compPreviousList.length > 0) {
    const todayDateStr = selectedDate || availableDates[0] || 'Hôm nay';
    const yesterdayDateStr = compPreviousList[0]?.orderDate || 'Hôm trước';
    reconciliationReport = compareTwoDaysMedication(
      validInjections,
      compPreviousList,
      todayDateStr,
      yesterdayDateStr
    );
  }

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
    departmentName:
      targetDrugRecords.map(r => extractHospitalAreaAndRoom(r.departmentRoomBed).department).find(Boolean) ||
      roomRecords.find(r => r.department)?.department ||
      'KHOA NỘI TỔNG HỢP - NHI - TRUYỀN NHIỄM',
  };

  return {
    injections: validInjections,
    pendingChecks,
    excludedItems,
    report,
    reconciliationReport,
  };
}

export type SortMode = 'ROOM_PATIENT_TIME' | 'TIME' | 'PATIENT_NAME' | 'BED';

/**
 * Sort injection records according to nursing workflows
 */
export function sortInjectionRecords(records: ProcessedInjectionRecord[], sortMode: SortMode): void {
  records.sort((a, b) => {
    if (sortMode === 'ROOM_PATIENT_TIME') {
      const roomComp = a.room.localeCompare(b.room, 'vi', { numeric: true });
      if (roomComp !== 0) return roomComp;

      const nameComp = a.patientName.localeCompare(b.patientName, 'vi');
      if (nameComp !== 0) return nameComp;

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

/**
 * Compare Two Days Medication Data (So sánh đối chiếu với ngày hôm trước)
 * Identifies:
 * - NEW: Newly prescribed today
 * - DISCONTINUED: Prescribed yesterday but stopped today
 * - CHANGED_DOSE / CHANGED_TIME: Dose or timing altered
 * - UNCHANGED: Maintained exactly
 */
export function compareTwoDaysMedication(
  todayInjections: ProcessedInjectionRecord[],
  yesterdayInjections: ProcessedInjectionRecord[],
  currentDate: string,
  previousDate: string
): DayComparisonReport {
  let newOrdersCount = 0;
  let discontinuedOrdersCount = 0;
  let changedOrdersCount = 0;
  let unchangedOrdersCount = 0;

  // Build Map of Yesterday Records: Key = "PatientNormName | DrugNormName"
  const yesterdayMap = new Map<string, ProcessedInjectionRecord[]>();
  yesterdayInjections.forEach(yItem => {
    const key = `${normalizeVietnameseName(yItem.patientName)}|${normalizeVietnameseName(yItem.originalDrugName || yItem.drugFullName)}`;
    const list = yesterdayMap.get(key) || [];
    list.push(yItem);
    yesterdayMap.set(key, list);
  });

  const matchedYesterdayIds = new Set<string>();

  // Evaluate Today Records against Yesterday
  todayInjections.forEach(todayItem => {
    const key = `${normalizeVietnameseName(todayItem.patientName)}|${normalizeVietnameseName(todayItem.originalDrugName || todayItem.drugFullName)}`;
    const yesterdayCandidates = yesterdayMap.get(key);

    if (!yesterdayCandidates || yesterdayCandidates.length === 0) {
      // New Medication Order!
      todayItem.changeStatus = 'NEW';
      newOrdersCount++;
    } else {
      // Candidate exists -> find best matching item
      const exactMatch = yesterdayCandidates.find(y =>
        String(y.quantity) === String(todayItem.quantity) &&
        y.orderTime === todayItem.orderTime
      );

      if (exactMatch) {
        todayItem.changeStatus = 'UNCHANGED';
        todayItem.previousDayDetails = {
          orderDate: exactMatch.orderDate,
          quantity: exactMatch.quantity,
          orderTime: exactMatch.orderTime,
          route: exactMatch.route,
          notes: exactMatch.notes,
        };
        matchedYesterdayIds.add(exactMatch.id);
        unchangedOrdersCount++;
      } else {
        // Dosage or Time Changed
        const sameQtyDiffTime = yesterdayCandidates.find(y => String(y.quantity) === String(todayItem.quantity));
        const matchedItem = sameQtyDiffTime || yesterdayCandidates[0];

        if (String(matchedItem.quantity) !== String(todayItem.quantity)) {
          todayItem.changeStatus = 'CHANGED_DOSE';
        } else {
          todayItem.changeStatus = 'CHANGED_TIME';
        }

        todayItem.previousDayDetails = {
          orderDate: matchedItem.orderDate,
          quantity: matchedItem.quantity,
          orderTime: matchedItem.orderTime,
          route: matchedItem.route,
          notes: matchedItem.notes,
        };
        matchedYesterdayIds.add(matchedItem.id);
        changedOrdersCount++;
      }
    }
  });

  // Find Discontinued Orders (Present yesterday but absent today)
  const discontinuedList: ProcessedInjectionRecord[] = [];
  yesterdayInjections.forEach(yItem => {
    if (!matchedYesterdayIds.has(yItem.id)) {
      // Check if patient is still in today list
      const patientInToday = todayInjections.find(t => normalizeVietnameseName(t.patientName) === normalizeVietnameseName(yItem.patientName));
      if (patientInToday) {
        discontinuedList.push({
          ...yItem,
          changeStatus: 'DISCONTINUED',
        });
        discontinuedOrdersCount++;
      }
    }
  });

  // Group by Patient for Summary
  const patientSummaryMap = new Map<string, PatientReconciliationSummary>();

  todayInjections.forEach(item => {
    const pName = item.patientName;
    if (!patientSummaryMap.has(pName)) {
      patientSummaryMap.set(pName, {
        patientName: pName,
        patientCode: item.patientCode,
        room: item.room,
        newOrders: [],
        discontinuedOrders: [],
        modifiedOrders: [],
        unchangedOrders: [],
      });
    }
    const summary = patientSummaryMap.get(pName)!;
    if (item.changeStatus === 'NEW') summary.newOrders.push(item);
    else if (item.changeStatus === 'CHANGED_DOSE' || item.changeStatus === 'CHANGED_TIME') summary.modifiedOrders.push(item);
    else if (item.changeStatus === 'UNCHANGED') summary.unchangedOrders.push(item);
  });

  discontinuedList.forEach(item => {
    const pName = item.patientName;
    if (patientSummaryMap.has(pName)) {
      patientSummaryMap.get(pName)!.discontinuedOrders.push(item);
    } else {
      patientSummaryMap.set(pName, {
        patientName: pName,
        patientCode: item.patientCode,
        room: item.room,
        newOrders: [],
        discontinuedOrders: [item],
        modifiedOrders: [],
        unchangedOrders: [],
      });
    }
  });

  return {
    currentDate,
    previousDate,
    totalToday: todayInjections.length,
    totalYesterday: yesterdayInjections.length,
    newOrdersCount,
    discontinuedOrdersCount,
    changedOrdersCount,
    unchangedOrdersCount,
    patientSummaries: Array.from(patientSummaryMap.values()),
    discontinuedList,
  };
}
