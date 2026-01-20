# 📋 คู่มือพัฒนาระบบจัดการเอกสาร (Document Management System)

## 📑 สารบัญ
- [ภาพรวมระบบ](#ภาพรวมระบบ)
- [โครงสร้างฐานข้อมูล](#โครงสร้างฐานข้อมูล)
- [ขั้นตอนการพัฒนา](#ขั้นตอนการพัฒนา)
- [API Endpoints](#api-endpoints)
- [UI/UX Flow](#uiux-flow)
- [Business Logic](#business-logic)
- [Validation Rules](#validation-rules)
- [Testing Checklist](#testing-checklist)

---

## 🎯 ภาพรวมระบบ

### วัตถุประสงค์
พัฒนาระบบที่สามารถ Convert ใบเสนอราคา (Quotation) ไปเป็นเอกสารอื่นๆ ได้แก่:
- **ใบแจ้งหนี้** (Invoice) - IVN2601-XXXX
- **ใบเสร็จรับเงิน** (Receipt) - PM2601-XXXX (พร้อมบันทึกการชำระเงิน)
- **ใบกำกับภาษี** (Tax Invoice) - RVN202601-XXXX

### หลักการสำคัญ
1. ✅ **ใบเสนอราคา = Master Document** - อ้างอิงทุกอย่างที่ใบเสนอราคา
2. ✅ **ออกเอกสารได้เมื่ออนุมัติแล้ว** - status = 'APPROVED'
3. ✅ **ยอดรวมห้ามเกิน** - ยอดรวมของเอกสารทั้งหมดต้อง ≤ quotation.grandTotal
4. ✅ **รายการต่างกันได้** - รายการในเอกสารกำหนดเองได้ แต่ยอดรวมต้องตรง
5. ✅ **Cascade Cancel** - ยกเลิกตามลำดับชั้น

### ความสัมพันธ์ของเอกสาร

```
QUOTATION (ใบเสนอราคา)
├── STATUS: APPROVED (ต้องอนุมัติก่อนออกเอกสาร)
├── GRAND TOTAL: 100,000 บาท (ยอดรวมสูงสุด)
│
├─► INVOICE #1 (ใบแจ้งหนี้มัดจำ)
│   ├── 30,000 บาท
│   ├─► RECEIPT #1 (ใบเสร็จรับเงินมัดจำ)
│   │   └── 30,000 บาท + PAYMENT RECORD
│   └─► TAX_INVOICE #1 (ใบกำกับภาษีมัดจำ)
│       └── 30,000 บาท
│
├─► INVOICE #2 (ใบแจ้งหนี้ยอดคงเหลือ)
│   ├── 70,000 บาท
│   ├─► RECEIPT #2 (ใบเสร็จยอดคงเหลือ)
│   │   └── 70,000 บาท + PAYMENT RECORD
│   └─► TAX_INVOICE #2 (ใบกำกับภาษียอดคงเหลือ)
│       └── 70,000 บาท
│
└─► RECEIPT #3 (ใบเสร็จตรงจาก Quotation)
    └── 100,000 บาท + PAYMENT RECORD
```

### กฎการยกเลิกเอกสาร

```
1. ยกเลิก QUOTATION
   └─► ยกเลิก INVOICES ทั้งหมด
       └─► ยกเลิก RECEIPTS และ TAX_INVOICES ทั้งหมด

2. ยกเลิก INVOICE
   └─► ยกเลิก RECEIPTS และ TAX_INVOICES ที่เชื่อมโยง
   └─► QUOTATION ไม่ถูกยกเลิก

3. ยกเลิก RECEIPT หรือ TAX_INVOICE
   └─► ไม่มีผลกับเอกสารอื่น
```

---

## 🗄️ โครงสร้างฐานข้อมูล

### 1. ตาราง `invoices` (ใบแจ้งหนี้)

```sql
CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoiceNumber VARCHAR(20) NOT NULL UNIQUE COMMENT 'IVN2601-0001',
  quotationId INT NOT NULL COMMENT 'FK → quotations.id',
  
  -- ข้อมูลเอกสาร
  invoiceDate DATE NOT NULL,
  dueDate DATE,
  
  -- ยอดเงิน
  subtotal DECIMAL(15,2) DEFAULT 0,
  vatAmount DECIMAL(15,2) DEFAULT 0,
  grandTotal DECIMAL(15,2) NOT NULL COMMENT 'ห้ามเกิน quotation.grandTotal',
  
  -- สถานะ
  status ENUM('DRAFT', 'ISSUED', 'PAID', 'PARTIAL_PAID', 'CANCELLED', 'VOIDED') DEFAULT 'DRAFT',
  cancelledAt DATETIME NULL,
  cancelledById INT NULL,
  cancelReason VARCHAR(500) NULL,
  
  notes TEXT,
  createdById INT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (quotationId) REFERENCES quotations(id),
  INDEX idx_quotation (quotationId),
  INDEX idx_status (status),
  INDEX idx_invoice_number (invoiceNumber)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2. ตาราง `invoice_items` (รายการในใบแจ้งหนี้)

```sql
CREATE TABLE invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoiceId INT NOT NULL,
  
  description VARCHAR(500) NOT NULL COMMENT 'กรอกเอง ไม่ต้องตรงกับ quotation_items',
  quantity INT DEFAULT 1,
  unitPrice DECIMAL(15,2) DEFAULT 0,
  amount DECIMAL(15,2) DEFAULT 0,
  vatType ENUM('NO_VAT', 'VAT', 'VAT_EXEMPT') DEFAULT 'NO_VAT',
  sortOrder INT DEFAULT 0,
  
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE CASCADE,
  INDEX idx_invoice (invoiceId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3. ตาราง `receipts` (ใบเสร็จรับเงิน)

```sql
CREATE TABLE receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receiptNumber VARCHAR(20) NOT NULL UNIQUE COMMENT 'PM2601-0001',
  quotationId INT NOT NULL COMMENT 'FK → quotations.id',
  invoiceId INT NULL COMMENT 'FK → invoices.id (ถ้าออกจาก Invoice)',
  
  -- ข้อมูลเอกสาร
  receiptDate DATE NOT NULL,
  
  -- ยอดเงิน
  subtotal DECIMAL(15,2) DEFAULT 0,
  vatAmount DECIMAL(15,2) DEFAULT 0,
  grandTotal DECIMAL(15,2) NOT NULL,
  
  -- สถานะ
  status ENUM('DRAFT', 'ISSUED', 'CANCELLED', 'VOIDED') DEFAULT 'DRAFT',
  cancelledAt DATETIME NULL,
  cancelledById INT NULL,
  cancelReason VARCHAR(500) NULL,
  
  notes TEXT,
  createdById INT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (quotationId) REFERENCES quotations(id),
  FOREIGN KEY (invoiceId) REFERENCES invoices(id),
  INDEX idx_quotation (quotationId),
  INDEX idx_invoice (invoiceId),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4. ตาราง `receipt_items` (รายการในใบเสร็จ)

```sql
CREATE TABLE receipt_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receiptId INT NOT NULL,
  
  description VARCHAR(500) NOT NULL,
  quantity INT DEFAULT 1,
  unitPrice DECIMAL(15,2) DEFAULT 0,
  amount DECIMAL(15,2) DEFAULT 0,
  vatType ENUM('NO_VAT', 'VAT', 'VAT_EXEMPT') DEFAULT 'NO_VAT',
  sortOrder INT DEFAULT 0,
  
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (receiptId) REFERENCES receipts(id) ON DELETE CASCADE,
  INDEX idx_receipt (receiptId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5. ตาราง `payments` (บันทึกการชำระเงิน)

```sql
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receiptId INT NOT NULL COMMENT 'FK → receipts.id',
  
  paymentDate DATE NOT NULL,
  paymentMethod ENUM('CASH', 'TRANSFER', 'CREDIT_CARD', 'CHEQUE', 'OTHER') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  
  -- รายละเอียดการชำระ
  bankName VARCHAR(100) NULL COMMENT 'ชื่อธนาคาร (กรณีโอน)',
  accountNumber VARCHAR(50) NULL COMMENT 'เลขบัญชี',
  chequeNumber VARCHAR(50) NULL COMMENT 'เลขเช็ค',
  referenceNumber VARCHAR(100) NULL COMMENT 'เลขอ้างอิง',
  
  notes TEXT,
  createdById INT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (receiptId) REFERENCES receipts(id) ON DELETE CASCADE,
  INDEX idx_receipt (receiptId),
  INDEX idx_payment_date (paymentDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 6. ตาราง `tax_invoices` (ใบกำกับภาษี)

```sql
CREATE TABLE tax_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  taxInvoiceNumber VARCHAR(20) NOT NULL UNIQUE COMMENT 'RVN202601-0001',
  quotationId INT NOT NULL COMMENT 'FK → quotations.id',
  invoiceId INT NULL COMMENT 'FK → invoices.id (ถ้าออกจาก Invoice)',
  
  -- ข้อมูลเอกสาร
  taxInvoiceDate DATE NOT NULL,
  
  -- ยอดเงิน (ต้องแยก VAT)
  preVatAmount DECIMAL(15,2) DEFAULT 0 COMMENT 'ยอดก่อน VAT',
  vatAmount DECIMAL(15,2) DEFAULT 0 COMMENT 'VAT 7%',
  grandTotal DECIMAL(15,2) NOT NULL COMMENT 'ยอดรวม',
  
  -- สถานะ
  status ENUM('DRAFT', 'ISSUED', 'CANCELLED', 'VOIDED') DEFAULT 'DRAFT',
  cancelledAt DATETIME NULL,
  cancelledById INT NULL,
  cancelReason VARCHAR(500) NULL,
  
  notes TEXT,
  createdById INT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (quotationId) REFERENCES quotations(id),
  FOREIGN KEY (invoiceId) REFERENCES invoices(id),
  INDEX idx_quotation (quotationId),
  INDEX idx_invoice (invoiceId),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 7. ตาราง `tax_invoice_items` (รายการในใบกำกับภาษี)

```sql
CREATE TABLE tax_invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  taxInvoiceId INT NOT NULL,
  
  description VARCHAR(500) NOT NULL,
  quantity INT DEFAULT 1,
  unitPrice DECIMAL(15,2) DEFAULT 0,
  amount DECIMAL(15,2) DEFAULT 0,
  sortOrder INT DEFAULT 0,
  
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (taxInvoiceId) REFERENCES tax_invoices(id) ON DELETE CASCADE,
  INDEX idx_tax_invoice (taxInvoiceId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 8. ตาราง `document_sequences` (Running Numbers)

```sql
CREATE TABLE document_sequences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  documentType ENUM('RECEIPT', 'INVOICE', 'TAX_INVOICE') NOT NULL,
  yearMonth VARCHAR(6) NOT NULL COMMENT 'เช่น 202601',
  lastNumber INT DEFAULT 0,
  
  UNIQUE KEY unique_type_month (documentType, yearMonth)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 🚀 ขั้นตอนการพัฒนา

### Phase 1: Database Setup (วันที่ 1)

#### Step 1.1: สร้าง Migration File
```bash
# สร้างไฟล์ SQL
touch migrations/005_create_document_tables.sql
```

#### Step 1.2: Run Migration
```bash
# เชื่อมต่อ Database และ Run SQL
mysql -h 103.80.48.25 -u mailfore_nexttrip_invoice -p nexttrip_invoice < migrations/005_create_document_tables.sql
```

#### Step 1.3: Verify Tables
```sql
-- ตรวจสอบว่าตารางถูกสร้างแล้ว
SHOW TABLES LIKE '%invoice%';
SHOW TABLES LIKE '%receipt%';
SHOW TABLES LIKE 'payments';
SHOW TABLES LIKE 'document_sequences';
```

### Phase 2: API Development - Invoices (วันที่ 2-3)

#### Step 2.1: สร้าง API Routes
```
app/api/
├── invoices/
│   ├── route.ts              (GET all, POST create)
│   ├── [id]/
│   │   └── route.ts          (GET one, PUT update, DELETE)
│   └── generate-number/
│       └── route.ts          (GET next invoice number)
```

#### Step 2.2: Implement Endpoints

**GET /api/invoices** - รายการใบแจ้งหนี้ทั้งหมด
```typescript
// Query with filters
// ?quotationId=8
// ?status=ISSUED
// ?page=1&limit=10
```

**POST /api/invoices** - สร้างใบแจ้งหนี้ใหม่
```typescript
{
  "quotationId": 8,
  "invoiceDate": "2026-01-20",
  "dueDate": "2026-02-20",
  "grandTotal": 30000,
  "notes": "ใบแจ้งหนี้มัดจำ",
  "items": [
    {
      "description": "ค่าบริการทัวร์ญี่ปุ่น (มัดจำ)",
      "quantity": 1,
      "unitPrice": 30000,
      "amount": 30000,
      "vatType": "NO_VAT"
    }
  ]
}
```

**GET /api/invoices/[id]** - ข้อมูลใบแจ้งหนี้ 1 รายการ
```typescript
// Return invoice with items, quotation info, receipts, tax_invoices
```

**PUT /api/invoices/[id]** - แก้ไขใบแจ้งหนี้
```typescript
// Update invoice and items
// Validate total doesn't exceed quotation.grandTotal
```

**DELETE /api/invoices/[id]** - ยกเลิกใบแจ้งหนี้
```typescript
// Set status = 'CANCELLED'
// Cascade cancel receipts and tax_invoices
```

#### Step 2.3: Validation Logic
```typescript
// lib/validations/invoice.ts

export async function validateInvoiceCreation(
  quotationId: number,
  amount: number,
  conn: any
) {
  // 1. ตรวจสอบ quotation status
  const [quotations] = await conn.query(
    'SELECT * FROM quotations WHERE id = ?',
    [quotationId]
  );
  
  if (!quotations.length) {
    throw new Error('ไม่พบใบเสนอราคา');
  }
  
  const quotation = quotations[0];
  
  if (quotation.status !== 'APPROVED') {
    throw new Error('ต้องอนุมัติใบเสนอราคาก่อนออกใบแจ้งหนี้');
  }
  
  // 2. ตรวจสอบยอดรวมไม่เกิน
  const [existing] = await conn.query(
    `SELECT COALESCE(SUM(grandTotal), 0) as total 
     FROM invoices 
     WHERE quotationId = ? AND status NOT IN ('CANCELLED', 'VOIDED')`,
    [quotationId]
  );
  
  const existingTotal = existing[0].total;
  const remainingAmount = quotation.grandTotal - existingTotal;
  
  if (amount > remainingAmount) {
    throw new Error(
      `ยอดเกินกว่าที่เหลือ: คงเหลือ ${remainingAmount.toLocaleString()} บาท`
    );
  }
  
  return { quotation, remainingAmount };
}
```

### Phase 3: API Development - Receipts (วันที่ 4-5)

#### Step 3.1: สร้าง API Routes
```
app/api/
├── receipts/
│   ├── route.ts              (GET all, POST create)
│   ├── [id]/
│   │   └── route.ts          (GET one, PUT update, DELETE)
│   └── generate-number/
│       └── route.ts          (GET next receipt number)
```

#### Step 3.2: Implement with Payment Records
```typescript
// POST /api/receipts
{
  "quotationId": 8,
  "invoiceId": 1,  // optional
  "receiptDate": "2026-01-20",
  "grandTotal": 30000,
  "items": [...],
  "payment": {
    "paymentDate": "2026-01-20",
    "paymentMethod": "TRANSFER",
    "amount": 30000,
    "bankName": "ธนาคารกสิกรไทย",
    "accountNumber": "123-4-56789-0",
    "referenceNumber": "TXN123456"
  }
}
```

### Phase 4: API Development - Tax Invoices (วันที่ 6-7)

#### Step 4.1: สร้าง API Routes
```
app/api/
├── tax-invoices/
│   ├── route.ts              (GET all, POST create)
│   ├── [id]/
│   │   └── route.ts          (GET one, PUT update, DELETE)
│   └── generate-number/
│       └── route.ts          (GET next tax invoice number)
```

### Phase 5: Running Number System (วันที่ 8)

#### Step 5.1: Generate Number Helper
```typescript
// lib/helpers/document-number.ts

export async function generateDocumentNumber(
  type: 'RECEIPT' | 'INVOICE' | 'TAX_INVOICE',
  conn: any
): Promise<string> {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const yyyy = now.getFullYear().toString();
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  
  let prefix: string;
  let yearMonth: string;
  
  switch (type) {
    case 'RECEIPT':
      prefix = `PM${yy}${mm}`;      // PM2601
      yearMonth = `${yy}${mm}`;
      break;
    case 'INVOICE':
      prefix = `IVN${yy}${mm}`;     // IVN2601
      yearMonth = `${yy}${mm}`;
      break;
    case 'TAX_INVOICE':
      prefix = `RVN${yyyy}${mm}`;   // RVN202601
      yearMonth = `${yyyy}${mm}`;
      break;
  }
  
  // Atomic increment
  await conn.query(`
    INSERT INTO document_sequences (documentType, yearMonth, lastNumber)
    VALUES (?, ?, 1)
    ON DUPLICATE KEY UPDATE lastNumber = lastNumber + 1
  `, [type, yearMonth]);
  
  const [seq] = await conn.query(`
    SELECT lastNumber FROM document_sequences 
    WHERE documentType = ? AND yearMonth = ?
  `, [type, yearMonth]);
  
  const number = seq[0].lastNumber.toString().padStart(4, '0');
  
  return `${prefix}-${number}`;
}
```

### Phase 6: UI Development - Quotation Detail (วันที่ 9-10)

#### Step 6.1: แก้ไขหน้า Quotation Detail
```typescript
// app/(dashboard)/quotations/[id]/page.tsx

// เพิ่ม Section แสดงเอกสารที่เชื่อมโยง
<Card>
  <CardHeader>
    <h3>เอกสารที่ออก</h3>
  </CardHeader>
  <CardContent>
    {/* แสดงรายการ Invoices */}
    <InvoiceList quotationId={quotation.id} />
    
    {/* แสดงรายการ Receipts */}
    <ReceiptList quotationId={quotation.id} />
    
    {/* แสดงรายการ Tax Invoices */}
    <TaxInvoiceList quotationId={quotation.id} />
  </CardContent>
</Card>

{/* ปุ่มออกเอกสาร */}
{quotation.status === 'APPROVED' && (
  <div className="flex gap-2">
    <Button onClick={() => createInvoice()}>+ ออกใบแจ้งหนี้</Button>
    <Button onClick={() => createReceipt()}>+ ออกใบเสร็จ</Button>
    <Button onClick={() => createTaxInvoice()}>+ ออกใบกำกับภาษี</Button>
  </div>
)}
```

### Phase 7: UI Development - Invoice Management (วันที่ 11-13)

#### Step 7.1: สร้างหน้า Invoice
```
app/(dashboard)/invoices/
├── page.tsx                    (รายการทั้งหมด)
├── [id]/
│   ├── page.tsx               (view invoice)
│   └── edit/
│       └── page.tsx           (แก้ไขใบแจ้งหนี้)
└── create/
    └── page.tsx               (สร้างใบแจ้งหนี้)
```

#### Step 7.2: Form Component
```typescript
// components/invoices/invoice-form.tsx

export function InvoiceForm({ quotationId, initialData }) {
  const [items, setItems] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  
  // Fetch quotation info
  const { quotation, remainingAmount } = useFetchQuotation(quotationId);
  
  // Calculate total from items
  useEffect(() => {
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    setGrandTotal(total);
  }, [items]);
  
  // Validation
  const canSubmit = grandTotal > 0 && grandTotal <= remainingAmount;
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Quotation Info (Read-only) */}
      <Card>
        <CardContent>
          <div>ใบเสนอราคา: {quotation.quotationNumber}</div>
          <div>ยอดรวม: {quotation.grandTotal.toLocaleString()}</div>
          <div>คงเหลือ: {remainingAmount.toLocaleString()}</div>
        </CardContent>
      </Card>
      
      {/* Invoice Items */}
      <Card>
        <CardContent>
          <InvoiceItemsEditor 
            items={items} 
            onChange={setItems}
          />
        </CardContent>
      </Card>
      
      {/* Total Validation */}
      <Alert variant={canSubmit ? 'success' : 'error'}>
        ยอดรวม: {grandTotal.toLocaleString()} / {remainingAmount.toLocaleString()}
      </Alert>
      
      <Button disabled={!canSubmit}>บันทึก</Button>
    </form>
  );
}
```

### Phase 8: UI Development - Receipt Management (วันที่ 14-16)

#### Step 8.1: สร้างหน้า Receipt พร้อม Payment Form
```typescript
// components/receipts/receipt-form.tsx

export function ReceiptForm({ quotationId, invoiceId, initialData }) {
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Receipt Items */}
      <Card>
        <CardHeader>รายการใบเสร็จ</CardHeader>
        <CardContent>
          <ReceiptItemsEditor items={items} onChange={setItems} />
        </CardContent>
      </Card>
      
      {/* Payment Information */}
      <Card>
        <CardHeader>ข้อมูลการชำระเงิน</CardHeader>
        <CardContent>
          <div>
            <label>วันที่ชำระ</label>
            <Input type="date" {...register('paymentDate')} />
          </div>
          
          <div>
            <label>วิธีชำระ</label>
            <Select {...register('paymentMethod')}>
              <option value="CASH">เงินสด</option>
              <option value="TRANSFER">โอนเงิน</option>
              <option value="CREDIT_CARD">บัตรเครดิต</option>
              <option value="CHEQUE">เช็ค</option>
            </Select>
          </div>
          
          {paymentMethod === 'TRANSFER' && (
            <>
              <Input placeholder="ชื่อธนาคาร" {...register('bankName')} />
              <Input placeholder="เลขบัญชี" {...register('accountNumber')} />
              <Input placeholder="เลขอ้างอิง" {...register('referenceNumber')} />
            </>
          )}
          
          {paymentMethod === 'CHEQUE' && (
            <Input placeholder="เลขเช็ค" {...register('chequeNumber')} />
          )}
        </CardContent>
      </Card>
      
      <Button>บันทึกใบเสร็จและการชำระเงิน</Button>
    </form>
  );
}
```

### Phase 9: UI Development - Tax Invoice Management (วันที่ 17-18)

#### Step 9.1: สร้างหน้า Tax Invoice (คล้ายกับ Invoice)

### Phase 10: Document Cancellation (วันที่ 19)

#### Step 10.1: Implement Cancel Modal
```typescript
// components/documents/cancel-modal.tsx

export function CancelModal({ documentType, documentId, onSuccess }) {
  const [reason, setReason] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  
  // ตรวจสอบว่ามีเอกสารที่จะถูก cascade cancel หรือไม่
  useEffect(() => {
    if (documentType === 'QUOTATION') {
      // โหลดรายการเอกสารที่เชื่อมโยง
      fetchRelatedDocuments(documentId).then(docs => {
        if (docs.length > 0) {
          setShowWarning(true);
        }
      });
    }
  }, [documentType, documentId]);
  
  const handleCancel = async () => {
    await fetch(`/api/${documentType}/${documentId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
    onSuccess();
  };
  
  return (
    <Modal>
      {showWarning && (
        <Alert variant="warning">
          ⚠️ การยกเลิกเอกสารนี้จะยกเลิกเอกสารที่เชื่อมโยงด้วย
        </Alert>
      )}
      
      <textarea 
        placeholder="เหตุผลในการยกเลิก"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      
      <Button onClick={handleCancel}>ยืนยันการยกเลิก</Button>
    </Modal>
  );
}
```

### Phase 11: PDF Generation (วันที่ 20-21)

#### Step 11.1: Install PDF Library
```bash
npm install jspdf jspdf-autotable
```

#### Step 11.2: Create PDF Templates
```typescript
// lib/pdf/invoice-pdf.ts
export function generateInvoicePDF(invoice: Invoice) {
  const doc = new jsPDF();
  
  // Add watermark if cancelled
  if (invoice.status === 'CANCELLED' || invoice.status === 'VOIDED') {
    doc.setFontSize(60);
    doc.setTextColor(200, 0, 0);
    doc.text('ยกเลิก', 105, 150, { align: 'center' });
  }
  
  // Add content...
  
  return doc;
}
```

### Phase 12: Testing & Debugging (วันที่ 22-25)

---

## 🔌 API Endpoints

### Invoices

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | รายการใบแจ้งหนี้ทั้งหมด |
| GET | `/api/invoices?quotationId=8` | ใบแจ้งหนี้ของใบเสนอราคา |
| POST | `/api/invoices` | สร้างใบแจ้งหนี้ใหม่ |
| GET | `/api/invoices/[id]` | ข้อมูลใบแจ้งหนี้ 1 รายการ |
| PUT | `/api/invoices/[id]` | แก้ไขใบแจ้งหนี้ |
| POST | `/api/invoices/[id]/cancel` | ยกเลิกใบแจ้งหนี้ |
| GET | `/api/invoices/generate-number` | สร้างเลขที่ใบแจ้งหนี้ถัดไป |

### Receipts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/receipts` | รายการใบเสร็จทั้งหมด |
| GET | `/api/receipts?quotationId=8` | ใบเสร็จของใบเสนอราคา |
| GET | `/api/receipts?invoiceId=1` | ใบเสร็จของใบแจ้งหนี้ |
| POST | `/api/receipts` | สร้างใบเสร็จ + บันทึกการชำระเงิน |
| GET | `/api/receipts/[id]` | ข้อมูลใบเสร็จ + payment records |
| PUT | `/api/receipts/[id]` | แก้ไขใบเสร็จ |
| POST | `/api/receipts/[id]/cancel` | ยกเลิกใบเสร็จ |
| GET | `/api/receipts/generate-number` | สร้างเลขที่ใบเสร็จถัดไป |

### Tax Invoices

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tax-invoices` | รายการใบกำกับภาษีทั้งหมด |
| GET | `/api/tax-invoices?quotationId=8` | ใบกำกับภาษีของใบเสนอราคา |
| GET | `/api/tax-invoices?invoiceId=1` | ใบกำกับภาษีของใบแจ้งหนี้ |
| POST | `/api/tax-invoices` | สร้างใบกำกับภาษีใหม่ |
| GET | `/api/tax-invoices/[id]` | ข้อมูลใบกำกับภาษี 1 รายการ |
| PUT | `/api/tax-invoices/[id]` | แก้ไขใบกำกับภาษี |
| POST | `/api/tax-invoices/[id]/cancel` | ยกเลิกใบกำกับภาษี |
| GET | `/api/tax-invoices/generate-number` | สร้างเลขที่ใบกำกับภาษีถัดไป |

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments?receiptId=1` | รายการชำระเงินของใบเสร็จ |
| POST | `/api/payments` | เพิ่มการชำระเงิน |
| GET | `/api/payments/[id]` | ข้อมูลการชำระเงิน 1 รายการ |
| PUT | `/api/payments/[id]` | แก้ไขการชำระเงิน |
| DELETE | `/api/payments/[id]` | ลบการชำระเงิน |

---

## 🎨 UI/UX Flow

### 1. Flow การสร้างใบแจ้งหนี้จาก Quotation

```
Quotation Detail Page
  ↓ คลิก "ออกใบแจ้งหนี้"
  ↓ (ตรวจสอบ status === 'APPROVED')
  ↓
Create Invoice Page
  ├─ แสดงข้อมูล Quotation (Read-only)
  │  ├─ เลขที่ใบเสนอราคา
  │  ├─ ลูกค้า
  │  ├─ ยอดรวม
  │  └─ ยอดคงเหลือ
  │
  ├─ กรอกรายการ Invoice Items (ต่างจาก Quotation ได้)
  │  ├─ คำอธิบาย
  │  ├─ จำนวน
  │  ├─ ราคา/หน่วย
  │  └─ ยอดรวม
  │
  ├─ แสดง Real-time Validation
  │  └─ "ยอดรวม: 30,000 / 100,000 (คงเหลือ 70,000)"
  │
  ↓ คลิก "บันทึก"
  ↓ (Validate ยอดรวม ≤ remainingAmount)
  ↓
Invoice Created
  └─ Redirect to Invoice Detail
```

### 2. Flow การสร้างใบเสร็จพร้อมบันทึกการชำระเงิน

```
Invoice Detail Page
  ↓ คลิก "ออกใบเสร็จ"
  ↓
Create Receipt Page
  ├─ แสดงข้อมูล Invoice
  ├─ กรอกรายการ Receipt Items
  ├─ กรอกข้อมูลการชำระเงิน
  │  ├─ วันที่ชำระ
  │  ├─ วิธีชำระ (เงินสด/โอน/บัตร/เช็ค)
  │  ├─ ยอดเงิน
  │  └─ รายละเอียดเพิ่มเติม
  │
  ↓ คลิก "บันทึก"
  ↓ (บันทึกทั้ง Receipt และ Payment Record)
  ↓
Receipt Created + Payment Recorded
  └─ Redirect to Receipt Detail
```

### 3. Flow การยกเลิกเอกสาร

```
Document Detail Page
  ↓ คลิก "ยกเลิกเอกสาร"
  ↓
Cancel Modal
  ├─ แสดง Warning (ถ้า cascade)
  │  └─ "เอกสารนี้มีเอกสารที่เชื่อมโยง X รายการ"
  │
  ├─ กรอกเหตุผล
  │
  ↓ คลิก "ยืนยัน"
  ↓ (Cascade cancel related documents)
  ↓
Document Cancelled
  ├─ Status → 'CANCELLED'
  ├─ Show Watermark "ยกเลิก"
  └─ ไม่สามารถแก้ไขได้อีก
```

---

## 🧮 Business Logic

### 1. การคำนวณยอดคงเหลือ

```typescript
// ยอดคงเหลือของ Quotation สำหรับออก Invoice
remainingForInvoice = quotation.grandTotal - SUM(invoices.grandTotal WHERE status != 'CANCELLED')

// ยอดคงเหลือของ Quotation สำหรับออก Receipt (ตรงจาก Quotation)
remainingForReceipt = quotation.grandTotal - SUM(receipts.grandTotal WHERE invoiceId IS NULL AND status != 'CANCELLED')

// ยอดคงเหลือของ Invoice สำหรับออก Receipt
remainingForReceiptFromInvoice = invoice.grandTotal - SUM(receipts.grandTotal WHERE invoiceId = X AND status != 'CANCELLED')
```

### 2. การ Cascade Cancel

```typescript
// ยกเลิก Quotation
async function cancelQuotation(quotationId, reason) {
  // 1. ยกเลิก Quotation
  await updateStatus(quotations, quotationId, 'CANCELLED', reason);
  
  // 2. ยกเลิก Invoices ทั้งหมด
  const invoices = await getInvoicesByQuotation(quotationId);
  for (const inv of invoices) {
    await cancelInvoice(inv.id, 'ยกเลิกตามใบเสนอราคา');
  }
  
  // 3. ยกเลิก Receipts ที่ออกตรงจาก Quotation
  const receipts = await getReceiptsByQuotation(quotationId, { invoiceId: null });
  for (const rec of receipts) {
    await updateStatus(receipts, rec.id, 'CANCELLED', 'ยกเลิกตามใบเสนอราคา');
  }
  
  // 4. ยกเลิก Tax Invoices ที่ออกตรงจาก Quotation
  const taxInvoices = await getTaxInvoicesByQuotation(quotationId, { invoiceId: null });
  for (const tax of taxInvoices) {
    await updateStatus(tax_invoices, tax.id, 'CANCELLED', 'ยกเลิกตามใบเสนอราคา');
  }
}

// ยกเลิก Invoice
async function cancelInvoice(invoiceId, reason) {
  // 1. ยกเลิก Invoice
  await updateStatus(invoices, invoiceId, 'CANCELLED', reason);
  
  // 2. ยกเลิก Receipts ที่ออกจาก Invoice นี้
  const receipts = await getReceiptsByInvoice(invoiceId);
  for (const rec of receipts) {
    await updateStatus(receipts, rec.id, 'CANCELLED', 'ยกเลิกตามใบแจ้งหนี้');
  }
  
  // 3. ยกเลิก Tax Invoices ที่ออกจาก Invoice นี้
  const taxInvoices = await getTaxInvoicesByInvoice(invoiceId);
  for (const tax of taxInvoices) {
    await updateStatus(tax_invoices, tax.id, 'CANCELLED', 'ยกเลิกตามใบแจ้งหนี้');
  }
}
```

### 3. Running Number แบบ Thread-safe

```typescript
async function generateDocumentNumber(type, conn) {
  // Use ON DUPLICATE KEY UPDATE for atomic increment
  await conn.query(`
    INSERT INTO document_sequences (documentType, yearMonth, lastNumber)
    VALUES (?, ?, 1)
    ON DUPLICATE KEY UPDATE lastNumber = lastNumber + 1
  `, [type, yearMonth]);
  
  // Get the updated value
  const [seq] = await conn.query(`
    SELECT lastNumber FROM document_sequences 
    WHERE documentType = ? AND yearMonth = ?
  `, [type, yearMonth]);
  
  return formatDocumentNumber(type, yearMonth, seq[0].lastNumber);
}
```

---

## ✅ Validation Rules

### 1. การสร้างเอกสาร

```typescript
// ✅ ต้อง APPROVED
if (quotation.status !== 'APPROVED') {
  throw new Error('ต้องอนุมัติใบเสนอราคาก่อนออกเอกสาร');
}

// ✅ ยอดรวมไม่เกิน
if (documentTotal > remainingAmount) {
  throw new Error(`ยอดเกินกว่าที่เหลือ: คงเหลือ ${remainingAmount} บาท`);
}

// ✅ มีรายการอย่างน้อย 1 รายการ
if (items.length === 0) {
  throw new Error('ต้องมีรายการอย่างน้อย 1 รายการ');
}
```

### 2. การบันทึกเอกสาร

```typescript
// ✅ ยอดรวมของรายการต้องตรงกับ grandTotal
const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0);
if (Math.abs(itemsTotal - grandTotal) > 0.01) {
  throw new Error(`ยอดรายการไม่ตรงกับยอดรวม: ${itemsTotal} ≠ ${grandTotal}`);
}

// ✅ ยอด Payment ต้องตรงกับ Receipt
if (receipt.grandTotal !== payment.amount) {
  throw new Error('ยอดการชำระเงินไม่ตรงกับใบเสร็จ');
}
```

### 3. การยกเลิกเอกสาร

```typescript
// ✅ ไม่สามารถยกเลิกเอกสารที่ถูกยกเลิกแล้ว
if (document.status === 'CANCELLED' || document.status === 'VOIDED') {
  throw new Error('เอกสารนี้ถูกยกเลิกแล้ว');
}

// ✅ ต้องระบุเหตุผล
if (!cancelReason || cancelReason.trim() === '') {
  throw new Error('กรุณาระบุเหตุผลในการยกเลิก');
}
```

---

## 🧪 Testing Checklist

### Unit Tests

- [ ] generateDocumentNumber() - ทุก type และเปลี่ยนเดือน
- [ ] validateInvoiceCreation() - ทุกกรณี error
- [ ] calculateRemainingAmount() - หลายใบ
- [ ] cancelQuotation() - cascade ถูกต้อง
- [ ] cancelInvoice() - cascade ถูกต้อง

### Integration Tests

- [ ] สร้าง Invoice → ยอดคงเหลือลดลง
- [ ] สร้าง Invoice หลายใบ → ยอดรวมไม่เกิน quotation
- [ ] สร้าง Receipt พร้อม Payment → บันทึกทั้ง 2 ตาราง
- [ ] ยกเลิก Quotation → Invoice, Receipt, Tax Invoice ยกเลิกหมด
- [ ] ยกเลิก Invoice → Receipt และ Tax Invoice ที่เชื่อมโยงยกเลิก

### E2E Tests

#### Scenario 1: Flow ปกติ - มัดจำ + ยอดคงเหลือ
```
1. สร้าง Quotation 100,000 บาท → อนุมัติ
2. ออกใบแจ้งหนี้มัดจำ 30,000 บาท
3. ออกใบเสร็จรับเงินมัดจำ 30,000 บาท + บันทึกการชำระ
4. ออกใบกำกับภาษีมัดจำ 30,000 บาท
5. ออกใบแจ้งหนี้ยอดคงเหลือ 70,000 บาท
6. ออกใบเสร็จรับเงินยอดคงเหลือ 70,000 บาท + บันทึกการชำระ
7. ออกใบกำกับภาษียอดคงเหลือ 70,000 บาท
✅ ตรวจสอบ: ยอดรวมทั้งหมด = 100,000 บาท
```

#### Scenario 2: ยกเลิก Quotation
```
1. มี Quotation พร้อม Invoice 2 ใบ, Receipt 2 ใบ, Tax Invoice 2 ใบ
2. ยกเลิก Quotation
✅ ตรวจสอบ: เอกสารทั้งหมดถูกยกเลิก
```

#### Scenario 3: ยกเลิก Invoice
```
1. มี Invoice พร้อม Receipt และ Tax Invoice
2. ยกเลิก Invoice
✅ ตรวจสอบ: Receipt และ Tax Invoice ยกเลิก แต่ Quotation ไม่ยกเลิก
```

#### Scenario 4: Running Number ข้ามเดือน
```
1. สร้าง Invoice เดือน ม.ค. → IVN2601-0001
2. เปลี่ยนวันที่เป็นเดือน ก.พ.
3. สร้าง Invoice ใหม่ → IVN2602-0001
✅ ตรวจสอบ: เลขรีเซ็ตเป็น 0001
```

#### Scenario 5: Validation ยอดเกิน
```
1. สร้าง Quotation 100,000 บาท
2. สร้าง Invoice 60,000 บาท (คงเหลือ 40,000)
3. พยายามสร้าง Invoice 50,000 บาท
❌ ตรวจสอบ: แสดง error "ยอดเกินกว่าที่เหลือ"
```

### Performance Tests

- [ ] สร้าง Invoice 100 รายการพร้อมกัน → Running number ไม่ซ้ำ
- [ ] Query รายการเอกสาร 1000 รายการ → < 1 วินาที
- [ ] Generate PDF → < 2 วินาที

---

## 📊 Database Indexes

```sql
-- เพิ่ม indexes สำหรับ query performance

-- Invoices
CREATE INDEX idx_invoice_quotation_status ON invoices(quotationId, status);
CREATE INDEX idx_invoice_date ON invoices(invoiceDate);

-- Receipts
CREATE INDEX idx_receipt_quotation_status ON receipts(quotationId, status);
CREATE INDEX idx_receipt_invoice_status ON receipts(invoiceId, status);
CREATE INDEX idx_receipt_date ON receipts(receiptDate);

-- Tax Invoices
CREATE INDEX idx_tax_invoice_quotation_status ON tax_invoices(quotationId, status);
CREATE INDEX idx_tax_invoice_invoice_status ON tax_invoices(invoiceId, status);
CREATE INDEX idx_tax_invoice_date ON tax_invoices(taxInvoiceDate);

-- Payments
CREATE INDEX idx_payment_date_method ON payments(paymentDate, paymentMethod);
```

---

## 🚨 Error Handling

### API Error Responses

```typescript
// 400 Bad Request
{
  "error": "ยอดเกินกว่าที่เหลือ: คงเหลือ 40,000 บาท"
}

// 403 Forbidden
{
  "error": "ต้องอนุมัติใบเสนอราคาก่อนออกเอกสาร"
}

// 404 Not Found
{
  "error": "ไม่พบใบเสนอราคา"
}

// 500 Internal Server Error
{
  "error": "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
}
```

---

## 📝 Notes & Best Practices

### 1. Transaction Management
- ใช้ Transaction สำหรับการสร้าง Receipt + Payment
- ใช้ Transaction สำหรับ Cascade Cancel

### 2. Logging
- Log ทุกการสร้าง/แก้ไข/ยกเลิกเอกสาร
- Log การ generate document number

### 3. Security
- ตรวจสอบ Permission ก่อนยกเลิกเอกสาร
- Validate input ทุกครั้ง

### 4. Performance
- ใช้ Index สำหรับ query ที่ใช้บ่อย
- Cache quotation info เมื่อสร้างเอกสาร

---

## 🎯 Success Criteria

เมื่อทำครบทุกขั้นตอนแล้ว ระบบควร:

- ✅ สร้าง Invoice, Receipt, Tax Invoice จาก Quotation ได้
- ✅ Running number ทำงานถูกต้องและไม่ซ้ำ
- ✅ Validation ยอดรวมทำงานถูกต้อง
- ✅ Cascade cancel ทำงานตามลำดับชั้น
- ✅ บันทึก Payment พร้อมกับ Receipt
- ✅ แสดง Watermark "ยกเลิก" ใน PDF
- ✅ UI/UX ใช้งานง่ายและชัดเจน
- ✅ Performance ดี (< 1 วินาที per request)
- ✅ ไม่มี bug ในการใช้งานจริง

---

**Last Updated:** 20 มกราคม 2026  
**Version:** 1.0  
**Author:** Development Team
