export function getVietQrBankId(bankName: string): string {
  if (!bankName) return 'MB';
  
  const clean = bankName.trim();
  
  // 1. Try to extract content inside parentheses, e.g. "Ngân hàng Ngoại Thương Việt Nam (Vietcombank)" -> "Vietcombank"
  const parenthesesMatch = clean.match(/\(([^)]+)\)/);
  let potentialCode = parenthesesMatch ? parenthesesMatch[1] : clean;
  
  potentialCode = potentialCode.trim();
  
  // Normalize candidate
  const candidate = potentialCode.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove Vietnamese diacritics
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, '');     // remove spaces, punctuation
    
  // Check common codes directly
  if (candidate === 'vietcombank' || candidate === 'vcb') return 'VCB';
  if (candidate === 'techcombank' || candidate === 'tcb') return 'TCB';
  if (candidate === 'vietinbank' || candidate === 'ctg' || candidate === 'icb') return 'ICB';
  if (candidate === 'bidv' || candidate === 'bid') return 'BIDV';
  if (candidate === 'agribank' || candidate === 'vba') return 'AGRIBANK';
  if (candidate === 'mbbank' || candidate === 'mb') return 'MB';
  if (candidate === 'acb') return 'ACB';
  if (candidate === 'vpbank' || candidate === 'vpb') return 'VPB';
  if (candidate === 'tpbank' || candidate === 'tpb') return 'TPB';
  if (candidate === 'sacombank' || candidate === 'stb') return 'STB';
  if (candidate === 'shb') return 'SHB';
  if (candidate === 'vib') return 'VIB';
  if (candidate === 'msb') return 'MSB';
  if (candidate === 'hdbank' || candidate === 'hdb') return 'HDB';
  if (candidate === 'scb') return 'SCB';
  if (candidate === 'ocb') return 'OCB';
  if (candidate === 'seabank' || candidate === 'seab') return 'SEAB';
  if (candidate === 'abbank' || candidate === 'ab') return 'ABB';
  if (candidate === 'lpbank' || candidate === 'lpb' || candidate === 'locphat') return '970449';
  if (candidate === 'bacabank' || candidate === 'bab') return 'BAB';
  if (candidate === 'pvcombank' || candidate === 'pvc') return 'PVCOMBANK';
  if (candidate === 'dongabank' || candidate === 'dab') return 'DAB';
  if (candidate === 'vietbank' || candidate === 'vab') return 'VIETBANK';
  if (candidate === 'vietcapitalbank' || candidate === 'bvb') return 'BVB';
  if (candidate === 'kienlongbank' || candidate === 'klb') return 'KLB';
  if (candidate === 'saigonbank' || candidate === 'sgb') return 'SGB';
  if (candidate === 'pgbank' || candidate === 'pgb') return 'PGB';
  if (candidate === 'baovietbank' || candidate === 'bvb') return 'BVB';

  // Substring checks fallback
  const fullClean = clean.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
    
  if (fullClean.includes('vietcombank') || fullClean.includes('vcb')) return 'VCB';
  if (fullClean.includes('techcombank') || fullClean.includes('tcb')) return 'TCB';
  if (fullClean.includes('vietinbank') || fullClean.includes('ctg') || fullClean.includes('icb')) return 'ICB';
  if (fullClean.includes('bidv')) return 'BIDV';
  if (fullClean.includes('agribank') || fullClean.includes('vba')) return 'AGRIBANK';
  if (fullClean.includes('mbbank') || fullClean.includes('mb')) return 'MB';
  if (fullClean.includes('acb')) return 'ACB';
  if (fullClean.includes('vpbank') || fullClean.includes('vpb')) return 'VPB';
  if (fullClean.includes('tpbank') || fullClean.includes('tpb')) return 'TPB';
  if (fullClean.includes('sacombank') || fullClean.includes('stb')) return 'STB';
  if (fullClean.includes('lpbank') || fullClean.includes('lpb') || fullClean.includes('loc phat') || fullClean.includes('lienviet')) return '970449';
  if (fullClean.includes('shb')) return 'SHB';
  if (fullClean.includes('vib')) return 'VIB';
  if (fullClean.includes('msb')) return 'MSB';
  if (fullClean.includes('hdbank') || fullClean.includes('hdb')) return 'HDB';
  if (fullClean.includes('ocb')) return 'OCB';
  if (fullClean.includes('seabank')) return 'SEAB';
  if (fullClean.includes('abbank')) return 'ABB';
  if (fullClean.includes('dong a')) return 'DAB';
  if (fullClean.includes('vietbank')) return 'VIETBANK';
  if (fullClean.includes('kien long')) return 'KLB';
  
  // Return uppercase alphanumeric inside parentheses as a fallback
  return candidate ? candidate.toUpperCase() : 'MB';
}
