// lib/services/company-setting.ts
// Helper สำหรับอ่าน/เขียน company_settings (key/value store)

import { prisma } from '@/lib/prisma';

export class CompanySettingService {
  /** อ่านค่าเดี่ยว */
  static async get(key: string, defaultValue = ''): Promise<string> {
    const row = await prisma.companySetting.findUnique({ where: { key } });
    return row?.value ?? defaultValue;
  }

  /** อ่านหลายคีย์พร้อมกัน */
  static async getMany(keys: string[]): Promise<Record<string, string>> {
    const rows = await prisma.companySetting.findMany({ where: { key: { in: keys } } });
    const map: Record<string, string> = {};
    for (const k of keys) map[k] = '';
    for (const r of rows) map[r.key] = r.value;
    return map;
  }

  /** อ่านตามพรีฟิกซ์ */
  static async getByPrefix(prefix: string): Promise<Record<string, string>> {
    const rows = await prisma.companySetting.findMany({
      where: { key: { startsWith: prefix } },
    });
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    return map;
  }

  /** เขียนค่าเดี่ยว (upsert) */
  static async set(key: string, value: string): Promise<void> {
    await prisma.companySetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  /** เขียนหลายค่าพร้อมกัน */
  static async setMany(map: Record<string, string>): Promise<void> {
    await prisma.$transaction(
      Object.entries(map).map(([key, value]) =>
        prisma.companySetting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        })
      )
    );
  }
}
