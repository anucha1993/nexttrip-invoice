/**
 * Payment Gateway Types
 * รองรับ: PromptPay, Credit Card, Mobile Banking
 */

export type PaymentProvider = 'OMISE' | 'STRIPE' | 'SCBPAY' | 'KBANK' | '2C2P';
export type PaymentMethod = 'PROMPTPAY' | 'CREDIT_CARD' | 'MOBILE_BANKING' | 'INTERNET_BANKING';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESSFUL' | 'FAILED' | 'EXPIRED' | 'CANCELLED';

export interface PaymentConfig {
  provider: PaymentProvider;
  publicKey: string;
  secretKey: string;
  webhookSecret?: string;
  sandbox: boolean;
}

export interface CreatePaymentRequest {
  amount: number;
  currency: 'THB' | 'USD';
  method: PaymentMethod;
  description: string;
  returnUrl: string;
  webhookUrl: string;
  metadata?: {
    quotationId?: string;
    invoiceId?: string;
    customerId?: string;
    transactionId?: string;
  };
  customer?: {
    name: string;
    email: string;
    phone?: string;
  };
}

export interface PaymentResponse {
  success: boolean;
  paymentId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  method: PaymentMethod;
  // สำหรับ PromptPay
  qrCodeUrl?: string;
  qrCodeData?: string;
  // สำหรับ Credit Card
  authorizeUrl?: string;
  // สำหรับ Internet/Mobile Banking
  bankRedirectUrl?: string;
  // ข้อมูลเพิ่มเติม
  expiresAt?: string;
  reference?: string;
  chargeId?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface WebhookPayload {
  event: 'charge.complete' | 'charge.failed' | 'charge.expired';
  data: {
    id: string;
    status: PaymentStatus;
    amount: number;
    currency: string;
    metadata: Record<string, any>;
    paidAt?: string;
    failedAt?: string;
    failureCode?: string;
    failureMessage?: string;
  };
}

export interface PaymentVerifyResult {
  verified: boolean;
  status: PaymentStatus;
  paymentId: string;
  amount: number;
  paidAt?: string;
  error?: string;
}

// Bank codes สำหรับ Internet Banking / Mobile Banking
export const BANK_CODES = {
  SCB: { name: 'ธนาคารไทยพาณิชย์', code: 'scb' },
  KBANK: { name: 'ธนาคารกสิกรไทย', code: 'kbank' },
  BBL: { name: 'ธนาคารกรุงเทพ', code: 'bbl' },
  KTB: { name: 'ธนาคารกรุงไทย', code: 'ktb' },
  BAY: { name: 'ธนาคารกรุงศรีอยุธยา', code: 'bay' },
  TMB: { name: 'ธนาคารทหารไทยธนชาต', code: 'ttb' },
} as const;
