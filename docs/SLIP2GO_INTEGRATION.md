# Slip2Go Integration Guide

ระบบตรวจสอบสลิปโอนเงินอัตโนมัติผ่าน [Slip2Go API](https://connect.slip2go.com) — ย้ายมาจาก cyc-crm มาเป็น Next.js/TypeScript

## ไฟล์ที่เกี่ยวข้อง

| Path | หน้าที่ |
|---|---|
| `migrations/015_add_slip2go_columns.sql` | เพิ่มคอลัมน์ `slipRef/slipStatusCode/slipVerifiedAt/slipData` และ seed ค่า setting |
| `lib/services/company-setting.ts` | Helper อ่าน/เขียน `company_settings` (Prisma) |
| `lib/services/slip2go.ts` | Service เรียก Slip2Go API |
| `app/api/settings/slip2go/route.ts` | GET/PUT ค่าตั้งค่า Slip2Go |
| `app/api/settings/slip2go/test/route.ts` | POST ทดสอบเชื่อมต่อ (account info) |
| `app/api/payments/verify-slip/route.ts` | POST ตรวจสอบสลิป + กันซ้ำใน DB |
| `app/(dashboard)/settings/slip2go/page.tsx` | หน้าตั้งค่า + ทดลองยิงสลิป |

## วิธี deploy

### 1) รัน migration
```bash
mysql -u <user> -p <db> < migrations/015_add_slip2go_columns.sql
```

### 2) ตั้งค่าที่หน้าเว็บ
เข้า `/settings/slip2go` → กรอก:
- **API URL**: `https://connect.slip2go.com` (default)
- **Secret Key**: token ที่ได้จาก Slip2Go
- ติ๊ก **เปิดใช้งาน** และ **ตรวจสอบสลิปซ้ำ**
- กด **ทดสอบเชื่อมต่อ** เพื่อยืนยัน credit คงเหลือ

### 3) เชื่อมกับหน้ารับชำระเงิน (`/finance/payments/create`)
ก่อนเรียก `POST /api/customer-transactions` ให้ verify สลิปก่อน:

```ts
// pseudo-code
if (slipFile && paymentMethod === 'TRANSFER') {
  const fd = new FormData();
  fd.append('file', slipFile);
  fd.append('amount', String(amount));
  fd.append('amountType', 'gte');
  if (selectedBankAccountId) fd.append('bankAccountId', selectedBankAccountId);

  const res = await fetch('/api/payments/verify-slip', { method: 'POST', body: fd });
  const v = await res.json();

  if (!v.ok) {
    // สลิปไม่ผ่าน หรือ ซ้ำ → หยุดบันทึก
    alert(v.message);
    return;
  }
  // เก็บผลลัพธ์เพื่อบันทึกลง DB
  slipRef       = v.slip.slipRef;
  slipStatusCode= v.slip.slipStatusCode;
  slipData      = v.slip.slipData;
}
```

จากนั้น POST `/api/customer-transactions` โดยแนบ `slipRef, slipStatusCode, slipData` เพิ่ม
(อย่าลืมอัปเดต SQL INSERT ใน `app/api/customer-transactions/route.ts` ให้รับฟิลด์เหล่านี้)

## Response codes ที่พบบ่อย

| Code | ความหมาย |
|---|---|
| `200000` | สลิปถูกต้อง |
| `400000+` | payload ผิด (ตัวอย่าง: 400302 duplicate slip) |
| `401000+` | Secret Key ไม่ถูกต้อง |
| `duplicate_local` | (custom) เจอสลิปนี้บันทึกไว้แล้วในระบบ |

## ค่า setting ใน `company_settings`

| Key | Default |
|---|---|
| `slip2go_api_url` | `https://connect.slip2go.com` |
| `slip2go_secret_key` | *(empty)* |
| `slip2go_check_duplicate` | `true` |
| `slip2go_enabled` | `false` |
