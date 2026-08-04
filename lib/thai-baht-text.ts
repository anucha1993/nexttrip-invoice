// lib/thai-baht-text.ts
// แปลงจำนวนเงิน (ตัวเลข) เป็นคำอ่านภาษาไทย เช่น 1234.50 -> "หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์"

const DIGIT_TH = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const PLACE_TH = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

// แปลงตัวเลขจำนวนเต็ม (ไม่มีจุดทศนิยม) เป็นคำอ่านไทย
function convertInteger(numStr: string): string {
  // ตัดเลข 0 นำหน้าออก
  const digits = numStr.replace(/^0+(?=\d)/, '');
  if (digits === '0' || digits === '') return DIGIT_TH[0];

  const len = digits.length;
  let result = '';

  for (let i = 0; i < len; i++) {
    const digit = Number(digits[i]);
    // ตำแหน่งนับจากขวา (0 = หลักหน่วย)
    const posFromRight = len - i - 1;
    // จัดกลุ่มล้าน (ทุก 6 หลัก): ตำแหน่งภายในกลุ่ม 0-5
    const posInGroup = posFromRight % 6;
    const isMillionBoundary = posFromRight > 0 && posInGroup === 0;

    if (digit !== 0) {
      if (posInGroup === 1 && digit === 1) {
        // หลักสิบ เลข 1 -> "สิบ" (ไม่ใช่ "หนึ่งสิบ")
        result += 'สิบ';
      } else if (posInGroup === 1 && digit === 2) {
        // หลักสิบ เลข 2 -> "ยี่สิบ"
        result += 'ยี่สิบ';
      } else if (posInGroup === 0 && digit === 1 && len > 1 && posFromRight !== len - 1) {
        // หลักหน่วย เลข 1 (ไม่ใช่ตัวเลขตัวเดียวทั้งหมด) -> "เอ็ด"
        result += 'เอ็ด';
      } else {
        result += DIGIT_TH[digit] + PLACE_TH[posInGroup];
      }
    }

    if (isMillionBoundary) {
      result += 'ล้าน';
    }
  }

  return result;
}

/** แปลงจำนวนเงิน (บาท) เป็นคำอ่านภาษาไทย เช่น 1234.5 -> "หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์" */
export function bahtText(amount: number): string {
  if (!isFinite(amount)) return '-';

  const negative = amount < 0;
  const rounded = Math.round(Math.abs(amount) * 100) / 100;
  const baht = Math.floor(rounded);
  const satang = Math.round((rounded - baht) * 100);

  const bahtWords = convertInteger(String(baht));
  let text = `${bahtWords}บาท`;

  if (satang > 0) {
    text += `${convertInteger(String(satang))}สตางค์`;
  } else {
    text += 'ถ้วน';
  }

  return (negative ? 'ลบ' : '') + text;
}
