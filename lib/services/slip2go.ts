// lib/services/slip2go.ts
// Service สำหรับเรียก Slip2Go API (ตรวจสอบสลิปโอนเงิน)
// อ้างอิงสเปก: https://connect.slip2go.com/api/verify-slip/qr-image/info

import { CompanySettingService } from './company-setting';

export type Slip2goAmountCheckType = 'eq' | 'gte' | 'lte';

export interface Slip2goVerifyOptions {
  amount?: number;
  amountType?: Slip2goAmountCheckType;
  checkDuplicate?: boolean;
  receiverAccountName?: string;
  receiverAccountNumber?: string;
  receiverAccountType?: string; // เช่น "01014" (SCB), "02001" (PromptPay)
}

export interface Slip2goReceiver {
  displayName?: string;
  name?: string;
  account?: { value?: string };
  bank?: { id?: string; name?: string };
}

export interface Slip2goData {
  referenceId?: string;
  transRef?: string;
  decode?: string;
  dateTime?: string;
  amount?: number;
  ref1?: string | null;
  ref2?: string | null;
  ref3?: string | null;
  sender?: Slip2goReceiver;
  receiver?: Slip2goReceiver;
  [k: string]: unknown;
}

export interface Slip2goResponse {
  code: string;
  message: string;
  data?: Slip2goData;
}

export interface Slip2goConfig {
  apiUrl: string;
  secretKey: string;
  checkDuplicate: boolean;
  enabled: boolean;
}

export class Slip2goService {
  private apiUrl: string;
  private secretKey: string;
  private checkDuplicateDefault: boolean;

  constructor(config: { apiUrl: string; secretKey: string; checkDuplicate?: boolean }) {
    this.apiUrl = (config.apiUrl || 'https://connect.slip2go.com').replace(/\/+$/, '');
    this.secretKey = config.secretKey || '';
    this.checkDuplicateDefault = config.checkDuplicate ?? true;
  }

  /** สร้าง service จากค่าใน company_settings */
  static async fromSettings(): Promise<Slip2goService> {
    const s = await CompanySettingService.getMany([
      'slip2go_api_url',
      'slip2go_secret_key',
      'slip2go_check_duplicate',
    ]);
    return new Slip2goService({
      apiUrl: s.slip2go_api_url || 'https://connect.slip2go.com',
      secretKey: s.slip2go_secret_key || '',
      checkDuplicate: (s.slip2go_check_duplicate || 'true') === 'true',
    });
  }

  static async loadConfig(): Promise<Slip2goConfig> {
    const s = await CompanySettingService.getMany([
      'slip2go_api_url',
      'slip2go_secret_key',
      'slip2go_check_duplicate',
      'slip2go_enabled',
    ]);
    return {
      apiUrl: s.slip2go_api_url || 'https://connect.slip2go.com',
      secretKey: s.slip2go_secret_key || '',
      checkDuplicate: (s.slip2go_check_duplicate || 'true') === 'true',
      enabled: (s.slip2go_enabled || 'false') === 'true',
    };
  }

  get isConfigured(): boolean {
    return this.secretKey.length > 0;
  }

  /**
   * ตรวจสอบสลิปด้วยรูปภาพ
   * @param file รูปสลิป (File / Blob จาก formData)
   * @param filename ชื่อไฟล์ (ต้องมีนามสกุล .png/.jpg/.jpeg)
   */
  async verifyByImage(
    file: Blob,
    filename: string,
    opts: Slip2goVerifyOptions = {}
  ): Promise<Slip2goResponse> {
    if (!this.isConfigured) {
      return { code: 'error', message: 'Slip2Go API ยังไม่ได้ตั้งค่า Secret Key' };
    }

    const payload: Record<string, unknown> = {};
    const useDuplicate = opts.checkDuplicate ?? this.checkDuplicateDefault;
    if (useDuplicate) payload.checkDuplicate = true;

    if (opts.receiverAccountName || opts.receiverAccountNumber || opts.receiverAccountType) {
      const receiver: Record<string, string> = {};
      if (opts.receiverAccountType) receiver.accountType = opts.receiverAccountType;
      if (opts.receiverAccountName) receiver.accountNameTH = opts.receiverAccountName;
      if (opts.receiverAccountNumber)
        receiver.accountNumber = opts.receiverAccountNumber.replace(/[-\s]/g, '');
      payload.checkReceiver = [receiver];
    }

    if (opts.amount && opts.amount > 0) {
      payload.checkAmount = {
        type: opts.amountType ?? 'eq',
        amount: String(Math.trunc(opts.amount)),
      };
    }

    const form = new FormData();
    form.append('file', file, filename);
    if (Object.keys(payload).length > 0) {
      form.append('payload', JSON.stringify(payload));
    }

    try {
      const res = await fetch(`${this.apiUrl}/api/verify-slip/qr-image/info`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.secretKey}` },
        body: form,
      });
      const json = (await res.json()) as Slip2goResponse;
      return json;
    } catch (err) {
      return {
        code: 'error',
        message: `เชื่อมต่อ Slip2Go ไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /** ทดสอบการเชื่อมต่อ + credit คงเหลือ */
  async getAccountInfo(): Promise<Slip2goResponse> {
    if (!this.isConfigured) {
      return { code: 'error', message: 'Slip2Go API ยังไม่ได้ตั้งค่า Secret Key' };
    }
    try {
      const res = await fetch(`${this.apiUrl}/api/account/info`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      });
      return (await res.json()) as Slip2goResponse;
    } catch (err) {
      return {
        code: 'error',
        message: `เชื่อมต่อ Slip2Go ไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}
