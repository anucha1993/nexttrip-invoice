'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QuotationForm, QuotationFormProps } from '@/components/quotations/quotation-form';

export default function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState<QuotationFormProps['initialData'] | null>(null);

  const fetchQuotation = useCallback(async () => {
    try {
      const response = await fetch(`/api/quotations/${resolvedParams.id}`);
      console.log('Edit page - Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        // console.log('Edit page - Data received:', data);
        setInitialData({
          quotationNumber: data.quotationNumber,
          customerId: data.customerId,
          customerName: data.customerName,
          customerCode: data.customerCode,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail,
          customerTaxId: data.customerTaxId,
          customerAddress: data.customerAddress,
          tourName: data.tourName,
          bookingCode: data.bookingCode,
          ntCode: data.ntCode, 
          customTourCode: data.customTourCode,
          countryId: data.countryId,
          airlineId: data.airlineId,
          wholesaleId: data.wholesaleId,
          departureDate: data.departureDate,
          returnDate: data.returnDate,
          numDays: data.numDays,
          paxCount: data.paxCount,
          saleId: data.saleId,
          bookingDate: data.bookingDate,
          quotationDate: data.quotationDate,
          validUntil: data.validUntil,
          depositDueDate: data.depositDueDate,
          depositAmount: data.depositAmount,
          depositExtra: data.depositExtra,
          depositTotal: data.depositTotal,
          fullPaymentDueDate: data.fullPaymentDueDate,
          fullPaymentAmount: data.fullPaymentAmount,
          paymentType: data.paymentType,
          notes: data.notes,
          hasWithholdingTax: data.hasWithholdingTax,
          vatMode: data.vatMode,
          noCost: data.noCost,
          status: data.status,
          paymentStatus: data.paymentStatus,
          items: data.items,
        });
      } else {
        // console.error('Edit page - Response not OK:', response.status, await response.text());
        router.push('/quotations');
      }
    } catch (error) {
      console.error('Error fetching quotation:', error);
      router.push('/quotations');
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id, router]);

  useEffect(() => {
    fetchQuotation();
  }, [fetchQuotation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">กำลังโหลดข้อมูล...</span>
      </div>
    );
  }

  if (!initialData) {
    return null;
  }

  return (
    <QuotationForm 
      mode="edit" 
      quotationId={resolvedParams.id} 
      initialData={initialData} 
    />
  );
}
