/**
 * Drug and Medical Supply Classifier
 * Filters injection medications, excludes infusions and medical supplies.
 */
import { ItemClassification } from '../types/hospital';

// Known IV fluids & Infusions (Dịch truyền) keywords in Vietnamese hospitals
const INFUSION_KEYWORDS = [
  'nacl', 'natri clorid', 'natri clorua', 'natriclorid', 'sodium chloride',
  'glucose', 'dextrose', 'ringer lactate', 'ringer fundin', 'hartmann',
  'gelafundin', 'lipofundin', 'nutriflex', 'aminoleban', 'alvesin', 'morihepamin',
  'dextran', 'hes 200', 'hes 130', 'voluven', 'tetraspan',
  'natri bicarbonat', 'sodium bicarbonate', 'bicarbonate', 'manitol', 'mannitol',
  'dung dịch điện giải', 'dung dich dien giai', 'dịch truyền', 'dich truyen',
  'nước cất tiêm truyền 500ml', 'nuoc cat truyen 500ml', 'smofkabiven', 'kabiven',
  'combiflex', 'clinoleic', 'intralipid', 'plasbumin', 'albumin 20% 50ml', 'albumin 20% 100ml'
];

// Known Medical Supplies (Vật tư y tế) keywords
const MEDICAL_SUPPLY_KEYWORDS = [
  'bơm tiêm', 'bom tiem', 'kim tiêm', 'kim tiem', 'kim luồn', 'kim luon', 'kim chọc',
  'dây truyền', 'day truyen', 'dây nối', 'day noi', 'dây oxy', 'day oxy', 'dây thở',
  'găng tay', 'gang tay', 'khẩu trang', 'khau trang', 'nón trùm', 'mũ phẫu thuật',
  'gạc', 'gac', 'bông', 'bong y te', 'băng keo', 'bang keo', 'băng cuộn', 'bang cuon',
  'khóa 3 chạc', 'khoa 3 chac', 'ba chạc', 'chạc 3', 'catheter', 'canun', 'canuyn',
  'ống sonde', 'ong sonde', 'sonde', 'túi chứa', 'tui chua', 'túi dẫn lưu', 'tui dan luu',
  'túi đựng nước tiểu', 'tui nuoc tieu', 'dây hút', 'day hut', 'que thử', 'que test',
  'lam kính', 'bình hút', 'mặt nạ thở', 'mat na tho', 'dây máy thở',
  'băng dính', 'băng urgo', 'bộ dây', 'kim bướm', 'kim cánh bướm', 'kim tiêm điện',
  'bơm tiêm điện', 'dây tiêm điện', 'ống nghiệm', 'lọ đựng bệnh phẩm', 'cồn 70',
  'cồn 90', 'betadine 100ml', 'povidine 100ml', 'nước muối rửa', 'oxy', 'oxy y tế',
  'khí oxy', 'bình oxy', 'vật tư', 'vtyt', 'dụng cụ'
];

// Injection & Aerosol route keywords (Đường dùng thuốc tiêm và khí dung)
const INJECTION_ROUTE_KEYWORDS = [
  'tiêm bắp', 'tiem bap', 'im', 'tiêm tm', 'tiem tm', 'tiêm tĩnh mạch', 'tiem tinh mach', 'iv',
  'tiêm dưới da', 'tiem duoi da', 'sc', 'tiêm trong da', 'tiem trong da', 'id',
  'iv push', 'iv bolus', 'iv drip', 'tiêm chậm', 'tiem cham', 'tiêm nhanh', 'tiem nhanh',
  'tiêm khớp', 'tiem khop', 'tiêm nội nhãn', 'tiem noi nhan', 'tiêm màng cứng', 'tiem mang cung',
  'tiêm tủy sống', 'tiem tuy song', 'tiêm xơ', 'tiem xo', 'tiêm', 'tiem', 'tiêm truyền tm',
  'ttm', 'tb', 'tdd', 'ttd', 'tmc', 'tiêm tmc', 'tiem tmc',
  'phun khí dung', 'phun khi dung', 'khí dung', 'khi dung', 'pkd', 'khi dung mask'
];

// Non-injection route keywords (Đường dùng KHÔNG PHẢI tiêm)
const NON_INJECTION_ROUTES = [
  'uống', 'uong', 'po', 'ngậm', 'ngam', 'sl', 'đặt', 'dat', 'pr', 'pv', 'bôi', 'boi',
  'thoa', 'xịt', 'xit', 'hít', 'hit', 'nhỏ mắt', 'nho mat', 'nhỏ tai', 'nho tai',
  'nhỏ mũi', 'nho mui', 'dán', 'dan', 'rửa', 'rua', 'súc miệng', 'suc mieng'
];

// Units typically indicating injections
const INJECTION_UNITS = [
  'ống', 'ong', 'lọ', 'lo', 'bút', 'but', 'bút tiêm', 'but tiem', 'bơm đóng sẵn',
  'amp', 'ampoule', 'vial', 'bột pha tiêm', 'bot pha tiem'
];

/**
 * Clean & normalize string for comparison
 */
export function normalizeKeyword(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Classify a drug record item
 */
export function classifyMedicationItem(params: {
  drugName: string;
  route?: string;
  unit?: string;
  activeIngredient?: string;
  dosageForm?: string;
}): { classification: ItemClassification; reason: string } {
  const { drugName = '', route = '', unit = '', activeIngredient = '', dosageForm = '' } = params;

  const rawCombined = `${drugName} ${activeIngredient} ${dosageForm}`.toLowerCase();
  const normCombined = normalizeKeyword(rawCombined);
  const normRoute = normalizeKeyword(route);
  const normUnit = normalizeKeyword(unit);

  // 1. Check if it's a Medical Supply (Vật tư y tế) -> Priority Exclusion
  for (const sup of MEDICAL_SUPPLY_KEYWORDS) {
    const normSup = normalizeKeyword(sup);
    if (normCombined.includes(normSup) || normUnit.includes(normSup) || normRoute.includes(normSup)) {
      return {
        classification: 'MEDICAL_SUPPLY',
        reason: `Vật tư y tế: chứa từ khóa "${sup}"`,
      };
    }
  }

  // 2. Check if it's an Infusion solution (Dịch truyền) -> Priority Exclusion
  for (const inf of INFUSION_KEYWORDS) {
    const normInf = normalizeKeyword(inf);
    // Check if it's fluid (and not small injection like NaCl 0.9% 5ml solvent)
    if (normCombined.includes(normInf)) {
      // If it contains 5ml, 10ml, ống 5ml or is explicitly solvent for injection powder, it might be water for injection
      const isSmallSolvent = /5\s*ml|10\s*ml|ống\s*5|ong\s*5|ống\s*10|nước cất pha tiêm|nuoc cat pha tiem/.test(normCombined);
      if (!isSmallSolvent) {
        return {
          classification: 'INFUSION',
          reason: `Dịch truyền / Dung dịch thay thế huyết tương: "${inf}"`,
        };
      }
    }
  }

  // 3. Check Route (Đường dùng)
  if (normRoute) {
    // Check non-injection routes first
    const isNonInj = NON_INJECTION_ROUTES.some(r => normRoute === r || normRoute.startsWith(r + ' ') || normRoute.endsWith(' ' + r));
    if (isNonInj) {
      return {
        classification: 'ORAL_OR_OTHER',
        reason: `Đường dùng không phải tiêm: "${route}"`,
      };
    }

    // Check injection routes
    const isInjRoute = INJECTION_ROUTE_KEYWORDS.some(r => {
      if (normRoute === r) return true;
      if (normRoute.includes(r)) return true;
      return false;
    });

    if (isInjRoute) {
      return {
        classification: 'INJECTION',
        reason: `Xác nhận thuốc tiêm theo đường dùng: "${route}"`,
      };
    }
  }

  // 4. Check Dosage Form or Unit
  const normForm = normalizeKeyword(dosageForm);
  if (normForm.includes('tiem') || normForm.includes('tiem truyen') || normForm.includes('pha tiem') || normForm.includes('bơm tiêm đóng sẵn')) {
    return {
      classification: 'INJECTION',
      reason: `Dạng bào chế tiêm: "${dosageForm}"`,
    };
  }

  // 5. Check Unit (Đơn vị tính: Ống, Lọ, Bút tiêm) and Drug Name hints
  const hasInjUnit = INJECTION_UNITS.some(u => normUnit === u || normUnit.includes(u));
  if (hasInjUnit) {
    // If unit is ống/lọ and name does not have oral clues (uống, siro, viên)
    if (!normCombined.includes('vien') && !normCombined.includes('siro') && !normCombined.includes('uong')) {
      return {
        classification: 'INJECTION',
        reason: `Đơn vị tính thuốc tiêm (${unit})`,
      };
    }
  }

  // 6. Check common injection & aerosol drugs in Vietnamese hospitals if route is missing
  const commonInjDrugs = [
    'ceftriaxone', 'ceftriaxon', 'ampicillin', 'amoxicillin/clavulanic', 'cefotaxime', 'cefotaxim',
    'ceftazidime', 'ceftazidim', 'catachit', 'cefoperazone', 'sulperazone', 'meropenem', 'imipenem',
    'tienam', 'vancomycin', 'gentamicin', 'amikacin', 'ciprofloxacin', 'levofloxacin', 'metronidazole',
    'morphin', 'fentanyl', 'pethidin', 'enoxaparin', 'lovenox', 'heparin', 'insulin', 'actrapid',
    'novorapid', 'lantus', 'mixtard', 'furosemide', 'lasix', 'methylprednisolon', 'solu-medrol',
    'hydrocortison', 'dexamethason', 'ondansetron', 'metoclopramid', 'pantoprazol', 'esomeprazol',
    'omeprazol', 'diazepam', 'midazolam', 'propofol', 'adrenalin', 'epinephrine', 'noradrenalin',
    'dopamin', 'dobutamin', 'atropin', 'tranexamic acid', 'transamin', 'vitamin k1', 'acetyl leucin',
    'aleucin', 'calci clorid', 'calci gluconat', 'magnesi sulfat', 'paracetamol truyền', 'perfalgan',
    'vinsalmol', 'zensonid', 'pulmicort', 'berodual', 'ventolin', 'salbutamol', 'combivent', 'budesonide'
  ];

  for (const drug of commonInjDrugs) {
    if (normCombined.includes(normalizeKeyword(drug))) {
      return {
        classification: 'INJECTION',
        reason: `Nhận diện thuốc tiêm phổ biến: "${drug}"`,
      };
    }
  }

  // If no clear evidence
  return {
    classification: 'UNCERTAIN',
    reason: 'Không đủ thông tin xác định là thuốc tiêm (thiếu đường dùng hoặc đơn vị đặc trưng)',
  };
}
