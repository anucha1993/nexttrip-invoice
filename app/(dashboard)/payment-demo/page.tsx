'use client';

/**
 * Payment Gateway Demo Page
 * หน้าทดสอบการชำระเงินผ่าน Payment Gateway
 */

import React, { useState } from 'react';
import { PaymentGatewayModal } from '@/components/payment/payment-gateway-modal';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { CreditCard, CheckCircle } from 'lucide-react';

export default function PaymentDemoPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paidTransactionId, setPaidTransactionId] = useState<string | null>(null);
  const [testAmount, setTestAmount] = useState(1000);

  const handlePaymentSuccess = (transactionId: string) => {
    setIsModalOpen(false);
    setPaidTransactionId(transactionId);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Payment Gateway Demo</h1>
                <p className="text-sm text-gray-500">ทดสอบการชำระเงินออนไลน์</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Test Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ยอดทดสอบ (บาท)
              </label>
              <input
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(Number(e.target.value))}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min={1}
              />
            </div>

            {/* Payment Methods Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-medium mb-3">รองรับวิธีชำระเงิน:</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  พร้อมเพย์ (PromptPay) - สแกน QR Code
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  บัตรเครดิต/เดบิต - Visa, Mastercard, JCB
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  โมบายแบงก์กิ้ง - SCB, KBank, BBL, KTB, BAY
                </li>
              </ul>
            </div>

            {/* Pay Button */}
            <Button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-4 text-lg"
              size="lg"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              ชำระเงิน ฿{testAmount.toLocaleString()}
            </Button>

            {/* Success Message */}
            {paidTransactionId && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">ชำระเงินสำเร็จ!</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Transaction ID: {paidTransactionId}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Technical Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>นี่คือ Mock Implementation สำหรับทดสอบ</p>
          <p>ในการใช้งานจริง ให้เปลี่ยน API keys ใน environment variables</p>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentGatewayModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handlePaymentSuccess}
        amount={testAmount}
        customerName="ลูกค้าทดสอบ"
        customerEmail="test@example.com"
        customerPhone="0812345678"
      />
    </div>
  );
}
