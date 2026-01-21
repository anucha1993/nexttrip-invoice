'use client';

/**
 * Payment Gateway Modal Component
 * แสดง QR Code สำหรับ PromptPay หรือ redirect สำหรับ Credit Card / Banking
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, CreditCard, QrCode, Building2, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BANK_CODES } from '@/lib/payment-gateway/types';

type PaymentMethod = 'PROMPTPAY' | 'CREDIT_CARD' | 'MOBILE_BANKING';
type PaymentStatus = 'idle' | 'loading' | 'waiting' | 'success' | 'failed' | 'expired';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transactionId: string) => void;
  amount: number;
  quotationId?: string;
  invoiceId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export function PaymentGatewayModal({
  isOpen,
  onClose,
  onSuccess,
  amount,
  quotationId,
  invoiceId,
  customerName,
  customerEmail,
  customerPhone,
}: PaymentGatewayModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('PROMPTPAY');
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setPaymentData(null);
      setError('');
      setCountdown(0);
    }
  }, [isOpen]);

  // Countdown timer for QR expiry
  useEffect(() => {
    if (status === 'waiting' && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setStatus('expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status, countdown]);

  // Poll payment status
  const pollPaymentStatus = useCallback(async (transactionId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // Poll for 5 minutes
    
    const poll = async () => {
      if (attempts >= maxAttempts) {
        setStatus('expired');
        return;
      }

      try {
        const res = await fetch(`/api/payment-gateway?transactionId=${transactionId}`);
        const data = await res.json();

        if (data.status === 'CONFIRMED') {
          setStatus('success');
          setTimeout(() => {
            onSuccess(transactionId);
          }, 2000);
          return;
        }

        if (data.status === 'CANCELLED') {
          setStatus('failed');
          setError('การชำระเงินถูกยกเลิก');
          return;
        }

        // Continue polling
        attempts++;
        setTimeout(poll, 5000); // Poll every 5 seconds
      } catch (err) {
        console.error('Error polling status:', err);
        attempts++;
        setTimeout(poll, 5000);
      }
    };

    poll();
  }, [onSuccess]);

  // Create payment
  const handleCreatePayment = async () => {
    setStatus('loading');
    setError('');

    try {
      const res = await fetch('/api/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          method: selectedMethod,
          quotationId,
          invoiceId,
          customerName,
          customerEmail,
          customerPhone,
          bankCode: selectedBank || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create payment');
      }

      setPaymentData(data);

      // Handle based on method
      if (selectedMethod === 'PROMPTPAY') {
        setStatus('waiting');
        // Set countdown from expiry
        if (data.expiresAt) {
          const expiresIn = Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000);
          setCountdown(Math.max(0, expiresIn));
        } else {
          setCountdown(900); // 15 minutes default
        }
        // Start polling
        pollPaymentStatus(data.transactionId);
      } else if (data.redirectUrl) {
        // Redirect to payment page
        window.location.href = data.redirectUrl;
      }

    } catch (err: any) {
      setStatus('failed');
      setError(err.message || 'เกิดข้อผิดพลาด');
    }
  };

  // Format countdown
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">ชำระเงินออนไลน์</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Amount */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500">ยอดชำระ</p>
            <p className="text-3xl font-bold text-blue-600">
              ฿{amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Status: Idle - Select Payment Method */}
          {status === 'idle' && (
            <>
              {/* Payment Methods */}
              <div className="space-y-3 mb-6">
                <p className="text-sm font-medium text-gray-700">เลือกวิธีชำระเงิน</p>
                
                {/* PromptPay */}
                <button
                  onClick={() => setSelectedMethod('PROMPTPAY')}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    selectedMethod === 'PROMPTPAY'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">พร้อมเพย์ (PromptPay)</p>
                    <p className="text-sm text-gray-500">สแกน QR Code ผ่านแอปธนาคาร</p>
                  </div>
                </button>

                {/* Credit Card */}
                <button
                  onClick={() => setSelectedMethod('CREDIT_CARD')}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    selectedMethod === 'CREDIT_CARD'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">บัตรเครดิต / เดบิต</p>
                    <p className="text-sm text-gray-500">Visa, Mastercard, JCB</p>
                  </div>
                </button>

                {/* Mobile Banking */}
                <button
                  onClick={() => setSelectedMethod('MOBILE_BANKING')}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    selectedMethod === 'MOBILE_BANKING'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">โมบายแบงก์กิ้ง</p>
                    <p className="text-sm text-gray-500">ชำระผ่านแอปธนาคาร</p>
                  </div>
                </button>
              </div>

              {/* Bank Selection for Mobile Banking */}
              {selectedMethod === 'MOBILE_BANKING' && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-3">เลือกธนาคาร</p>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(BANK_CODES).map(([key, bank]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedBank(bank.code)}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          selectedBank === bank.code
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="text-xs font-medium">{key}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Pay Button */}
              <Button
                onClick={handleCreatePayment}
                className="w-full py-3"
                disabled={selectedMethod === 'MOBILE_BANKING' && !selectedBank}
              >
                ดำเนินการชำระเงิน
              </Button>
            </>
          )}

          {/* Status: Loading */}
          {status === 'loading' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">กำลังสร้างรายการชำระเงิน...</p>
            </div>
          )}

          {/* Status: Waiting (QR Code) */}
          {status === 'waiting' && paymentData && (
            <div className="text-center">
              {/* QR Code */}
              <div className="bg-white p-4 rounded-xl border-2 border-blue-200 inline-block mb-4">
                <img
                  src={paymentData.qrCodeUrl}
                  alt="PromptPay QR Code"
                  className="w-64 h-64"
                />
              </div>

              {/* Countdown */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-gray-600">
                  หมดอายุใน <span className="font-mono font-bold text-orange-500">{formatCountdown(countdown)}</span>
                </span>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 rounded-xl p-4 text-left mb-4">
                <p className="font-medium text-blue-800 mb-2">วิธีชำระเงิน:</p>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>เปิดแอปธนาคารของคุณ</li>
                  <li>เลือกสแกน QR Code หรือ พร้อมเพย์</li>
                  <li>สแกน QR Code ด้านบน</li>
                  <li>ตรวจสอบยอดเงินและยืนยันการชำระ</li>
                </ol>
              </div>

              {/* Reference */}
              <p className="text-xs text-gray-400">
                Ref: {paymentData.reference}
              </p>

              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                รอรับการชำระเงิน...
              </div>
            </div>
          )}

          {/* Status: Success */}
          {status === 'success' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-green-600 mb-2">ชำระเงินสำเร็จ!</h3>
              <p className="text-gray-600">ระบบกำลังดำเนินการ...</p>
            </div>
          )}

          {/* Status: Failed */}
          {status === 'failed' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-12 h-12 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-red-600 mb-2">ชำระเงินไม่สำเร็จ</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => setStatus('idle')} variant="outline">
                ลองใหม่อีกครั้ง
              </Button>
            </div>
          )}

          {/* Status: Expired */}
          {status === 'expired' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-12 h-12 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-orange-600 mb-2">QR Code หมดอายุ</h3>
              <p className="text-gray-600 mb-4">กรุณาสร้างรายการชำระเงินใหม่</p>
              <Button onClick={() => setStatus('idle')}>
                สร้างรายการใหม่
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentGatewayModal;
