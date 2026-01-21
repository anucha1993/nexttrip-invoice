# Payment Gateway Integration Guide

## 📁 โครงสร้างไฟล์

```
lib/
  payment-gateway/
    types.ts          # Type definitions
    index.ts          # Main service (Mock)
    
app/api/
  payment-gateway/
    route.ts          # Create & Check payment
    callback/
      route.ts        # Handle redirect from bank
    webhook/
      route.ts        # Handle async notifications
      
components/
  payment/
    payment-gateway-modal.tsx   # UI Component
    
app/(dashboard)/
  payment-demo/
    page.tsx          # Demo page
```

---

## 🔧 Environment Variables

```env
# Payment Gateway Credentials
PAYMENT_PUBLIC_KEY=pkey_test_xxxxx
PAYMENT_SECRET_KEY=skey_test_xxxxx
PAYMENT_WEBHOOK_SECRET=whsec_xxxxx

# Base URL for callbacks
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

---

## 🔄 Payment Flow

### PromptPay Flow
```
1. User เลือก PromptPay → กดชำระเงิน
2. Frontend → POST /api/payment-gateway
3. Backend → สร้าง pending transaction + เรียก Payment Gateway
4. Backend → Return QR Code URL
5. Frontend → แสดง QR Code + เริ่ม polling status
6. User → สแกน QR + ชำระผ่านแอปธนาคาร
7. Bank → Notify Payment Gateway
8. Payment Gateway → POST /api/payment-gateway/webhook
9. Backend → อัพเดท transaction เป็น CONFIRMED + สร้างใบเสร็จ
10. Frontend (polling) → ตรวจพบ success → แสดงหน้าสำเร็จ
```

### Credit Card / Banking Flow
```
1. User เลือก Credit Card → กดชำระเงิน
2. Frontend → POST /api/payment-gateway  
3. Backend → Return redirect URL
4. Frontend → Redirect ไปหน้า payment gateway
5. User → กรอกข้อมูลบัตร/ยืนยัน OTP
6. Payment Gateway → Redirect กลับมา /api/payment-gateway/callback
7. Backend → Verify กับ Payment Gateway
8. Backend → อัพเดท transaction + Redirect ไปหน้าสำเร็จ
```

---

## 📦 Database Columns ที่ต้องเพิ่ม

```sql
ALTER TABLE customer_transactions ADD COLUMN paymentGatewayId VARCHAR(100) NULL;
ALTER TABLE customer_transactions ADD COLUMN paymentGatewayRef VARCHAR(100) NULL;
ALTER TABLE customer_transactions ADD COLUMN paymentGatewayMethod VARCHAR(50) NULL;
ALTER TABLE customer_transactions ADD COLUMN paymentGatewayStatus VARCHAR(50) NULL;
```

---

## 🔌 Integration กับ Provider จริง

### Omise (แนะนำสำหรับไทย)
```typescript
// lib/payment-gateway/omise.ts
import Omise from 'omise';

const omise = Omise({
  publicKey: process.env.OMISE_PUBLIC_KEY,
  secretKey: process.env.OMISE_SECRET_KEY,
});

export async function createPromptPayCharge(amount: number, metadata: any) {
  const source = await omise.sources.create({
    type: 'promptpay',
    amount: amount * 100, // satang
    currency: 'thb',
  });
  
  const charge = await omise.charges.create({
    amount: amount * 100,
    currency: 'thb',
    source: source.id,
    metadata,
  });
  
  return {
    chargeId: charge.id,
    qrCodeUrl: charge.source.scannable_code.image.download_uri,
    expiresAt: charge.expires_at,
  };
}
```

### 2C2P
```typescript
// lib/payment-gateway/2c2p.ts
export async function create2C2PPayment(amount: number, orderId: string) {
  const payload = {
    merchantID: process.env.C2P_MERCHANT_ID,
    invoiceNo: orderId,
    amount: amount.toFixed(2),
    currencyCode: 'THB',
    // ... other required fields
  };
  
  // Sign payload with JWT
  const token = jwt.sign(payload, process.env.C2P_SECRET_KEY);
  
  const response = await fetch('https://sandbox-pgw.2c2p.com/payment/4.1/paymentToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: token }),
  });
  
  return response.json();
}
```

---

## 🧪 ทดสอบ

1. เปิด `/payment-demo` ในเบราว์เซอร์
2. ใส่ยอดทดสอบ
3. กด "ชำระเงิน"
4. ทดสอบแต่ละ payment method

### Mock Behavior
- **PromptPay**: แสดง QR Code mock, polling status จะสุ่ม success
- **Credit Card**: Redirect ไป callback พร้อม mock=true → success
- **Banking**: Redirect ไป callback พร้อม mock=true → success

---

## ✅ Checklist ก่อน Production

- [ ] เปลี่ยน API keys เป็น production keys
- [ ] ตั้งค่า webhook URL ที่ payment gateway dashboard
- [ ] ทดสอบ webhook signature verification
- [ ] เพิ่ม rate limiting
- [ ] เพิ่ม logging & monitoring
- [ ] ทดสอบ edge cases (expired, failed, duplicate)
- [ ] Setup SSL/HTTPS
