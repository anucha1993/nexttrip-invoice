/**
 * Payment Gateway Service - Mock Implementation
 * ใช้เป็นแนวทางในการ integrate กับ payment gateway จริง
 * 
 * รองรับ Providers:
 * - Omise (Thai payment gateway)
 * - 2C2P
 * - SCB Payment Gateway
 * - Stripe (International)
 */

import {
  PaymentConfig,
  CreatePaymentRequest,
  PaymentResponse,
  PaymentVerifyResult,
  PaymentStatus,
  WebhookPayload,
} from './types';
import crypto from 'crypto';

// Default config (ควรอ่านจาก environment variables)
const DEFAULT_CONFIG: PaymentConfig = {
  provider: 'OMISE',
  publicKey: process.env.PAYMENT_PUBLIC_KEY || 'pkey_test_xxx',
  secretKey: process.env.PAYMENT_SECRET_KEY || 'skey_test_xxx',
  webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || 'whsec_xxx',
  sandbox: process.env.NODE_ENV !== 'production',
};

/**
 * สร้าง Payment ID แบบ mock
 */
function generatePaymentId(): string {
  return `PAY_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * สร้าง QR Code Data สำหรับ PromptPay (Mock)
 */
function generateMockQRData(amount: number): string {
  // ในการใช้งานจริง จะได้ QR data จาก payment gateway
  const mockAccountId = '0812345678';
  return `00020101021129370016A000000677010111011300668${mockAccountId}5303764540${amount.toFixed(2)}5802TH6304`;
}

/**
 * สร้าง Payment Request - PromptPay
 */
async function createPromptPayPayment(
  request: CreatePaymentRequest,
  config: PaymentConfig
): Promise<PaymentResponse> {
  const paymentId = generatePaymentId();
  
  // Mock: ในการใช้งานจริงจะ call API ของ payment gateway
  // เช่น Omise: POST https://api.omise.co/charges
  
  console.log('[Payment Gateway] Creating PromptPay payment:', {
    paymentId,
    amount: request.amount,
    metadata: request.metadata,
  });

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 นาที
  const qrCodeData = generateMockQRData(request.amount);
  
  return {
    success: true,
    paymentId,
    status: 'PENDING',
    amount: request.amount,
    currency: request.currency,
    method: 'PROMPTPAY',
    qrCodeData,
    qrCodeUrl: `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(qrCodeData)}`,
    expiresAt: expiresAt.toISOString(),
    reference: `REF${Date.now()}`,
  };
}

/**
 * สร้าง Payment Request - Credit Card
 */
async function createCreditCardPayment(
  request: CreatePaymentRequest,
  config: PaymentConfig
): Promise<PaymentResponse> {
  const paymentId = generatePaymentId();
  
  console.log('[Payment Gateway] Creating Credit Card payment:', {
    paymentId,
    amount: request.amount,
    metadata: request.metadata,
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  // Mock authorize URL - ในการใช้งานจริงจะได้จาก payment gateway
  const authorizeUrl = `${request.returnUrl}?payment_id=${paymentId}&mock=true`;

  return {
    success: true,
    paymentId,
    status: 'PENDING',
    amount: request.amount,
    currency: request.currency,
    method: 'CREDIT_CARD',
    authorizeUrl,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
}

/**
 * สร้าง Payment Request - Mobile/Internet Banking
 */
async function createBankingPayment(
  request: CreatePaymentRequest,
  config: PaymentConfig,
  bankCode?: string
): Promise<PaymentResponse> {
  const paymentId = generatePaymentId();
  
  console.log('[Payment Gateway] Creating Banking payment:', {
    paymentId,
    amount: request.amount,
    bankCode,
    metadata: request.metadata,
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  // Mock bank redirect URL
  const bankRedirectUrl = `${request.returnUrl}?payment_id=${paymentId}&bank=${bankCode}&mock=true`;

  return {
    success: true,
    paymentId,
    status: 'PENDING',
    amount: request.amount,
    currency: request.currency,
    method: request.method,
    bankRedirectUrl,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Main function: สร้าง Payment
 */
export async function createPayment(
  request: CreatePaymentRequest,
  config: PaymentConfig = DEFAULT_CONFIG
): Promise<PaymentResponse> {
  try {
    switch (request.method) {
      case 'PROMPTPAY':
        return await createPromptPayPayment(request, config);
      
      case 'CREDIT_CARD':
        return await createCreditCardPayment(request, config);
      
      case 'MOBILE_BANKING':
      case 'INTERNET_BANKING':
        return await createBankingPayment(request, config);
      
      default:
        return {
          success: false,
          paymentId: '',
          status: 'FAILED',
          amount: request.amount,
          currency: request.currency,
          method: request.method,
          error: {
            code: 'UNSUPPORTED_METHOD',
            message: `Payment method ${request.method} is not supported`,
          },
        };
    }
  } catch (error: any) {
    console.error('[Payment Gateway] Error creating payment:', error);
    return {
      success: false,
      paymentId: '',
      status: 'FAILED',
      amount: request.amount,
      currency: request.currency,
      method: request.method,
      error: {
        code: 'PAYMENT_ERROR',
        message: error.message || 'Failed to create payment',
      },
    };
  }
}

/**
 * ตรวจสอบสถานะ Payment
 */
export async function verifyPayment(
  paymentId: string,
  config: PaymentConfig = DEFAULT_CONFIG
): Promise<PaymentVerifyResult> {
  try {
    console.log('[Payment Gateway] Verifying payment:', paymentId);
    
    // Mock: ในการใช้งานจริงจะ call API เพื่อตรวจสอบสถานะ
    // เช่น Omise: GET https://api.omise.co/charges/{paymentId}
    
    await new Promise(resolve => setTimeout(resolve, 300));

    // Mock: สุ่มสถานะสำหรับ testing
    // ในการใช้งานจริงจะได้สถานะจาก API response
    const mockStatuses: PaymentStatus[] = ['PENDING', 'SUCCESSFUL', 'SUCCESSFUL'];
    const status = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];

    return {
      verified: true,
      status,
      paymentId,
      amount: 1000, // Mock amount
      paidAt: status === 'SUCCESSFUL' ? new Date().toISOString() : undefined,
    };
  } catch (error: any) {
    console.error('[Payment Gateway] Error verifying payment:', error);
    return {
      verified: false,
      status: 'FAILED',
      paymentId,
      amount: 0,
      error: error.message || 'Failed to verify payment',
    };
  }
}

/**
 * ยกเลิก Payment
 */
export async function cancelPayment(
  paymentId: string,
  config: PaymentConfig = DEFAULT_CONFIG
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Payment Gateway] Cancelling payment:', paymentId);
    
    // Mock: ในการใช้งานจริงจะ call API เพื่อยกเลิก
    await new Promise(resolve => setTimeout(resolve, 300));

    return { success: true };
  } catch (error: any) {
    console.error('[Payment Gateway] Error cancelling payment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify Webhook Signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  config: PaymentConfig = DEFAULT_CONFIG
): boolean {
  if (!config.webhookSecret) {
    console.warn('[Payment Gateway] No webhook secret configured');
    return false;
  }

  // Mock verification - ในการใช้งานจริงจะใช้ algorithm ของแต่ละ provider
  const expectedSignature = crypto
    .createHmac('sha256', config.webhookSecret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Parse Webhook Payload
 */
export function parseWebhookPayload(rawPayload: string): WebhookPayload {
  const data = JSON.parse(rawPayload);
  
  // Map from provider format to our format
  return {
    event: data.event || data.type,
    data: {
      id: data.data?.id || data.id,
      status: mapProviderStatus(data.data?.status || data.status),
      amount: data.data?.amount || data.amount,
      currency: data.data?.currency || data.currency,
      metadata: data.data?.metadata || data.metadata || {},
      paidAt: data.data?.paid_at,
      failedAt: data.data?.failed_at,
      failureCode: data.data?.failure_code,
      failureMessage: data.data?.failure_message,
    },
  };
}

/**
 * Map provider status to our status
 */
function mapProviderStatus(providerStatus: string): PaymentStatus {
  const statusMap: Record<string, PaymentStatus> = {
    // Omise statuses
    'pending': 'PENDING',
    'successful': 'SUCCESSFUL',
    'failed': 'FAILED',
    'expired': 'EXPIRED',
    // Stripe statuses
    'succeeded': 'SUCCESSFUL',
    'canceled': 'CANCELLED',
    'processing': 'PROCESSING',
  };
  
  return statusMap[providerStatus?.toLowerCase()] || 'PENDING';
}

// Export types
export * from './types';
