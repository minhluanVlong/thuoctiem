import { ProcessedInjectionRecord, MedicationChangeStatus } from '../types/hospital';

export type WardZone = 'ZONE_1_NOI_NHI_STANDARD' | 'ZONE_2_LAO_KHOA_NHI_NHIEM';

export interface WardZoneConfig {
  id: WardZone;
  title: string;
  shortTitle: string;
  badgeColor: string;
  description: string;
}

export const WARD_ZONE_CONFIGS: Record<WardZone, WardZoneConfig> = {
  ZONE_1_NOI_NHI_STANDARD: {
    id: 'ZONE_1_NOI_NHI_STANDARD',
    title: 'Danh sách 1: Khu Nội - Nhi (Trừ Lão khoa, Nhi 1, Nhi 2)',
    shortTitle: 'Khu Nội - Nhi',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Bao gồm các buồng bệnh Nội, Hồi sức 1, Hồi sức 2, Cấp cứu, Chờ xuất viện'
  },
  ZONE_2_LAO_KHOA_NHI_NHIEM: {
    id: 'ZONE_2_LAO_KHOA_NHI_NHIEM',
    title: 'Danh sách 2: Lão khoa, Nhi 1, Nhi 2 & Khu Nhiễm',
    shortTitle: 'Lão khoa - Nhi 1,2 - Nhiễm',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'Bao gồm Buồng Lão khoa, Buồng Nhi 1, Buồng Nhi 2, và tất cả buồng bệnh Khu Truyền Nhiễm'
  }
};

/**
 * Classifies room text into Zone 1 or Zone 2 with high precision:
 * - Zone 1: Khu Nội - Nhi (Trừ phòng Lão khoa, Nhi 1, Nhi 2) -> Hồi sức 1, 2, Cấp cứu, Buồng 1, 2, 3, 4, v.v.
 * - Zone 2: Phòng Lão khoa, Nhi 1, Nhi 2 & Toàn bộ Khu Truyền Nhiễm
 */
export function classifyRoomToWardZone(roomStr?: string, areaStr?: string, deptRoomBedStr?: string): WardZone {
  // Extract specific room & area strings, ignoring department name prefix
  let textToAnalyze = `${roomStr || ''} ${areaStr || ''}`.toLowerCase();
  
  if (deptRoomBedStr) {
    // Extract only the 'Buồng:' and 'Khu:' portion from departmentRoomBed, skipping 'Khoa: ...'
    const buongMatch = deptRoomBedStr.match(/Buồng:\s*([^\n\r]+)/i);
    if (buongMatch) {
      textToAnalyze += ` ${buongMatch[1].toLowerCase()}`;
    }
    const khuMatch = deptRoomBedStr.match(/Khu:\s*([^\n\r]+)/i);
    if (khuMatch) {
      textToAnalyze += ` ${khuMatch[1].toLowerCase()}`;
    }
  }

  // Check Zone 2 criteria:
  // 1. Buồng Lão khoa
  const isLaoKhoa = textToAnalyze.includes('lão khoa') || textToAnalyze.includes('lao khoa');
  
  // 2. Nhi 1 (Nhi 01, Nhi_1, Phòng Nhi 1, Buồng Nhi 1)
  const isNhi1 = /\bnhi\s*(?:1|01|_1)\b/i.test(textToAnalyze) || textToAnalyze.includes('buồng nhi 1') || textToAnalyze.includes('phòng nhi 1');
  
  // 3. Nhi 2 (Nhi 02, Nhi_2, Phòng Nhi 2, Buồng Nhi 2)
  const isNhi2 = /\bnhi\s*(?:2|02|_2)\b/i.test(textToAnalyze) || textToAnalyze.includes('buồng nhi 2') || textToAnalyze.includes('phòng nhi 2');
  
  // 4. Khu Nhiễm / Khu Truyền Nhiễm / Buồng Cách ly
  const isKhuNhiem = textToAnalyze.includes('khu nhiễm') || textToAnalyze.includes('khu truyen nhiem') || textToAnalyze.includes('khu truyền nhiễm') ||
                     textToAnalyze.includes('buồng cách ly') || textToAnalyze.includes('buong cach ly') ||
                     /\bkhu\s*nhi[eễ]m\b/i.test(textToAnalyze);

  if (isLaoKhoa || isNhi1 || isNhi2 || isKhuNhiem) {
    return 'ZONE_2_LAO_KHOA_NHI_NHIEM';
  }

  // Zone 1: Khu Nội - Nhi (Tất cả buồng còn lại: Hồi sức 1, Hồi sức 2, Cấp cứu, Buồng 1, 2, 3, 4, 5...)
  return 'ZONE_1_NOI_NHI_STANDARD';
}

export interface MatrixCellData {
  recordId: string;
  drugFullName: string;
  shortName: string;
  doseText: string;              // e.g. "1 x 3", "2/3", "1", "2", "3"
  timeSchedule: string;          // e.g. "7:15 - 15:15 - 23:15", "08:00 - 16:00"
  timeSlots: string[];           // ["7:15", "15:15", "23:15"]
  timeSlotsExecuted: boolean[];  // [true, false, false]
  isExecuted: boolean;
  notes?: string;                // e.g. "+ có Zensonid", "Pha 5ml NaCl", "TMC chậm"
  detailVerbatim?: string;       // Dòng 3: Chi tiết nguyên văn tên thuốc, hàm lượng, dung môi pha từ cột Ghi chú
  changeStatus?: MedicationChangeStatus;
  route?: string;                // TMC, PKD, TDD, IM
  unit?: string;
  quantity: string | number;
  orderCount?: number;           // Track number of merged orders
  rawRecord: ProcessedInjectionRecord;
}

export interface MatrixDrugColumn {
  id: string;                    // unique normalized id
  drugName: string;              // Base drug name e.g. "Catachit 1g"
  route: string;                 // TMC, IM, PKD, TDD
  unit?: string;
  strength?: string;
  fullTitle: string;             // e.g. "Catachit 1g\nTMC"
  category?: string;             // THUỐC TIÊM / KHÍ DUNG / INSULIN
  totalPrescriptions: number;    // Number of patients receiving this
  totalDoseSum?: string;         // e.g. "12 lọ", "6 ống"
}

export interface MatrixPatientRow {
  patientKey: string;            // unique identifier (code or name_room)
  patientCode: string;
  patientName: string;
  age: string;                   // e.g. "83", "64", "4 th", "5 th", "23 th"
  isPediatric: boolean;
  gender: string;
  room: string;                  // e.g. "HS2", "4", "3", "KL", "N2", "N1"
  rawRoom: string;
  bed: string;                   // e.g. "01", "05"
  patientAddress?: string;
  wardZone: WardZone;            // ZONE_1_NOI_NHI_STANDARD or ZONE_2_LAO_KHOA_NHI_NHIEM
  wardZoneName: string;
  cells: Record<string, MatrixCellData>; // drugColumnId -> cell (includes all injection & aerosol drugs on this single row)
  totalDrugs: number;
}

export interface MatrixSheetData {
  columns: MatrixDrugColumn[];
  rows: MatrixPatientRow[];
  zone1Rows: MatrixPatientRow[];   // DS 1: Khu Nội - Nhi (Trừ Lão khoa, Nhi 1, Nhi 2)
  zone2Rows: MatrixPatientRow[];   // DS 2: Lão khoa, Nhi 1, Nhi 2 & Khu Nhiễm
  zone1Columns: MatrixDrugColumn[];
  zone2Columns: MatrixDrugColumn[];
  allRooms: string[];
  totalPatients: number;
  totalDrugs: number;
  totalInjections: number;
}

/**
 * Deduplicates and clusters time slots so that repeated/similar shift hours
 * (e.g. 07:05 and 07:15) are merged into one slot per shift window,
 * completely preventing fake "1x6" doses or duplicated hours.
 */
export function mergeAndNormalizeTimeSlots(slotsA: string[], slotsB: string[], maxAllowed: number = 6): string[] {
  const allRaw = [...slotsA, ...slotsB].map((s) => (s || '').trim()).filter(Boolean);
  if (allRaw.length === 0) return ['7:00'];

  // Parse each slot into minutes from midnight
  const parsed = allRaw.map((slot) => {
    const clean = slot.replace('h', ':');
    const parts = clean.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parts.length > 1 ? parseInt(parts[1], 10) || 0 : 0;
    const hasExplicitMinute = parts.length > 1 && m > 0;
    return {
      raw: slot,
      totalMinutes: h * 60 + m,
      hour: h,
      minute: m,
      hasExplicitMinute,
    };
  });

  // Sort by time of day
  parsed.sort((a, b) => a.totalMinutes - b.totalMinutes);

  // Cluster slots that fall in the same shift start window (within 45 mins of each other e.g. 07:00 and 07:15)
  const clusters: { hour: number; minute: number; hasExplicitMinute: boolean; totalMinutes: number }[] = [];
  for (const item of parsed) {
    const existingIndex = clusters.findIndex((c) => {
      const diff = Math.abs(c.totalMinutes - item.totalMinutes);
      return diff <= 45 || Math.abs(diff - 1440) <= 45;
    });

    if (existingIndex >= 0) {
      // If the new item has explicit minutes and existing does not, upgrade it
      if (item.hasExplicitMinute && !clusters[existingIndex].hasExplicitMinute) {
        clusters[existingIndex] = item;
      }
    } else {
      clusters.push(item);
    }
  }

  // Sort clusters chronologically
  clusters.sort((a, b) => a.totalMinutes - b.totalMinutes);

  // Cap at maxAllowed (allows up to 6 doses per day)
  const finalClusters = clusters.slice(0, maxAllowed);

  return finalClusters.map((c) => {
    if (c.hasExplicitMinute) {
      return `${c.hour}:${String(c.minute).padStart(2, '0')}`;
    }
    return `${c.hour}`;
  });
}

/**
 * Parses start hour and minute from orderTime (e.g. "07:05" -> { hour: 7, minute: 5, hasMinute: true })
 */
export function parseStartHourAndMinute(orderTime?: string): {
  hour: number;
  minute: number;
  hasMinute: boolean;
  minuteStr: string;
} {
  if (!orderTime) {
    return { hour: 7, minute: 0, hasMinute: false, minuteStr: '00' };
  }
  const cleaned = orderTime.trim();
  const timeMatch = cleaned.match(/^(\d{1,2})[:h](\d{2})/i);
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10);
    const m = parseInt(timeMatch[2], 10);
    if (!isNaN(h) && h >= 0 && h <= 23 && !isNaN(m) && m >= 0 && m <= 59) {
      return {
        hour: h,
        minute: m,
        hasMinute: m > 0, // only true if there is actual minute > 0 e.g. 07:05, 07:15
        minuteStr: String(m).padStart(2, '0'),
      };
    }
  }

  const hourOnlyMatch = cleaned.match(/^(\d{1,2})/);
  if (hourOnlyMatch) {
    const h = parseInt(hourOnlyMatch[1], 10);
    if (!isNaN(h) && h >= 0 && h <= 23) {
      return { hour: h, minute: 0, hasMinute: false, minuteStr: '00' };
    }
  }

  return { hour: 7, minute: 0, hasMinute: false, minuteStr: '00' };
}

/**
 * Parses time schedule and dose text from records like in nurse notebooks.
 * Preserves exact order time with minutes (e.g. "07:05" -> "7:05 - 15:05 - 23:05", "07:15" -> "7:15").
 * Formats Vinsalmol/PKD as "1 x 2", "1 x 3", "1/2 x 2", etc.
 * Formats Insulin as "S: [liều] UI, C: [liều] UI" or "S: [liều] UI".
 */
export function formatDoseAndTimeSchedule(record: ProcessedInjectionRecord): {
  doseText: string;
  timeSchedule: string;
  timeSlots: string[];
  notesShort?: string;
  frequency: number;
} {
  const qty = Number(record.quantity) || 1;
  const rawNotes = record.notes || '';
  const rawTime = record.orderTime || '';
  const drugNameLower = (record.drugFullName || record.originalDrugName || '').toLowerCase();
  const routeLower = (record.route || '').toLowerCase();
  const isPediatric = !!record.isPediatric || (typeof record.age === 'string' && record.age.toLowerCase().includes('th'));

  // 1. Detect if this is an Insulin prescription
  const isInsulin =
    drugNameLower.includes('insulin') ||
    drugNameLower.includes('mixtard') ||
    drugNameLower.includes('scilin') ||
    drugNameLower.includes('novorapid') ||
    drugNameLower.includes('humalog') ||
    drugNameLower.includes('lantus') ||
    drugNameLower.includes('actrapid') ||
    drugNameLower.includes('humulin') ||
    drugNameLower.includes('insulatard') ||
    drugNameLower.includes('levemir') ||
    drugNameLower.includes('toujeo') ||
    drugNameLower.includes('tresiba') ||
    drugNameLower.includes('apidra') ||
    drugNameLower.includes('ryzodeg') ||
    drugNameLower.includes('suliqua') ||
    drugNameLower.includes('wosulin') ||
    drugNameLower.includes('gansulin') ||
    routeLower.includes('tdd') ||
    routeLower.includes('dưới da') ||
    (record.categoryType || '').toLowerCase().includes('insulin');

  // 2. Determine Start Hour and Minute from orderTime
  const { hour: startHour, minute: startMinute, hasMinute, minuteStr } = parseStartHourAndMinute(rawTime);

  let doseText = '1';
  let frequency = 1;
  let timeSchedule = '';
  let timeSlots: string[] = [];

  if (isInsulin) {
    // ---------------- INSULIN HANDLING: S: liều tiêm (UI), C: liều tiêm (UI) ----------------
    const textForInsulin = `${rawNotes} ${record.drugFullName || ''} ${record.originalDrugName || ''}`;

    let mornUI: number | null = null;
    let eveUI: number | null = null;

    // Pattern 1: Explicit Sáng & Chiều / Tối: e.g. "SÁNG 20UI, CHIỀU 20UI", "Sáng: 14đv, Chiều: 10đv", "S 12 - C 10", "S:12, C:10"
    const scMatch = textForInsulin.match(/(?:sáng|s)\s*[:\s]*(\d{1,3})\s*(?:ui|đv|dv|đơn vị)?.*?(?:chiều|tối|c|t)\s*[:\s]*(\d{1,3})\s*(?:ui|đv|dv|đơn vị)?/i);
    if (scMatch) {
      mornUI = parseInt(scMatch[1], 10);
      eveUI = parseInt(scMatch[2], 10);
    } else {
      // Pattern 2: "12 UI (S) - 10 UI (C)" or "12 UI Sáng, 10 UI Chiều"
      const scMatch2 = textForInsulin.match(/(\d{1,3})\s*(?:ui|đv)?\s*\(?(?:sáng|s)\)?.*?[,;/-]\s*(\d{1,3})\s*(?:ui|đv)?\s*\(?(?:chiều|tối|c|t)\)?/i);
      if (scMatch2) {
        mornUI = parseInt(scMatch2[1], 10);
        eveUI = parseInt(scMatch2[2], 10);
      } else {
        // Pattern 3: "12 - 0 - 10" or "12 - 10 UI"
        const dashMatch = textForInsulin.match(/(\d{1,3})\s*-\s*0\s*-\s*(\d{1,3})\s*(?:ui|đv)?/i) ||
                          textForInsulin.match(/(\d{1,3})\s*-\s*(\d{1,3})\s*(?:ui|đv)/i);
        if (dashMatch) {
          mornUI = parseInt(dashMatch[1], 10);
          eveUI = parseInt(dashMatch[2], 10);
        } else {
          // Pattern 4: Explicit Morning only: "Sáng 10 UI", "S: 10 UI"
          const mornOnly = textForInsulin.match(/(?:sáng|s)\s*[:\s]*(\d{1,3})\s*(?:ui|đv|dv|đơn vị)/i) ||
                           textForInsulin.match(/(?:sáng|s)\s*[:\s]*(\d{1,3})\b/i);
          // Pattern 5: Explicit Afternoon/Evening only: "Chiều 10 UI", "C: 10 UI", "Tối 10 UI"
          const eveOnly = textForInsulin.match(/(?:chiều|tối|c|t)\s*[:\s]*(\d{1,3})\s*(?:ui|đv|dv|đơn vị)/i) ||
                          textForInsulin.match(/(?:chiều|tối|c|t)\s*[:\s]*(\d{1,3})\b/i);

          if (mornOnly && !eveOnly) {
            mornUI = parseInt(mornOnly[1], 10);
          } else if (eveOnly && !mornOnly) {
            eveUI = parseInt(eveOnly[1], 10);
          } else {
            // Pattern 6: General UI match
            const generalUIMatch = textForInsulin.match(/(\d{1,3})\s*(?:ui|đv|dv|đơn vị)/i) ||
                                  (record.drugFullName || '').match(/(\d{1,3})\s*(?:ui|đv)/i);
            if (generalUIMatch) {
              const uiVal = parseInt(generalUIMatch[1], 10);
              const hasTwoSessions = textForInsulin.includes('x 2') ||
                                     textForInsulin.includes('2 cữ') ||
                                     textForInsulin.includes('2 lần') ||
                                     qty === 2 ||
                                     textForInsulin.includes('sáng - chiều') ||
                                     textForInsulin.includes('sang - chieu');
              if (hasTwoSessions) {
                mornUI = uiVal;
                eveUI = uiVal;
              } else if (startHour < 12) {
                mornUI = uiVal;
              } else {
                eveUI = uiVal;
              }
            }
          }
        }
      }
    }

    if (mornUI !== null && eveUI !== null) {
      doseText = `S: ${mornUI} UI, C: ${eveUI} UI`;
      frequency = 2;
      timeSlots = hasMinute ? [`${startHour}:${minuteStr}`, `${(startHour + 10) % 24}:${minuteStr}`] : ['7', '17'];
      timeSchedule = timeSlots.join(' - ');
    } else if (mornUI !== null) {
      doseText = `S: ${mornUI} UI`;
      frequency = 1;
      timeSlots = hasMinute ? [`${startHour}:${minuteStr}`] : [`${startHour || 7}`];
      timeSchedule = timeSlots[0];
    } else if (eveUI !== null) {
      doseText = `C: ${eveUI} UI`;
      frequency = 1;
      timeSlots = hasMinute ? [`${startHour}:${minuteStr}`] : [`${startHour || 17}`];
      timeSchedule = timeSlots[0];
    } else {
      doseText = 'S: 10 UI';
      frequency = 1;
      timeSlots = ['7'];
      timeSchedule = '7';
    }
  } else {
    // ---------------- STANDARD INJECTIONS & AEROSOLS (ANTIBIOTICS, VINSALMOL, ZENSONID, ETC.) ----------------
    const isVinsalmolOrPKD =
      drugNameLower.includes('vinsalmol') ||
      drugNameLower.includes('vinsamol') ||
      drugNameLower.includes('zensonid') ||
      drugNameLower.includes('zensonide') ||
      drugNameLower.includes('pulmicort') ||
      drugNameLower.includes('berodual') ||
      drugNameLower.includes('combivent') ||
      drugNameLower.includes('ventolin') ||
      drugNameLower.includes('salbutamol') ||
      drugNameLower.includes('budesonid') ||
      routeLower.includes('pkd') ||
      routeLower.includes('khí dung');

    // 1. Determine single dose (e.g. "1", "2/3", "1/2", "1/3", "1/4")
    // CRITICAL: Must NEVER mistake dates (e.g. 02/03, 2/3, 2/3/2026, ngày 2/3) or treatment sheet numbers for fractional doses!
    let singleDose = '1';

    if (Math.abs(qty - 0.67) < 0.05 || Math.abs(qty - 0.66) < 0.05) {
      singleDose = '2/3';
    } else if (Math.abs(qty - 0.5) < 0.05) {
      singleDose = '1/2';
    } else if (Math.abs(qty - 0.33) < 0.05) {
      singleDose = '1/3';
    } else if (Math.abs(qty - 0.25) < 0.05) {
      singleDose = '1/4';
    } else if (Math.abs(qty - 0.75) < 0.05) {
      singleDose = '3/4';
    } else if (Math.abs(qty - 0.2) < 0.05) {
      singleDose = '1/5';
    } else {
      // Clean notes from all dates, treatment sheets, and order timestamps before inspecting for fractional dosage
      const notesCleanForDose = rawNotes
        .replace(/\b(?:ngày|ngay|ng|d)\s*\d{1,2}\s*[\/\-]\s*\d{1,2}(?:\s*[\/\-]\s*\d{2,4})?\b/gi, '')
        .replace(/\b\d{1,2}\s*[\/\-]\s*\d{1,2}\s*[\/\-]\s*\d{2,4}\b/g, '')
        .replace(/\b\d{1,2}\/\d{1,2}\b/g, '') // remove standalone DD/MM dates like 2/3 or 02/03
        .replace(/\b(?:tờ|to|bệnh án|ba|sheet)\s*\d+\s*[\/\-]\s*\d+\b/gi, '')
        .replace(/\b(?:lần|lan)\s*\d+\s*[\/\-]\s*\d+\b/gi, '');

      // Check strictly for explicit fraction dosage with medication unit or action verb
      // e.g. "tiêm 2/3 lọ", "dùng 1/2 lọ", "lấy 2/3 lọ", "phun 2/3", "1/2 ống"
      const explicitFracMatch =
        notesCleanForDose.match(/(?:tiêm|dùng|uống|phun|lấy)\s+([1-4])\s*\/\s*([2-5])\b/i) ||
        notesCleanForDose.match(/\b([1-4])\s*\/\s*([2-5])\s*(?:lọ|ống|tép|chai|viên|gói|liều)\b/i);

      if (explicitFracMatch) {
        singleDose = `${explicitFracMatch[1]}/${explicitFracMatch[2]}`;
      } else {
        singleDose = '1';
      }
    }

    // 2. Determine frequency (number of times per day: 1 cữ, 2 cữ, 3 cữ, 4 cữ)
    frequency = 1;

    if (record.timeSlots && record.timeSlots.length > 0) {
      frequency = record.timeSlots.length;
    } else {
      const cleanNotesForFreq = rawNotes.replace(/nước cất[^,;]*\d+\s*ống/gi, '');
      const freqExplicitMatch = cleanNotesForFreq.match(/(?:x\s*([1-4])\b)|(?:([1-4])\s*(?:lần\/ngày|l\/ngày|l\/ng|lần|cữ|cử)\b)|(?:ngày\s*([1-4])\s*(?:lần|cữ))/i);

      if (freqExplicitMatch) {
        const parsedFreq = parseInt(freqExplicitMatch[1] || freqExplicitMatch[2] || freqExplicitMatch[3], 10);
        if (!isNaN(parsedFreq) && parsedFreq >= 1 && parsedFreq <= 4) {
          frequency = parsedFreq;
        }
      } else if (
        cleanNotesForFreq.includes('cách 8 giờ') || cleanNotesForFreq.includes('cách 8h') || cleanNotesForFreq.includes('cách 8 g') ||
        cleanNotesForFreq.includes('7-15-23') || cleanNotesForFreq.includes('7h-15h-23h') || cleanNotesForFreq.includes('8-16-24') || cleanNotesForFreq.includes('8h-16h-24h') ||
        cleanNotesForFreq.includes('7:05-15:05-23:05') || cleanNotesForFreq.includes('7h05-15h05-23h05') ||
        cleanNotesForFreq.includes('7-13-19') || cleanNotesForFreq.includes('7h-13h-19h') || cleanNotesForFreq.includes('8-14-20') || cleanNotesForFreq.includes('8h-14h-20h')
      ) {
        frequency = 3;
      } else if (
        cleanNotesForFreq.includes('cách 12 giờ') || cleanNotesForFreq.includes('cách 12h') || cleanNotesForFreq.includes('cách 12 g') ||
        cleanNotesForFreq.includes('7-19') || cleanNotesForFreq.includes('7h-19h') || cleanNotesForFreq.includes('9-21') || cleanNotesForFreq.includes('9h-21h') ||
        cleanNotesForFreq.includes('8-20') || cleanNotesForFreq.includes('8h-20h') || cleanNotesForFreq.includes('sáng - chiều') || cleanNotesForFreq.includes('sang - chieu') ||
        cleanNotesForFreq.includes('sáng, chiều') || cleanNotesForFreq.includes('sang, chieu')
      ) {
        frequency = 2;
      } else if (cleanNotesForFreq.includes('cách 6 giờ') || cleanNotesForFreq.includes('cách 6h') || cleanNotesForFreq.includes('6-12-18-24')) {
        frequency = 4;
      } else if (qty === 3) {
        frequency = 3;
      } else if (qty === 4) {
        frequency = 4;
      } else if (qty === 2) {
        frequency = 2;
      } else if (
        // Broad-spectrum IV antibiotics standard hospital regimen: 3 times/day (cách 8h: 7 - 15 - 23)
        // Only if multiple doses indicated or quantity >= 3 or not explicitly 1
        (drugNameLower.includes('ceftazidim') ||
         drugNameLower.includes('catachit') ||
         drugNameLower.includes('meropenem') ||
         drugNameLower.includes('imipenem') ||
         drugNameLower.includes('tienam') ||
         drugNameLower.includes('ampicillin') ||
         drugNameLower.includes('unasyn') ||
         drugNameLower.includes('amoxicillin/clavulanic') ||
         drugNameLower.includes('klamentin') ||
         drugNameLower.includes('metronidazol')) &&
        (qty >= 3 || rawNotes.includes('3') || !qty || qty === 0)
      ) {
        frequency = 3;
      } else if (
        ((drugNameLower.includes('cefotaxim') ||
          drugNameLower.includes('cefoperazon') ||
          drugNameLower.includes('ciprofloxacin') ||
          drugNameLower.includes('levofloxacin')) && qty >= 2)
      ) {
        frequency = 2;
      } else {
        // Default frequency: strictly 1 time if quantity is 1 and no explicit notes say otherwise
        frequency = 1;
      }
    }

    // Format doseText (e.g. "1 x 3", "2/3 x 3", "1/2 x 2", "1 x 2", "1", "1/2")
    if (record.timeSlots && record.timeSlots.length > 0) {
      frequency = record.timeSlots.length;
    }
    doseText = frequency > 1 ? `${singleDose} x ${frequency}` : singleDose;

    // 3. Calculate Time Slots & Schedule String
    if (record.timeSlots && record.timeSlots.length > 0) {
      timeSlots = record.timeSlots;
      timeSchedule = timeSlots.join(' - ');
    } else {
      const explicitHourMatch = rawNotes.match(/(\d{1,2}(?:[:h]\d{2})?)(?:\s*[-–,;/]\s*(\d{1,2}(?:[:h]\d{2})?))(?:\s*[-–,;/]\s*(\d{1,2}(?:[:h]\d{2})?))?(?:\s*[-–,;/]\s*(\d{1,2}(?:[:h]\d{2})?))?/i);

      if (explicitHourMatch && explicitHourMatch[1] && explicitHourMatch[2]) {
        const rawParsed = [explicitHourMatch[1], explicitHourMatch[2], explicitHourMatch[3], explicitHourMatch[4]]
          .filter(Boolean)
          .map((s) => s.replace('h', ':'));

        timeSlots = rawParsed;
        timeSchedule = timeSlots.join(' - ');
      } else if (frequency === 3) {
        if (isVinsalmolOrPKD) {
          // Aerosols (PKD) daytime schedule: 07:00 - 13:00 - 19:00 (cách 6 tiếng ban ngày)
          if (hasMinute) {
            timeSlots = [`${startHour}:${minuteStr}`, `${(startHour + 6) % 24}:${minuteStr}`, `${(startHour + 12) % 24}:${minuteStr}`];
          } else {
            timeSlots = startHour === 8 ? ['8', '14', '20'] : ['7', '13', '19'];
          }
        } else {
          // IV Injections schedule: 07:00 - 15:00 - 23:00 (cách 8 tiếng)
          if (hasMinute) {
            const h1 = startHour;
            const h2 = (startHour + 8) % 24;
            const h3 = (startHour + 16) % 24;
            const sortedHours = [h1, h2, h3].sort((a, b) => a - b);
            timeSlots = sortedHours.map((h) => `${h}:${minuteStr}`);
          } else {
            if (startHour === 8 || startHour === 16) {
              timeSlots = ['8', '16', '24'];
            } else {
              timeSlots = ['7', '15', '23'];
            }
          }
        }
        timeSchedule = timeSlots.join(' - ');
      } else if (frequency === 2) {
        if (hasMinute) {
          const h1 = startHour;
          const h2 = (startHour + 12) % 24;
          const lower = Math.min(h1, h2);
          const higher = Math.max(h1, h2);
          timeSlots = [`${lower}:${minuteStr}`, `${higher}:${minuteStr}`];
        } else {
          if (startHour === 9 || startHour === 21 || rawNotes.includes('9h') || rawNotes.includes('21h') || rawTime.startsWith('09') || rawTime.startsWith('21')) {
            timeSlots = ['9', '21'];
          } else if (startHour === 8 || startHour === 20 || rawNotes.includes('8h') || rawNotes.includes('20h')) {
            timeSlots = ['8', '20'];
          } else {
            timeSlots = ['7', '19'];
          }
        }
        timeSchedule = timeSlots.join(' - ');
      } else if (frequency === 4) {
        if (hasMinute) {
          const h1 = startHour;
          const h2 = (startHour + 6) % 24;
          const h3 = (startHour + 12) % 24;
          const h4 = (startHour + 18) % 24;
          const sortedHours = [h1, h2, h3, h4].sort((a, b) => a - b);
          timeSlots = sortedHours.map((h) => `${h}:${minuteStr}`);
        } else {
          timeSlots = ['7', '13', '19', '1'];
        }
        timeSchedule = timeSlots.join(' - ');
      } else {
        if (hasMinute) {
          timeSlots = [`${startHour}:${minuteStr}`];
          timeSchedule = `${startHour}:${minuteStr}`;
        } else {
          timeSlots = [`${startHour}`];
          timeSchedule = `${startHour}`;
        }
      }
    }
  }

  // 4. Extract special notes like "+ có Zensonid", "Pha 5ml NaCl", "TMC chậm"
  let notesShort: string | undefined = undefined;
  if (rawNotes) {
    if (drugNameLower.includes('vinsalmol') && (rawNotes.toLowerCase().includes('zensonid') || rawNotes.toLowerCase().includes('budesonid'))) {
      notesShort = '+ có Zensonid';
    } else if (drugNameLower.includes('zensonid') && rawNotes.toLowerCase().includes('vinsalmol')) {
      notesShort = '+ pha Vinsalmol';
    } else if (!isInsulin) {
      const cleanNote = rawNotes
        .replace(/(tiêm|truyền|tmc|tiêm bắp|tiêm tm|khí dung|tiêm dưới da)/gi, '')
        .replace(/x\s*\d+\s*(lần|cữ)?/gi, '')
        .replace(/\d{1,2}(?:[:h]\d{2})?\s*[-–,;]\s*\d{1,2}(?:[:h]\d{2})?/gi, '')
        .replace(/^[,\s;:-]+|[,\s;:-]+$/g, '')
        .trim();

      if (cleanNote.length > 0 && !cleanNote.toLowerCase().includes('nước cất pha tiêm')) {
        notesShort = cleanNote;
      }
    }
  }

  return {
    doseText,
    timeSchedule,
    timeSlots,
    notesShort,
    frequency,
  };
}

/**
 * Normalizes drug name to group into clean column headers.
 * e.g. "Catachit 1g", "Ceftazidim 1g", "Cefotaxim 1g", "Hydrocortison 100mg", "Vinsalmol 5.0", "Zentamil 0.5g", "Omevin 40mg", "Humalog Mix", "Insulin"
 */
export function normalizeDrugColumnHeader(drugFullName: string, route: string): {
  id: string;
  shortName: string;
  routeLabel: string;
  fullTitle: string;
} {
  let name = drugFullName.trim();
  let routeLabel = (route || 'TMC').toUpperCase().trim();
  const nameLower = name.toLowerCase();

  const isAerosolDrug =
    nameLower.includes('vinsalmol') ||
    nameLower.includes('salbutamol') ||
    nameLower.includes('zensonid') ||
    nameLower.includes('budesonid') ||
    nameLower.includes('pulmicort') ||
    nameLower.includes('berodual') ||
    nameLower.includes('combivent') ||
    nameLower.includes('ventolin') ||
    routeLabel.includes('KHÍ DUNG') ||
    routeLabel.includes('PKD') ||
    nameLower.includes('khí dung');

  const isInsulinDrug =
    nameLower.includes('insulin') ||
    nameLower.includes('humalog') ||
    nameLower.includes('mixtard') ||
    nameLower.includes('scilin') ||
    nameLower.includes('novorapid') ||
    nameLower.includes('lantus') ||
    nameLower.includes('actrapid') ||
    nameLower.includes('humulin') ||
    nameLower.includes('insulatard') ||
    nameLower.includes('levemir') ||
    nameLower.includes('toujeo') ||
    nameLower.includes('tresiba') ||
    nameLower.includes('apidra') ||
    nameLower.includes('ryzodeg');

  // Standardize common route names to short forms like in nurse notebook
  if (isAerosolDrug) {
    routeLabel = 'PKD';
  } else if (routeLabel.includes('TĨNH MẠCH') || routeLabel.includes('TM') || routeLabel.includes('TMC') || routeLabel.includes('IV')) {
    routeLabel = 'TMC';
  } else if (routeLabel.includes('BẮP') || routeLabel.includes('IM')) {
    routeLabel = 'IM';
  } else if (routeLabel.includes('DƯỚI DA') || routeLabel.includes('SC') || routeLabel.includes('TDD') || isInsulinDrug) {
    routeLabel = 'TDD';
  } else {
    routeLabel = 'TMC';
  }

  // Extract clean short name (e.g. "Catachit 1g", "Ceftazidim 1g", "Cefotaxim 1g", "Hydrocortison 100mg", "Zentamil 0.5g", "Vinsalmol 5.0")
  let shortName = name
    .replace(/\s*\(.*?\)/g, '') // remove brackets
    .replace(/(tiêm|truyền tĩnh mạch|lọ|ống|chai|bút tiêm)/gi, '')
    .trim();

  // Shorten common lengthy drug brands
  if (nameLower.includes('esogas') || nameLower.includes('esomeprazol')) {
    shortName = 'Esogas 40mg';
    routeLabel = 'TMC';
  } else if (nameLower.includes('vinsamol') || nameLower.includes('vinsalmol')) {
    shortName = 'Vinsamol 5.0';
    routeLabel = 'PKD';
  } else if (nameLower.includes('zensonide') || nameLower.includes('zensonid') || nameLower.includes('budesonid')) {
    shortName = 'Zensonide';
    routeLabel = 'PKD';
  } else if (nameLower.includes('hydrocortison')) {
    shortName = 'Hydrocortison 100mg';
  } else if (nameLower.includes('cefotaxim')) {
    shortName = 'Cefotaxim 1g';
  } else if (nameLower.includes('ceftazidim')) {
    shortName = 'Ceftazidim 1g';
  } else if (nameLower.includes('omevin') || nameLower.includes('omeprazol')) {
    shortName = 'Omevin 40mg';
    routeLabel = 'TMC';
  } else if (nameLower.includes('zentamil') || nameLower.includes('gentamicin')) {
    shortName = 'Zentamil 0.5g';
  } else if (nameLower.includes('catachit')) {
    shortName = 'Catachit 1g';
  } else if (nameLower.includes('acetyl leucin') || nameLower.includes('aleucin')) {
    shortName = 'Acetyl leucin 500mg';
    routeLabel = 'TMC';
  } else if (nameLower.includes('medivernol') || nameLower.includes('ceftriaxon')) {
    shortName = 'Medivernol 1g';
  } else if (nameLower.includes('humalog')) {
    shortName = 'Humalog Mix';
  } else if (nameLower.includes('mixtard')) {
    shortName = 'Mixtard 30';
  } else if (nameLower.includes('scilin')) {
    shortName = 'Scilin M30';
  } else if (nameLower.includes('novorapid')) {
    shortName = 'Novorapid';
  } else if (nameLower.includes('lantus')) {
    shortName = 'Lantus';
  } else if (isInsulinDrug) {
    shortName = 'Insulin';
  }

  const id = `${shortName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${routeLabel.toLowerCase()}`;
  const fullTitle = `${shortName}\n${routeLabel}`;

  return {
    id,
    shortName,
    routeLabel,
    fullTitle,
  };
}

/**
 * Builds the comprehensive Matrix Sheet Data from processed injection records.
 * Ensures:
 * 1. Each patient has exactly ONE unified row containing ALL their medications (tiêm TMC/IM/TDD & phun khí dung PKD).
 * 2. Splits and groups patients smartly into 2 clinical zones:
 *    - Zone 1: Khu Nội - Nhi (Trừ phòng Lão khoa, Nhi 1, Nhi 2)
 *    - Zone 2: Phòng Lão khoa, Nhi 1, Nhi 2 & Khu Nhiễm
 */
export function buildNurseMatrixData(injections: ProcessedInjectionRecord[] = []): MatrixSheetData {
  const safeInjections = Array.isArray(injections) ? injections : [];
  const columnMap = new Map<string, MatrixDrugColumn>();
  const patientMap = new Map<string, MatrixPatientRow>();
  const roomsSet = new Set<string>();

  // 1. Identify all distinct drug columns
  safeInjections.forEach((item) => {
    const { id, shortName, routeLabel, fullTitle } = normalizeDrugColumnHeader(
      item.drugFullName || item.originalDrugName,
      item.route
    );

    if (!columnMap.has(id)) {
      columnMap.set(id, {
        id,
        drugName: shortName,
        route: routeLabel,
        unit: item.unit,
        strength: item.strength,
        fullTitle,
        totalPrescriptions: 0,
      });
    }

    const col = columnMap.get(id)!;
    col.totalPrescriptions += 1;
  });

  // Sort columns: Injections first (TMC, IM, TDD), then Aerosols (PKD), then other, ordered by drug name
  const columns = Array.from(columnMap.values()).sort((a, b) => {
    const routePriority = (r: string) => {
      if (r === 'TMC') return 1;
      if (r === 'IM') return 2;
      if (r === 'TDD') return 3;
      if (r === 'PKD') return 4;
      return 5;
    };
    const pA = routePriority(a.route);
    const pB = routePriority(b.route);
    if (pA !== pB) return pA - pB;
    return a.drugName.localeCompare(b.drugName, 'vi');
  });

  // 2. Identify and group rows by Patient (ALL medications on the same single row)
  safeInjections.forEach((item) => {
    const rawRoom = item.room || '';
    const roomStr = rawRoom.replace(/^Phòng\s+/i, '').replace(/^Buồng\s+/i, '').trim() || 'Chưa rõ';
    if (roomStr) roomsSet.add(roomStr);

    // Standardized Patient Key so all injection and aerosol records for this patient merge into 1 row
    const normName = item.patientName ? item.patientName.normalize('NFC').trim().toUpperCase() : '';
    const cleanRoomKey = roomStr.toLowerCase().replace(/[^a-z0-9]/g, '');
    const pKey = item.patientCode && item.patientCode.trim().length > 0
      ? item.patientCode.trim().toLowerCase()
      : `${normName}_${cleanRoomKey}`;

    const wardZone = classifyRoomToWardZone(rawRoom, item.area, item.departmentRoomBed);
    const wardZoneName = wardZone === 'ZONE_1_NOI_NHI_STANDARD'
      ? 'Khu Nội - Nhi (Trừ Lão khoa, Nhi 1, 2)'
      : 'Lão khoa, Nhi 1, 2 & Khu Nhiễm';

    if (!patientMap.has(pKey)) {
      let shortRoom = roomStr;
      if (roomStr.toLowerCase().includes('cấp cứu') || roomStr.toLowerCase().includes('hồi sức')) {
        shortRoom = 'HS';
      }

      patientMap.set(pKey, {
        patientKey: pKey,
        patientCode: item.patientCode || '',
        patientName: item.patientName,
        age: item.age || '',
        isPediatric: !!item.isPediatric,
        gender: item.gender || '',
        room: shortRoom,
        rawRoom: rawRoom,
        bed: item.bed || '',
        patientAddress: item.patientAddress,
        wardZone,
        wardZoneName,
        cells: {},
        totalDrugs: 0,
      });
    }

    const pRow = patientMap.get(pKey)!;
    // Keep best metadata
    if (!pRow.bed && item.bed) pRow.bed = item.bed;
    if (!pRow.age && item.age) pRow.age = item.age;
    if (!pRow.patientAddress && item.patientAddress) pRow.patientAddress = item.patientAddress;

    const { id, shortName, routeLabel } = normalizeDrugColumnHeader(
      item.drugFullName || item.originalDrugName,
      item.route
    );

    const { doseText, timeSchedule, timeSlots, notesShort } = formatDoseAndTimeSchedule(item);

    const executedSlots = item.timeSlotsExecuted && item.timeSlotsExecuted.length === timeSlots.length
      ? item.timeSlotsExecuted
      : timeSlots.map(() => !!item.isExecuted);

    const isAllExecuted = executedSlots.length > 0 ? executedSlots.every(Boolean) : !!item.isExecuted;

    const existingCell = pRow.cells[id];
    if (existingCell) {
      const isInsulinCell =
        existingCell.doseText.includes('UI') ||
        existingCell.doseText.includes('S:') ||
        existingCell.doseText.includes('C:') ||
        doseText.includes('UI') ||
        doseText.includes('S:') ||
        doseText.includes('C:');

      if (isInsulinCell) {
        // Merge Insulin Morning and Evening UI
        const existMorn = existingCell.doseText.match(/S:\s*(\d+)/i)?.[1];
        const existEve = existingCell.doseText.match(/C:\s*(\d+)/i)?.[1];
        const newMorn = doseText.match(/S:\s*(\d+)/i)?.[1];
        const newEve = doseText.match(/C:\s*(\d+)/i)?.[1];

        const finalMorn = newMorn || existMorn;
        const finalEve = newEve || existEve;

        let mergedDoseText = '';
        if (finalMorn && finalEve) {
          mergedDoseText = `S: ${finalMorn} UI, C: ${finalEve} UI`;
        } else if (finalMorn) {
          mergedDoseText = `S: ${finalMorn} UI`;
        } else if (finalEve) {
          mergedDoseText = `C: ${finalEve} UI`;
        } else {
          mergedDoseText = existingCell.doseText;
        }

        const mergedSlots = mergeAndNormalizeTimeSlots(existingCell.timeSlots, timeSlots, 2);
        const mergedSlotsExecuted = mergedSlots.map((slot) => {
          const existIdx = existingCell.timeSlots.indexOf(slot);
          if (existIdx >= 0) return !!existingCell.timeSlotsExecuted[existIdx];
          const newIdx = timeSlots.indexOf(slot);
          if (newIdx >= 0) return !!executedSlots[newIdx];
          return false;
        });

        pRow.cells[id] = {
          ...existingCell,
          doseText: mergedDoseText,
          timeSchedule: mergedSlots.join(' - '),
          timeSlots: mergedSlots,
          timeSlotsExecuted: mergedSlotsExecuted,
          isExecuted: mergedSlotsExecuted.length > 0 ? mergedSlotsExecuted.every(Boolean) : false,
          notes: existingCell.notes || notesShort,
        };
      } else {
        // Determine max allowed frequency for this drug type
        const drugLower = (item.drugFullName || item.originalDrugName || '').toLowerCase();
        const is3DoseAntibiotic =
          drugLower.includes('ceftazidim') ||
          drugLower.includes('catachit') ||
          drugLower.includes('meropenem') ||
          drugLower.includes('tienam') ||
          drugLower.includes('ampicillin') ||
          drugLower.includes('unasyn') ||
          drugLower.includes('klamentin') ||
          drugLower.includes('metronidazol');

        const isAerosol =
          drugLower.includes('vinsalmol') ||
          drugLower.includes('vinsamol') ||
          drugLower.includes('zensonid') ||
          drugLower.includes('zensonide') ||
          drugLower.includes('pulmicort') ||
          drugLower.includes('salbutamol') ||
          drugLower.includes('budesonid') ||
          (item.route || '').toLowerCase().includes('pkd');

        const currentOrderCount = (existingCell.orderCount || 1) + 1;
        const totalQty = (Number(existingCell.quantity) || 1) + (Number(item.quantity) || 1);
        const maxAllowed = isAerosol ? 6 : (is3DoseAntibiotic ? 3 : 4);

        // Merge and cluster time slots by shift window
        let mergedSlots = mergeAndNormalizeTimeSlots(existingCell.timeSlots, timeSlots, maxAllowed);

        // If multiple distinct order rows were present in Excel (e.g. 3 records or totalQty >= 3),
        // we must NEVER collapse them down to 2 or 1!
        const targetFreq = Math.max(mergedSlots.length, currentOrderCount, Math.floor(totalQty));

        if (targetFreq > mergedSlots.length) {
          if (targetFreq === 3) {
            mergedSlots = isAerosol ? ['7', '13', '19'] : ['7', '15', '23'];
          } else if (targetFreq === 2) {
            mergedSlots = ['7', '19'];
          } else if (targetFreq === 4) {
            mergedSlots = ['7', '13', '19', '1'];
          }
        }

        const totalFreq = Math.max(mergedSlots.length, targetFreq);

        // Determine base single dose (e.g. "1", "2/3", "1/2")
        const baseDose = existingCell.doseText.split(' x ')[0] || '1';
        const mergedDoseText = totalFreq > 1 ? `${baseDose} x ${totalFreq}` : baseDose;

        const mergedSlotsExecuted = mergedSlots.map((slot) => {
          const existIdx = existingCell.timeSlots.indexOf(slot);
          if (existIdx >= 0) return !!existingCell.timeSlotsExecuted[existIdx];
          const newIdx = timeSlots.indexOf(slot);
          if (newIdx >= 0) return !!executedSlots[newIdx];
          return false;
        });

        const mergedIsExecuted = mergedSlotsExecuted.length > 0 ? mergedSlotsExecuted.every(Boolean) : false;

        const combinedVerbatim = [
          existingCell.detailVerbatim,
          item.notes || item.drugFullName
        ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' | ');

        pRow.cells[id] = {
          ...existingCell,
          doseText: mergedDoseText,
          timeSchedule: mergedSlots.join(' - '),
          timeSlots: mergedSlots,
          timeSlotsExecuted: mergedSlotsExecuted,
          isExecuted: mergedIsExecuted,
          quantity: totalQty,
          orderCount: currentOrderCount,
          notes: existingCell.notes || notesShort,
          detailVerbatim: combinedVerbatim || existingCell.detailVerbatim || item.notes || item.drugFullName,
        };
      }
    } else {
      // Create Cell Data on the patient's single row
      pRow.cells[id] = {
        recordId: item.id,
        drugFullName: item.drugFullName,
        shortName,
        doseText,
        timeSchedule,
        timeSlots,
        timeSlotsExecuted: executedSlots,
        isExecuted: isAllExecuted,
        notes: notesShort || (item.changeStatus === 'NEW' ? '+ Mới' : undefined),
        detailVerbatim: item.notes || item.drugFullName,
        changeStatus: item.changeStatus,
        route: routeLabel,
        unit: item.unit,
        quantity: item.quantity,
        orderCount: 1,
        rawRecord: item,
      };
    }

    pRow.totalDrugs = Object.keys(pRow.cells).length;
  });

  // Post-process Rule 2: Cross-link Vinsamol and Zensonide for patients who use both
  patientMap.forEach((pRow) => {
    const vinsamolKey = Object.keys(pRow.cells).find((k) => {
      const s = pRow.cells[k].shortName.toLowerCase();
      return s.includes('vinsamol') || s.includes('vinsalmol');
    });
    const zensonideKey = Object.keys(pRow.cells).find((k) => {
      const s = pRow.cells[k].shortName.toLowerCase();
      return s.includes('zensonid') || s.includes('zensonide');
    });

    if (vinsamolKey && zensonideKey) {
      const vCell = pRow.cells[vinsamolKey];
      const zCell = pRow.cells[zensonideKey];
      const zCount = zCell.timeSlots.length;
      const zSchedule = zCell.timeSchedule;
      vCell.notes = `+ có Zensonide ${zCount} lần (${zSchedule})`;
    }
  });

  // Sort patient rows by Zone, then Room, then Patient Name
  const allRows = Array.from(patientMap.values()).sort((a, b) => {
    if (a.wardZone !== b.wardZone) {
      return a.wardZone === 'ZONE_1_NOI_NHI_STANDARD' ? -1 : 1;
    }
    const roomCompare = a.room.localeCompare(b.room, 'vi', { numeric: true });
    if (roomCompare !== 0) return roomCompare;
    return a.patientName.localeCompare(b.patientName, 'vi');
  });

  const zone1Rows = allRows.filter((r) => r.wardZone === 'ZONE_1_NOI_NHI_STANDARD');
  const zone2Rows = allRows.filter((r) => r.wardZone === 'ZONE_2_LAO_KHOA_NHI_NHIEM');

  // Columns per zone
  const zone1ColIds = new Set<string>();
  zone1Rows.forEach((r) => Object.keys(r.cells).forEach((cid) => zone1ColIds.add(cid)));
  const zone1Columns = columns.filter((c) => zone1ColIds.has(c.id));

  const zone2ColIds = new Set<string>();
  zone2Rows.forEach((r) => Object.keys(r.cells).forEach((cid) => zone2ColIds.add(cid)));
  const zone2Columns = columns.filter((c) => zone2ColIds.has(c.id));

  const allRooms = Array.from(roomsSet).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));

  return {
    columns,
    rows: allRows,
    zone1Rows,
    zone2Rows,
    zone1Columns,
    zone2Columns,
    allRooms,
    totalPatients: allRows.length,
    totalDrugs: columns.length,
    totalInjections: safeInjections.length,
  };
}

