'use client';

/**
 * Public Payment Page
 * หน้าสำหรับลูกค้ากดลิงก์มาชำระเงิน - ไม่ต้อง login
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, QrCode, Building2, Loader2, CheckCircle, 
  XCircle, Clock, AlertCircle, Receipt, Calendar, User, FileText
} from 'lucide-react';
import { BANK_CODES } from '@/lib/payment-gateway/types';

type PaymentMethod = 'PROMPTPAY' | 'CREDIT_CARD' | 'MOBILE_BANKING';
type PaymentStatus = 'idle' | 'loading' | 'waiting' | 'success' | 'failed' | 'expired';

export default function PublicPaymentPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [linkData, setLinkData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('PROMPTPAY');
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    fetchPaymentLink();
  }, [token]);

  // Countdown timer
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

  const fetchPaymentLink = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/payment-links?token=${token}`);
      const data = await res.json();

      console.log('Payment Link Data:', data); // Debug

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่พบข้อมูล Payment Link');
      }

      if (data.link.status === 'EXPIRED') {
        setError('ลิงก์หมดอายุแล้ว');
      } else if (data.link.status === 'USED') {
        setError('ลิงก์นี้ถูกใช้งานแล้ว');
      } else {
        setLinkData(data);
        console.log('Quotation:', data.quotation); // Debug
        console.log('Customer Name:', data.quotation?.customerName); // Debug
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async () => {
    setStatus('loading');
    setError('');

    try {
      const res = await fetch('/api/payment-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: linkData.link.amount,
          method: selectedMethod,
          quotationId: linkData.link.quotationId,
          invoiceId: linkData.link.invoiceId,
          customerName: linkData.quotation?.customerName || linkData.invoice?.customerName || 'ลูกค้า',
          customerEmail: linkData.quotation?.customerEmail || linkData.invoice?.customerEmail || '',
          customerPhone: linkData.quotation?.customerPhone || linkData.invoice?.customerPhone || '',
          bankCode: selectedBank || undefined,
          paymentLinkToken: token,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถสร้างรายการชำระเงินได้');
      }

      setPaymentData(data);

      if (selectedMethod === 'PROMPTPAY') {
        setStatus('waiting');
        if (data.expiresAt) {
          const expiresIn = Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000);
          setCountdown(Math.max(0, expiresIn));
        } else {
          setCountdown(900);
        }
        pollPaymentStatus(data.transactionId);
      } else if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }

    } catch (err: any) {
      setStatus('failed');
      setError(err.message || 'เกิดข้อผิดพลาด');
    }
  };

  const pollPaymentStatus = async (transactionId: string) => {
    let attempts = 0;
    const maxAttempts = 60;
    
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
          return;
        }

        if (data.status === 'CANCELLED') {
          setStatus('failed');
          setError('การชำระเงินถูกยกเลิก');
          return;
        }

        attempts++;
        setTimeout(poll, 5000);
      } catch (err) {
        console.error('Error polling status:', err);
        attempts++;
        setTimeout(poll, 5000);
      }
    };

    poll();
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (error && !linkData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-red-600 mb-2">ไม่สามารถเปิดหน้านี้ได้</h3>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo/Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">ชำระเงิน</h1>
          <p className="text-gray-600">NextTrip Invoice System</p>
        </div>

        <Card className="mb-4">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center gap-3">
              <Receipt className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">รายละเอียดการชำระเงิน</h2>
                <p className="text-sm text-blue-100">กรุณาตรวจสอบข้อมูลก่อนชำระเงิน</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Customer Info */}
              {(linkData.quotation || linkData.invoice) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Receipt className="w-5 h-5 text-blue-500" />
                    <span className="font-medium text-gray-700">ข้อมูลการชำระเงิน</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    {(linkData.quotation?.customerName || linkData.invoice?.customerName) && (
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <span className="text-gray-500 block text-xs">ชื่อลูกค้า</span>
                          <span className="font-semibold text-gray-800">
                            {linkData.quotation?.customerName || linkData.invoice?.customerName}
                          </span>
                        </div>
                      </div>
                    )}
                    {linkData.invoice?.invoiceNumber && (
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <span className="text-gray-500 block text-xs">เลขที่ใบแจ้งหนี้</span>
                          <span className="font-semibold text-blue-600">
                            {linkData.invoice.invoiceNumber}
                          </span>
                        </div>
                      </div>
                    )}
                    {linkData.quotation?.tourName && (
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <span className="text-gray-500 block text-xs">แพ็คเกจทัวร์</span>
                          <span className="font-medium text-gray-700">
                            {linkData.quotation.tourName}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Amount */}
              <div className="text-center py-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                <p className="text-gray-600 mb-2">ยอดชำระ</p>
                <p className="text-5xl font-bold text-green-600">
                  ฿{parseFloat(linkData.link.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Description */}
              {linkData.link.description && (
                <div className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3">
                  <p className="font-medium text-gray-700 mb-1">หมายเหตุ:</p>
                  <p>{linkData.link.description}</p>
                </div>
              )}

              {/* Expires */}
              <div className="flex items-center justify-center gap-2 text-sm text-orange-600">
                <Clock className="w-4 h-4" />
                <span>ลิงก์หมดอายุ: {formatDate(linkData.link.expiresAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Selection */}
        {status === 'idle' && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">เลือกวิธีชำระเงิน</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* PromptPay */}
              <button
                onClick={() => setSelectedMethod('PROMPTPAY')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  selectedMethod === 'PROMPTPAY'
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow'
                }`}
              >
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                  <QrCode className="w-8 h-8 text-blue-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-lg">พร้อมเพย์ (PromptPay)</p>
                  <p className="text-sm text-gray-500">สแกน QR Code ผ่านแอปธนาคาร</p>
                  <p className="text-xs text-green-600 mt-1">✓ รวดเร็ว ไม่มีค่าธรรมเนียม</p>
                </div>
              </button>

              {/* Credit Card */}
              <button
                onClick={() => setSelectedMethod('CREDIT_CARD')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  selectedMethod === 'CREDIT_CARD'
                    ? 'border-purple-500 bg-purple-50 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow'
                }`}
              >
                <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-purple-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-lg">บัตรเครดิต / เดบิต</p>
                  <p className="text-sm text-gray-500">Visa, Mastercard, JCB, UnionPay</p>
                  <p className="text-xs text-blue-600 mt-1">✓ ปลอดภัย มีระบบ 3D Secure</p>
                </div>
              </button>

              {/* Mobile Banking */}
              <button
                onClick={() => setSelectedMethod('MOBILE_BANKING')}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  selectedMethod === 'MOBILE_BANKING'
                    ? 'border-green-500 bg-green-50 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow'
                }`}
              >
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-green-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-lg">โมบายแบงก์กิ้ง</p>
                  <p className="text-sm text-gray-500">ชำระผ่านแอปธนาคาร</p>
                  <p className="text-xs text-green-600 mt-1">✓ สะดวก รวดเร็ว</p>
                </div>
              </button>

              {/* Bank Selection */}
              {selectedMethod === 'MOBILE_BANKING' && (
                <div className="pt-2">
                  <p className="text-sm font-medium text-gray-700 mb-3">เลือกธนาคาร</p>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(BANK_CODES).map(([key, bank]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedBank(bank.code)}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          selectedBank === bank.code
                            ? 'border-blue-500 bg-blue-50 shadow'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-semibold text-sm">{key}</p>
                        <p className="text-xs text-gray-500 mt-1">{bank.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Pay Button */}
              <Button
                onClick={handleCreatePayment}
                className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={selectedMethod === 'MOBILE_BANKING' && !selectedBank}
              >
                ดำเนินการชำระเงิน ฿{parseFloat(linkData.link.amount).toLocaleString()}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {status === 'loading' && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">กำลังสร้างรายการชำระเงิน...</p>
            </CardContent>
          </Card>
        )}

        {/* Waiting (QR Code) */}
        {status === 'waiting' && paymentData && (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="bg-white p-6 rounded-2xl border-4 border-blue-200 inline-block mb-4">
                <img
                  src={paymentData.qrCodeUrl}
                  alt="PromptPay QR Code"
                  className="w-80 h-80"
                />
              </div>

              <div className="flex items-center justify-center gap-2 mb-6">
                <Clock className="w-5 h-5 text-orange-500" />
                <span className="text-lg text-gray-600">
                  หมดอายุใน <span className="font-mono font-bold text-2xl text-orange-500">{formatCountdown(countdown)}</span>
                </span>
              </div>

              <div className="bg-blue-50 rounded-xl p-6 text-left mb-4 max-w-md mx-auto">
                <p className="font-semibold text-blue-800 mb-3 text-center">วิธีชำระเงิน:</p>
                <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
                  <li>เปิดแอปธนาคารของคุณ</li>
                  <li>เลือกสแกน QR Code หรือ พร้อมเพย์</li>
                  <li>สแกน QR Code ด้านบน</li>
                  <li>ตรวจสอบยอดเงินและยืนยันการชำระ</li>
                </ol>
              </div>

              <div className="flex items-center justify-center gap-2 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                รอรับการชำระเงิน...
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success */}
        {status === 'success' && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-green-600 mb-3">ชำระเงินสำเร็จ!</h3>
              <p className="text-gray-600 mb-6">ขอบคุณสำหรับการชำระเงิน</p>
              <div className="bg-green-50 rounded-xl p-4 text-sm text-gray-600">
                <p>ระบบได้บันทึกการชำระเงินของคุณเรียบร้อยแล้ว</p>
                <p>เราจะติดต่อกลับในเร็วๆ นี้</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Failed */}
        {status === 'failed' && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-16 h-16 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-red-600 mb-3">ชำระเงินไม่สำเร็จ</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={() => setStatus('idle')} variant="outline">
                ลองใหม่อีกครั้ง
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Expired */}
        {status === 'expired' && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-16 h-16 text-orange-500" />
              </div>
              <h3 className="text-2xl font-bold text-orange-600 mb-3">QR Code หมดอายุ</h3>
              <p className="text-gray-600 mb-6">กรุณาสร้างรายการชำระเงินใหม่</p>
              <Button onClick={() => setStatus('idle')}>
                สร้างรายการใหม่
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
