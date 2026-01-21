'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { 
  ArrowLeft, Save, FileText, User, Plane, Calendar, 
  Plus, Trash2, DollarSign, ChevronDown, ChevronUp, UserPlus, Edit, X
} from 'lucide-react';
import Link from 'next/link';
import { CustomerModal } from '@/components/customers/customer-modal';

interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  taxId: string | null;
  address: string | null;
  fax: string | null;
  contactName: string | null;
  contactPhone: string | null;
  notes: string | null;
  socialId: string | null;
  source: string | null;
  isActive: boolean;
}

interface Sale {
  id: number;
  name: string;
}

interface Wholesale {
  id: number;
  code: string;
  nameTh: string;
}

interface Airline {
  id: number;
  code: string;
  name: string;
}

interface Country {
  id: number;
  code: string;
  nameTh: string;
}

interface NumDay {
  id: number;
  total: number;
  name: string;
}

// Tour from DB2
interface Tour {
  id: number;
  tourCode: string;
  tourCode1: string | null;
  tourName: string;
  bookingCode?: string;
  ntCode?: string;
  customTourCode?: string;
  countryId: number | null;
  countryName: string | null;
  airlineId: number | null;
  airlineName: string | null;
  wholesaleId: number | null;
  wholesaleName: string | null;
  numDays: string | null;
  departureDate: string | null;
  returnDate: string | null;
  paxCount: number | null;
}

// Tour Period from DB2
interface TourPeriod {
  id: number;
  startDate: string;
  endDate: string;
  price1: number;
  price2: number;
  price3: number;
  price4: number;
}

interface Product {
  id: number;
  name: string;
  calculationType: 'INCOME' | 'DISCOUNT' | 'FREE';
  includePax: boolean;
}

interface QuotationItem {
  id?: string;
  productId: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  itemType: 'INCOME' | 'DISCOUNT' | 'FREE';
  vatType: 'NO_VAT' | 'VAT' | 'VAT_EXEMPT';
  hasWithholdingTax: boolean;
  sortOrder: number;
}

// Props for QuotationForm component
export interface QuotationFormProps {
  mode: 'create' | 'edit';
  quotationId?: string;
  initialData?: {
    quotationNumber?: string;
    customerId?: string;
    customerName?: string;
    customerCode?: string;
    customerPhone?: string | null;
    customerEmail?: string | null;
    customerTaxId?: string | null;
    customerAddress?: string | null;
    customerFax?: string | null;
    customerContactName?: string | null;
    customerContactPhone?: string | null;
    customerNotes?: string | null;
    tourName?: string;
    bookingCode?: string;
    ntCode?: string;
    customTourCode?: string;
    countryId?: number | null;
    airlineId?: number | null;
    wholesaleId?: number | null;
    departureDate?: string;
    returnDate?: string;
    numDays?: string;
    paxCount?: number;
    saleId?: number | null;
    bookingDate?: string;
    quotationDate?: string;
    validUntil?: string;
    depositDueDate?: string;
    depositAmount?: number;
    depositExtra?: number;
    depositTotal?: number;
    fullPaymentDueDate?: string;
    fullPaymentAmount?: number;
    paymentType?: 'deposit' | 'full';
    notes?: string;
    hasWithholdingTax?: boolean;
    vatMode?: 'INCLUDE' | 'EXCLUDE';
    noCost?: boolean;
    status?: string;
    paymentStatus?: string;
    items?: QuotationItem[];
  };
}

// Deposit rate options (เรทเงินมัดจำต่อคน)
const depositRateOptions = [
  0, 1000, 1500, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000,
  10000, 15000, 20000, 24000, 25000, 28000, 29000, 30000, 30500,
  34000, 35000, 35500, 36000, 38000, 40000, 45000, 50000, 70000, 80000, 100000
];

export function QuotationForm({ mode, quotationId, initialData }: QuotationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [quotationNumber, setQuotationNumber] = useState(initialData?.quotationNumber || '');

  // Master data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [wholesales, setWholesales] = useState<Wholesale[]>([]);
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tours, setTours] = useState<Tour[]>([]); // Tours from DB2
  const [numDays, setNumDays] = useState<NumDay[]>([]);

  // Customer search
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerModalMode, setCustomerModalMode] = useState<'create' | 'edit'>('create');

  // Tour search
  const [tourSearch, setTourSearch] = useState('');
  const [showTourDropdown, setShowTourDropdown] = useState(false);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [tourPeriods, setTourPeriods] = useState<TourPeriod[]>([]);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TourPeriod | null>(null);
  const [tourSearchLoading, setTourSearchLoading] = useState(false);
  const [isCustomTour, setIsCustomTour] = useState(false);
  const [isPaymentTypeManual, setIsPaymentTypeManual] = useState(false); // Track manual payment type selection

  // Computed: วันเดินทางควร disable เมื่อเลือกทัวร์จาก DB2 และยังไม่ได้ custom
  const isDateFieldsDisabled = selectedTour !== null && !isCustomTour;

  // Form data - initialize from initialData if in edit mode
  // console.log('=== QuotationForm Init ===');
  // console.log('initialData:', initialData);
  // console.log('initialData.noCost:', initialData?.noCost);
  // console.log('!!initialData?.noCost:', !!initialData?.noCost);
  
  const [formData, setFormData] = useState({
    customerId: initialData?.customerId || '',
    tourName: initialData?.tourName || '',
    bookingCode: initialData?.bookingCode || '',
    ntCode: initialData?.ntCode || '',
    customTourCode: initialData?.customTourCode || '',
    countryId: initialData?.countryId?.toString() || '',
    airlineId: initialData?.airlineId?.toString() || '',
    wholesaleId: initialData?.wholesaleId?.toString() || '',
    departureDate: initialData?.departureDate ? initialData.departureDate.split('T')[0] : '',
    returnDate: initialData?.returnDate ? initialData.returnDate.split('T')[0] : '',
    numDays: initialData?.numDays || '',
    paxCount: initialData?.paxCount || 1,
    saleId: initialData?.saleId?.toString() || '',
    bookingDate: initialData?.bookingDate ? initialData.bookingDate.split('T')[0] : new Date().toISOString().split('T')[0],
    quotationDate: initialData?.quotationDate ? initialData.quotationDate.split('T')[0] : new Date().toISOString().split('T')[0],
    validUntil: initialData?.validUntil ? initialData.validUntil.split('T')[0] : '',
    depositDueDate: initialData?.depositDueDate ? initialData.depositDueDate.split('T')[0] : '',
    depositAmount: initialData?.depositAmount || 0,
    depositExtra: initialData?.depositExtra || 0,
    depositTotal: initialData?.depositTotal || 0,
    fullPaymentDueDate: initialData?.fullPaymentDueDate ? initialData.fullPaymentDueDate.split('T')[0] : '',
    fullPaymentAmount: initialData?.fullPaymentAmount || 0,
    paymentType: initialData?.paymentType || 'deposit' as 'deposit' | 'full',
    notes: initialData?.notes || '',
    hasWithholdingTax: !!initialData?.hasWithholdingTax,
    vatMode: initialData?.vatMode || 'EXCLUDE' as 'INCLUDE' | 'EXCLUDE',
    noCost: !!initialData?.noCost,
    status: initialData?.status || 'NEW',
    paymentStatus: initialData?.paymentStatus || 'UNPAID',
  });

  // Items - initialize from initialData if in edit mode
  const [items, setItems] = useState<QuotationItem[]>(
    initialData?.items && initialData.items.length > 0 
      ? initialData.items.map((item, index) => ({ ...item, sortOrder: index }))
      : [{
          productId: null,
          productName: '',
          quantity: 1,
          unitPrice: 0,
          amount: 0,
          itemType: 'INCOME',
          vatType: 'NO_VAT',
          hasWithholdingTax: false,
          sortOrder: 0,
        }]
  );

  // Initialize customer from initialData if in edit mode
  useEffect(() => {
    if (mode === 'edit' && initialData?.customerId) {
      setCustomerSearch(initialData.customerName || '');
      setSelectedCustomer({
        id: initialData.customerId,
        code: initialData.customerCode || '',
        name: initialData.customerName || '',
        phone: initialData.customerPhone || null,
        email: initialData.customerEmail || null,
        taxId: initialData.customerTaxId || null,
        address: initialData.customerAddress || null,
        fax: initialData.customerFax || null,
        contactName: initialData.customerContactName || null,
        contactPhone: initialData.customerContactPhone || null,
        notes: initialData.customerNotes || null,
        socialId: initialData.customerSocialId || null,
        source: initialData.customerSource || null,
        isActive: initialData.customerIsActive ?? true,
      });
      // In edit mode, tour is custom (user can edit dates)
      setIsCustomTour(true);
      setTourSearch(initialData.tourName || '');
    }
  }, [mode, initialData]);

  // Fetch master data
  useEffect(() => {
    fetchMasterData();
  }, []);

  // Generate quotation number in create mode
  useEffect(() => {
    if (mode === 'create' && !quotationNumber) {
      const generateQuotationNumber = async () => {
        try {
          const res = await fetch('/api/quotations/generate-numbers?type=quotation');
          if (res.ok) {
            const data = await res.json();
            setQuotationNumber(data.quotationNumber);
          }
        } catch (error) {
          console.error('Error generating quotation number:', error);
        }
      };
      generateQuotationNumber();
    }
  }, [mode, quotationNumber]);

  const fetchMasterData = async () => {
    try {
      const [customersRes, salesRes, wholesalesRes, airlinesRes, countriesRes, productsRes, numDaysRes] = await Promise.all([
        fetch('/api/customers?limit=1000'),
        fetch('/api/sales'),
        fetch('/api/wholesales'),
        fetch('/api/airlines'),
        fetch('/api/countries'),
        fetch('/api/products?limit=1000'),
        fetch('/api/num-days'),
      ]);

      if (customersRes.ok) {
        const data = await customersRes.json();
        // Handle different response formats: array, {data: []}, {value: []}
        const customerList = Array.isArray(data) ? data : (data.data || data.value || []);
        setCustomers(customerList);
      }
      if (salesRes.ok) setSales(await salesRes.json());
      if (wholesalesRes.ok) setWholesales(await wholesalesRes.json());
      if (airlinesRes.ok) setAirlines(await airlinesRes.json());
      if (countriesRes.ok) setCountries(await countriesRes.json());
      if (productsRes.ok) {
        const data = await productsRes.json();
        const productList = data.data || [];
        setProducts(productList);
        
        // Set default product for first item: "ค่าทัวร์ผู้ใหญ่พักคู่"
        const defaultProduct = productList.find((p: Product) => 
          p.name.includes('ค่าทัวร์ผู้ใหญ่พักคู่') || p.name.includes('ผู้ใหญ่พักคู่')
        );
        if (defaultProduct) {
          setItems(prev => {
            const newItems = [...prev];
            if (newItems[0]) {
              newItems[0] = {
                ...newItems[0],
                productId: defaultProduct.id,
                productName: defaultProduct.name,
                itemType: defaultProduct.calculationType || 'INCOME',
              };
            }
            return newItems;
          });
        }
      }
      if (numDaysRes.ok) setNumDays(await numDaysRes.json());
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  // Fetch tours from DB2 when tour search changes
  useEffect(() => {
    const fetchTours = async () => {
      if (tourSearch.length >= 2) {
        setTourSearchLoading(true);
        try {
          const res = await fetch(`/api/db2/tours?search=${encodeURIComponent(tourSearch)}&limit=20`);
          if (res.ok) {
            setTours(await res.json());
          }
        } catch (error) {
          console.error('Error fetching tours:', error);
        } finally {
          setTourSearchLoading(false);
        }
      } else {
        setTours([]);
      }
    };

    const debounce = setTimeout(fetchTours, 300);
    return () => clearTimeout(debounce);
  }, [tourSearch]);

  // Select tour and auto-fill form data
  const handleSelectTour = async (tour: Tour) => {
    setSelectedTour(tour);
    // แสดง tourname อย่างเดียว (ไม่รวม code)
    setTourSearch(tour.tourName);
    setShowTourDropdown(false);
    setSelectedPeriod(null);
    setIsCustomTour(false); // Reset เมื่อเลือกทัวร์จาก DB2
    
    // Auto-fill form data from tour
    setFormData(prev => ({
      ...prev,
      tourName: tour.tourName, // เก็บแค่ชื่อทัวร์
      ntCode: tour.tourCode || '', // ดึง ntCode จาก tourCode ของ DB2
      customTourCode: tour.tourCode1 || '', // ดึง customTourCode จาก tourCode1
      countryId: tour.countryId?.toString() || '',
      airlineId: tour.airlineId?.toString() || '',
      wholesaleId: tour.wholesaleId?.toString() || '',
      numDays: tour.numDays || '',
      departureDate: '',
      returnDate: '',
      paxCount: tour.paxCount || 1,
    }));

    // Fetch periods for this tour
    try {
      const res = await fetch(`/api/db2/tours?tourId=${tour.id}`);
      if (res.ok) {
        const periods = await res.json();
        setTourPeriods(periods);
        setShowPeriodDropdown(periods.length > 0);
      }
    } catch (error) {
      console.error('Error fetching periods:', error);
      setTourPeriods([]);
    }
  };

  // Select period and fill price to first item
  const handleSelectPeriod = (period: TourPeriod) => {
    setSelectedPeriod(period);
    setShowPeriodDropdown(false);
    
    // Fill departure and return dates
    const startDate = period.startDate.split('T')[0];
    const endDate = period.endDate ? period.endDate.split('T')[0] : '';
    
    // Calculate numDays from period dates
    let calculatedNumDays = '';
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const matchingNumDay = numDays.find(nd => {
        const name = nd.name.toLowerCase();
        return name.includes(`${diffDays}วัน`) || name.includes(`${diffDays} วัน`);
      });
      if (matchingNumDay) {
        calculatedNumDays = matchingNumDay.id.toString();
      }
    }
    
    // Reset manual payment type selection เมื่อเลือก period ใหม่
    setIsPaymentTypeManual(false);
    
    setFormData(prev => ({
      ...prev,
      departureDate: startDate,
      returnDate: endDate,
      numDays: calculatedNumDays || prev.numDays,
      // Reset payment dates เพื่อให้คำนวณใหม่ตามวันเดินทาง
      depositDueDate: '',
      fullPaymentDueDate: '',
    }));

    // Find "ค่าทัวร์ผู้ใหญ่พักคู่" product and update first INCOME item with price1
    const adultTwinProduct = products.find(p => 
      p.name.includes('ค่าทัวร์ผู้ใหญ่พักคู่') || p.name.includes('ผู้ใหญ่พักคู่')
    );
    
    if (adultTwinProduct && period.price1 > 0) {
      setItems(prev => {
        const newItems = [...prev];
        // Find first INCOME item or first item
        const incomeIndex = newItems.findIndex(item => item.itemType === 'INCOME');
        const targetIndex = incomeIndex >= 0 ? incomeIndex : 0;
        
        if (newItems[targetIndex]) {
          newItems[targetIndex] = {
            ...newItems[targetIndex],
            productId: adultTwinProduct.id,
            productName: adultTwinProduct.name,
            unitPrice: period.price1,
            amount: newItems[targetIndex].quantity * period.price1,
          };
        }
        return newItems;
      });
    }
  };

  // Calculate dates when numDays or one date changes
  useEffect(() => {
    // If both dates are set, auto-select matching numDays
    if (formData.departureDate && formData.returnDate && !formData.numDays) {
      const start = new Date(formData.departureDate);
      const end = new Date(formData.returnDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const nights = diffDays - 1;
      const matchingNumDay = numDays.find(nd => {
        const name = nd.name.toLowerCase();
        return name.includes(`${diffDays}วัน`) && name.includes(`${nights}คืน`);
      });
      if (matchingNumDay) {
        setFormData(prev => ({ ...prev, numDays: matchingNumDay.id.toString() }));
      }
    }
    
    // If numDays is selected, calculate dates
    if (formData.numDays && numDays.length > 0) {
      const selectedNumDay = numDays.find(nd => nd.id.toString() === formData.numDays);
      if (selectedNumDay) {
        const totalDays = selectedNumDay.total;
        
        // Priority: If departureDate exists, always recalculate returnDate
        if (formData.departureDate) {
          const start = new Date(formData.departureDate);
          const end = new Date(start);
          end.setDate(end.getDate() + totalDays - 1);
          const calculatedReturnDate = end.toISOString().split('T')[0];
          
          // Only update if different to prevent infinite loop
          if (formData.returnDate !== calculatedReturnDate) {
            setFormData(prev => ({ ...prev, returnDate: calculatedReturnDate }));
          }
        } 
        // If only returnDate exists, calculate departureDate
        else if (formData.returnDate && !formData.departureDate) {
          const end = new Date(formData.returnDate);
          const start = new Date(end);
          start.setDate(start.getDate() - totalDays + 1);
          setFormData(prev => ({ ...prev, departureDate: start.toISOString().split('T')[0] }));
        }
      }
    }
  }, [formData.departureDate, formData.returnDate, formData.numDays, numDays]);

  // Calculate PAX count from items with includePax products
  useEffect(() => {
    let totalPax = 0;
    items.forEach(item => {
      if (item.productId) {
        const product = products.find(p => p.id === item.productId);
        if (product && product.includePax) {
          totalPax += item.quantity;
        }
      }
    });
    setFormData(prev => ({ ...prev, paxCount: totalPax || 1 }));
  }, [items, products]);

  // Track previous departure date to detect changes
  const prevDepartureDateRef = useRef(formData.departureDate);

  // Reset payment dates when departure date changes
  useEffect(() => {
    if (prevDepartureDateRef.current !== formData.departureDate && formData.departureDate) {
      // Departure date changed, reset payment dates to trigger recalculation
      setFormData(prev => ({
        ...prev,
        depositDueDate: '',
        fullPaymentDueDate: '',
      }));
    }
    prevDepartureDateRef.current = formData.departureDate;
  }, [formData.departureDate]);

  // Auto-calculate payment dates based on payment type and departure date
  useEffect(() => {
    // ใช้วันปัจจุบันเป็นฐาน (ตาม code เดิม)
    const getNextDay = () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    };

    // ถ้ามีวันเดินทาง ให้ตรวจสอบว่าควรเป็น deposit หรือ full (เฉพาะกรณีไม่ได้เลือกเอง)
    if (formData.departureDate && !isPaymentTypeManual) {
      const travelDate = new Date(formData.departureDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((travelDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // ถ้าเดินทางใน 30 วันหรือน้อยกว่า → auto-select ชำระเต็มจำนวน
      if (diffDays <= 30 && formData.paymentType === 'deposit') {
        setFormData(prev => ({ 
          ...prev, 
          paymentType: 'full',
          depositAmount: 0,
          depositExtra: 0,
          depositTotal: 0,
          fullPaymentDueDate: getNextDay()
        }));
        return;
      }
      
      // ถ้าเดินทางมากกว่า 30 วัน → auto-select เงินมัดจำ
      if (diffDays > 30 && formData.paymentType === 'full') {
        setFormData(prev => ({ 
          ...prev, 
          paymentType: 'deposit',
          depositAmount: 5000, // Default 5,000
          depositDueDate: getNextDay()
        }));
        return;
      }
    }

    if (formData.paymentType === 'deposit') {
      // Set deposit due date to next day from today if not set
      if (!formData.depositDueDate) {
        setFormData(prev => ({ 
          ...prev, 
          depositDueDate: getNextDay(),
          depositAmount: prev.depositAmount || 5000 // Default 5,000
        }));
      }

      // Calculate full payment due date based on departure date
      if (formData.departureDate) {
        const travelDate = new Date(formData.departureDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((travelDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        let fullPayDate: string;
        if (diffDays > 30) {
          // More than 30 days before travel: set to 30 days before travel
          const payDate = new Date(travelDate);
          payDate.setDate(payDate.getDate() - 30);
          fullPayDate = payDate.toISOString().split('T')[0];
        } else {
          // 30 days or less: set to next day from today
          fullPayDate = getNextDay();
        }
        
        if (formData.fullPaymentDueDate !== fullPayDate) {
          setFormData(prev => ({ ...prev, fullPaymentDueDate: fullPayDate }));
        }
      }
    } else if (formData.paymentType === 'full') {
      // Full payment: set date to next day from today if not set
      if (!formData.fullPaymentDueDate) {
        setFormData(prev => ({ ...prev, fullPaymentDueDate: getNextDay() }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.paymentType, formData.departureDate]);

  // Filter customers based on search
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch) ||
    c.code.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // Select customer
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, customerId: customer.id }));
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  // Handle customer save from modal
  const handleCustomerSave = (customer: Customer) => {
    if (customerModalMode === 'create') {
      // Add to list and select
      setCustomers(prev => [customer, ...prev]);
    } else {
      // Update in list
      setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
    }
    // Select the saved customer
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, customerId: customer.id }));
    setCustomerSearch(customer.name);
  };

  // Add item row
  const addItem = (itemType: 'INCOME' | 'DISCOUNT' = 'INCOME') => {
    setItems([
      ...items,
      {
        productId: null,
        productName: '',
        quantity: 1,
        unitPrice: 0,
        amount: 0,
        itemType: itemType,
        vatType: 'NO_VAT',
        hasWithholdingTax: false,
        sortOrder: items.length,
      },
    ]);
  };

  // Remove item row
  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Update item
  const updateItem = (index: number, field: keyof QuotationItem, value: string | number | boolean | null) => {
    setItems(items.map((item, i) => {
      if (i !== index) return item;
      
      const updated = { ...item, [field]: value };
      
      // Auto-fill product details
      if (field === 'productId' && value) {
        const product = products.find(p => p.id === Number(value));
        if (product) {
          updated.productName = product.name;
          updated.itemType = product.calculationType;
        }
      }

      // Calculate amount
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(value) : item.quantity;
        const price = field === 'unitPrice' ? Number(value) : item.unitPrice;
        updated.amount = qty * price;
      }

      return updated;
    }));
  };

  // Calculate totals - use useMemo for immediate calculation on render
  const totals = useMemo(() => {
    // ตาม logic จาก blade.php calculatePaymentCondition
    let sumTotalNonVat = 0;   // ยอดรวมยกเว้นภาษี (VAT Exempt)
    let sumTotalVat = 0;      // ราคาสุทธิสินค้าที่เสียภาษี (has VAT)
    let sumDiscount = 0;      // ส่วนลด
    let sum3Percent = 0;      // ยอดรวม 3% จากรายการที่ติ๊ก
    const vatRate = 0.07;

    items.forEach(item => {
      if (item.itemType === 'INCOME') {
        // คำนวณ rowTotal รวม 3% ถ้าติ๊ก hasWithholdingTax
        const amount = Number(item.amount) || 0;
        let rowTotal = amount;
        if (item.hasWithholdingTax) {
          const plus3 = amount * 0.03;
          sum3Percent += plus3;
          rowTotal = amount + plus3;
        }
        
        if (item.vatType === 'VAT') {
          sumTotalVat += rowTotal;
        } else {
          // VAT_EXEMPT หรือ NO_VAT ให้เป็น non-vat
          sumTotalNonVat += rowTotal;
        }
      } else if (item.itemType === 'DISCOUNT') {
        sumDiscount += Number(item.amount) || 0;
      }
    });

    // --- VAT Calculation ตาม blade.php ---
    let sumPreVat = 0;
    let sumVat = 0;
    let sumIncludeVat = 0;
    let grandTotal = 0;

    const listVatTotal = sumTotalVat; // ยอดรวมเฉพาะแถว vat

    if (listVatTotal === 0) {
      // ไม่มีรายการ vat เลย
      sumPreVat = 0;
      sumVat = 0;
      sumIncludeVat = 0;
      grandTotal = sumTotalNonVat - sumDiscount;
    } else {
      if (formData.vatMode === 'INCLUDE') {
        // VAT รวมอยู่ในยอดแล้ว
        const vatBase = listVatTotal - sumDiscount;
        sumPreVat = vatBase * 100 / 107;
        sumVat = sumPreVat * vatRate;
        sumIncludeVat = sumPreVat + sumVat;
        grandTotal = sumTotalNonVat + sumIncludeVat;
      } else {
        // VAT Exclude
        if (sumDiscount < listVatTotal) {
          sumPreVat = listVatTotal - sumDiscount;
          sumVat = sumPreVat * vatRate;
          sumIncludeVat = sumPreVat + sumVat;
          grandTotal = sumTotalNonVat + sumIncludeVat;
        } else {
          sumPreVat = 0;
          sumVat = 0;
          sumIncludeVat = 0;
          grandTotal = sumTotalNonVat;
        }
      }
    }

    // Withholding Tax 3% (calculated from Pre-VAT Amount)
    const withholdingTax = formData.hasWithholdingTax ? sumPreVat * 0.03 : 0;

    // Net payable after withholding tax
    const netPayable = grandTotal - withholdingTax;

    return {
      vatExemptAmount: sumTotalNonVat,
      preTaxAmount: sumTotalVat,
      noVatAmount: 0, // รวมใน sumTotalNonVat แล้ว
      discount: sumDiscount,
      sum3Percent, // ยอดรวม 3% จากรายการที่ติ๊ก
      preVatAmount: sumPreVat,
      vatAmount: sumVat,
      includeVatAmount: sumIncludeVat,
      grandTotal,
      withholdingTax,
      netPayable,
    };
  }, [items, formData.vatMode, formData.hasWithholdingTax]);

  // Recalculate deposit total when paxCount or depositAmount changes
  useEffect(() => {
    if (formData.paymentType === 'deposit') {
      const depositTotal = (formData.depositAmount * formData.paxCount) + formData.depositExtra;
      const fullPayment = totals.grandTotal - depositTotal;
      setFormData(prev => ({
        ...prev,
        depositTotal,
        fullPaymentAmount: fullPayment > 0 ? fullPayment : 0
      }));
    }
  }, [formData.paxCount, formData.depositAmount, formData.depositExtra, formData.paymentType, totals.grandTotal]);

  // Format number
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.customerId) newErrors.customerId = 'กรุณาเลือกลูกค้า';
    if (!formData.tourName) newErrors.tourName = 'กรุณากรอกชื่อแพ็คเกจทัวร์';
    if (!formData.countryId) newErrors.countryId = 'กรุณาเลือกประเทศ';
    if (!formData.airlineId) newErrors.airlineId = 'กรุณาเลือกสายการบิน';
    if (!formData.wholesaleId) newErrors.wholesaleId = 'กรุณาเลือกโฮลเซลล์';
    if (!formData.saleId) newErrors.saleId = 'กรุณาเลือกพนักงานขาย';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      // Auto-generate bookingCode only (ntCode comes from DB2 tour selection)
      let finalBookingCode = formData.bookingCode;
      
      if (mode === 'create' && !finalBookingCode) {
        try {
          const response = await fetch('/api/quotations/generate-numbers?type=bookingCode');
          if (response.ok) {
            const data = await response.json();
            finalBookingCode = data.bookingCode;
          }
        } catch (error) {
          console.error('Error generating booking code:', error);
        }
      }

      const payload = {
        ...formData,
        quotationNumber: quotationNumber,
        bookingCode: finalBookingCode,
        ntCode: formData.ntCode || null,
        customTourCode: formData.customTourCode || null,
        countryId: formData.countryId ? Number(formData.countryId) : null,
        airlineId: formData.airlineId ? Number(formData.airlineId) : null,
        wholesaleId: formData.wholesaleId ? Number(formData.wholesaleId) : null,
        saleId: formData.saleId ? Number(formData.saleId) : null,
        vatExemptAmount: totals.vatExemptAmount,
        preTaxAmount: totals.preTaxAmount,
        subtotal: totals.preTaxAmount + totals.vatExemptAmount + totals.noVatAmount,
        discountAmount: totals.discount,
        preVatAmount: totals.preVatAmount,
        vatAmount: totals.vatAmount,
        includeVatAmount: totals.includeVatAmount,
        grandTotal: totals.grandTotal,
        withholdingTax: totals.withholdingTax,
        netPayable: totals.netPayable,
        noCost: formData.noCost,
        createdById: 'system', // TODO: Get from auth
        items: items.filter(item => item.productName),
      };

      // Different API endpoint and method for create vs edit
      const url = mode === 'create' ? '/api/quotations' : `/api/quotations/${quotationId}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        const message = mode === 'create' 
          ? `สร้างใบเสนอราคา ${result.quotationNumber || ''} สำเร็จ!`
          : `บันทึกการแก้ไขใบเสนอราคา ${quotationNumber} สำเร็จ!`;
        
        setSuccessMessage(message);
        
        // Redirect after showing success message
        setTimeout(() => {
          if (mode === 'create') {
            router.push(`/quotations/${result.id}/dashboard`);
          } else {
            router.push(`/quotations/${quotationId}/dashboard`);
          }
        }, 1500);
      } else {
        const error = await response.json();
        console.error('API Error Response:', error);
        console.error('Response Status:', response.status);
        setErrors({ submit: error.error || `เกิดข้อผิดพลาดในการ${mode === 'create' ? 'สร้าง' : 'แก้ไข'}ใบเสนอราคา` });
      }
    } catch (error) {
      console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} quotation:`, error);
      setErrors({ submit: `เกิดข้อผิดพลาดในการ${mode === 'create' ? 'สร้าง' : 'แก้ไข'}ใบเสนอราคา` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/quotations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับ
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-blue-500">
            {mode === 'create' ? 'สร้างใบเสนอราคา' : 'แก้ไขใบเสนอราคา'}
          </h1>
          <p className="text-gray-600">
            {mode === 'create' ? 'กรอกข้อมูลใบเสนอราคาใหม่' : `แก้ไขใบเสนอราคา ${initialData?.quotationNumber || ''}`}
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{errors.submit}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Search */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    <User className="w-5 h-5" />
                    ค้นหาลูกค้า
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCustomerModalMode('create');
                      setShowCustomerModal(true);
                    }}
                    className="text-xs"
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    เพิ่มลูกค้าใหม่
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ค้นหาลูกค้า *
                  </label>
                  <Input
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="พิมพ์ชื่อ, เบอร์โทร, หรือรหัสลูกค้า..."
                    className={errors.customerId ? 'border-red-500' : ''}
                  />
                  {errors.customerId && <p className="text-red-500 text-sm mt-1">{errors.customerId}</p>}
                  
                  {showCustomerDropdown && customerSearch && (
                    <div className="absolute z-[100] w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.slice(0, 10).map(customer => (
                          <div
                            key={customer.id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleSelectCustomer(customer)}
                          >
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-gray-500">
                              {customer.code} {customer.phone && `• ${customer.phone}`}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-gray-500">ไม่พบลูกค้า</div>
                      )}
                    </div>
                  )}
                </div>

             
              </CardContent>
            </Card>

            {/* Tour Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 font-semibold">
                  <Plane className="w-5 h-5" />
                  ข้อมูลทัวร์
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tour Search from DB2 */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ค้นหาทัวร์จากระบบเดิม (DB2)
                  </label>
                  <Input  className="bg-green-100"
                    value={tourSearch}
                    onChange={(e) => {
                      setTourSearch(e.target.value);
                      setShowTourDropdown(true);
                      // Clear selection when typing
                      if (selectedTour && e.target.value !== selectedTour.tourName) {
                        setSelectedTour(null);
                      }
                    }}
                    onFocus={() => setShowTourDropdown(true)}
                    placeholder="พิมพ์ชื่อหรือรหัสทัวร์เพื่อค้นหา..."
                  />
                  
                  {tourSearchLoading && (
                    <div className="absolute z-[100] w-full mt-1 bg-white border rounded-lg shadow-lg p-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">กำลังค้นหา...</p>
                    </div>
                  )}
                  
                  {!tourSearchLoading && showTourDropdown && tours.length > 0 && (
                    <div className="absolute z-[100] w-full  bg-white border border-gray-300elect rounded-lg shadow-lg max-h-60 overflow-auto">
                      {tours.map(tour => (
                        <div
                          key={tour.id}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 border-gray-300"
                          onClick={() => handleSelectTour(tour)}
                        >
                          <div className="font-medium text-green-500">{tour.tourName}</div>
                          <div className="text-sm text-gray-500 flex flex-wrap gap-2">
                            <span>{tour.tourCode}</span>
                            {tour.tourCode1 && <span>• {tour.tourCode1}</span>}
                            {tour.numDays && <span>• {tour.numDays}</span>}
                            {tour.departureDate && (
                              <span>• เดินทาง {new Date(tour.departureDate).toLocaleDateString('th-TH')}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedTour && (
                  <div className="p-3 bg-blue-50 rounded-lg text-sm">
                    <p className="text-blue-700 font-medium">เลือกทัวร์: {selectedTour.tourName}</p>
                    <p className="text-gray-600">ข้อมูลถูกเติมอัตโนมัติจากระบบเดิม สามารถแก้ไขได้</p>
                  </div>
                )}

                {/* Period Selection */}
                {tourPeriods.length > 0 && (
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เลือกช่วงเดินทาง (Period)
                    </label>
                    <div 
                      className="border rounded-lg p-2 cursor-pointer bg-green-100 hover:bg-green-200"
                      onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                    >
                      {selectedPeriod ? (
                        <div>
                          <span className="font-medium text-green-700">
                            {new Date(selectedPeriod.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                            {selectedPeriod.endDate && ` - ${new Date(selectedPeriod.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                          </span>
                          <div className="text-sm text-gray-600">
                            ผู้ใหญ่พักคู่: {selectedPeriod.price1.toLocaleString()}฿ • ผู้ใหญ่พักเดี่ยว: {selectedPeriod.price2.toLocaleString()}฿ • เด็ก/ทารก: {selectedPeriod.price2.toLocaleString()}฿
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">-- เลือกช่วงเดินทาง --</span>
                      )}
                     
                    </div>
                    
                    {showPeriodDropdown && (
                      <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {tourPeriods.map(period => (
                          <div
                            key={period.id}
                            className="px-4 py-2 hover:bg-green-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => handleSelectPeriod(period)}
                          >
                            <div className="font-medium text-green-600">
                              {new Date(period.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                              {period.endDate && ` - ${new Date(period.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              ผู้ใหญ่พักคู่: {period.price1.toLocaleString()}฿ • ผู้ใหญ่พักเดี่ยว: {period.price2.toLocaleString()}฿ • เด็ก/ทารก: {period.price2.toLocaleString()}฿
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    ชื่อแพ็คเกจทัวร์ *
                    {selectedTour && !isCustomTour && formData.tourName && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        API
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomTour(true);
                            setSelectedPeriod(null);
                          }}
                          className="hover:bg-blue-200 rounded-full p-0.5"
                          title="ล้างเพื่อกำหนดเอง"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </label>
                  <Input
                    value={formData.tourName}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setFormData({ ...formData, tourName: newValue });
                      // ถ้ามี selectedTour และชื่อแตกต่างจากที่เลือก → เป็น custom tour
                      if (selectedTour && newValue !== selectedTour.tourName) {
                        setIsCustomTour(true);
                        // เคลียร์ period และ วันที่ เพื่อให้กรอกเอง
                        setSelectedPeriod(null);
                        setFormData(prev => ({ ...prev, tourName: newValue, departureDate: '', returnDate: '' }));
                      }
                    }}
                    placeholder="เช่น ทัวร์ญี่ปุ่น โตเกียว ฟูจิ 5 วัน"
                    className={errors.tourName ? 'border-red-500' : ''}
                  />
                  {errors.tourName && <p className="text-red-500 text-sm mt-1">{errors.tourName}</p>}
                </div>

                {/* รหัสทัวร์ 3 แบบ */}
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      รหัสจอง (BK) - Auto
                    </label>
                    <Input
                      value={formData.bookingCode}
                      onChange={(e) => setFormData({ ...formData, bookingCode: e.target.value })}
                      placeholder="BK260100001 (Auto)"
                      readOnly={mode === 'create'}
                      className="bg-gray-50 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">สร้างอัตโนมัติ</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      รหัส NextTrip (NT)
                    </label>
                    <Input
                      value={formData.ntCode}
                      readOnly
                      placeholder="จาก DB2"
                      className="bg-gray-50 font-mono text-sm cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">ดึงจากทัวร์ที่เลือก</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      รหัสทัวร์กำหนดเอง
                    </label>
                    <Input
                      value={formData.customTourCode}
                      readOnly
                      placeholder="จาก DB2"
                      className="bg-gray-50 font-mono text-sm cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">ดึงจากทัวร์ที่เลือก (ถ้ามี)</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ประเทศ <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      value={formData.countryId}
                      onChange={(value) => {
                        setFormData({ ...formData, countryId: value });
                        if (errors.countryId) setErrors({ ...errors, countryId: '' });
                      }}
                      placeholder="-- เลือกประเทศ --"
                      options={countries.map(country => ({
                        value: country.id.toString(),
                        label: country.nameTh,
                        subLabel: country.code
                      }))}
                    />
                    {errors.countryId && <p className="text-red-500 text-sm mt-1">{errors.countryId}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      โฮลเซลล์ <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      value={formData.wholesaleId}
                      onChange={(value) => {
                        setFormData({ ...formData, wholesaleId: value });
                        if (errors.wholesaleId) setErrors({ ...errors, wholesaleId: '' });
                      }}
                      placeholder="-- เลือกโฮลเซลล์ --"
                      options={wholesales.map(wholesale => ({
                        value: wholesale.id.toString(),
                        label: wholesale.nameTh,
                        subLabel: wholesale.code
                      }))}
                    />
                    {errors.wholesaleId && <p className="text-red-500 text-sm mt-1">{errors.wholesaleId}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      สายการบิน <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      value={formData.airlineId}
                      onChange={(value) => {
                        setFormData({ ...formData, airlineId: value });
                        if (errors.airlineId) setErrors({ ...errors, airlineId: '' });
                      }}
                      placeholder="-- เลือกสายการบิน --"
                      options={airlines.map(airline => ({
                        value: airline.id.toString(),
                        label: airline.name,
                        subLabel: airline.code
                      }))}
                    />
                    {errors.airlineId && <p className="text-red-500 text-sm mt-1">{errors.airlineId}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      พนักงานขาย <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      value={formData.saleId}
                      onChange={(value) => {
                        setFormData({ ...formData, saleId: value });
                        if (errors.saleId) setErrors({ ...errors, saleId: '' });
                      }}
                      placeholder="-- เลือกพนักงานขาย --"
                      options={sales.map(sale => ({
                        value: sale.id.toString(),
                        label: sale.name
                      }))}
                    />
                    {errors.saleId && <p className="text-red-500 text-sm mt-1">{errors.saleId}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      วันเดินทางไป
                      {isDateFieldsDisabled && formData.departureDate && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                          API
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomTour(true);
                              setSelectedPeriod(null);
                            }}
                            className="hover:bg-blue-200 rounded-full p-0.5"
                            title="ล้างเพื่อกำหนดเอง"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                    </label>
                    <Input
                      type="date"
                      value={formData.departureDate}
                      onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                      disabled={isDateFieldsDisabled}
                      className={isDateFieldsDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}
                      title={isDateFieldsDisabled ? 'เลือกจากช่วงเวลาเดินทาง หรือแก้ไขชื่อแพ็คเกจเพื่อกำหนดเอง' : ''}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      วันเดินทางกลับ
                      {isDateFieldsDisabled && formData.returnDate && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                          API
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomTour(true);
                              setSelectedPeriod(null);
                            }}
                            className="hover:bg-blue-200 rounded-full p-0.5"
                            title="ล้างเพื่อกำหนดเอง"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                    </label>
                    <Input
                      type="date"
                      value={formData.returnDate}
                      onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                      disabled={isDateFieldsDisabled}
                      className={isDateFieldsDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}
                      title={isDateFieldsDisabled ? 'เลือกจากช่วงเวลาเดินทาง หรือแก้ไขชื่อแพ็คเกจเพื่อกำหนดเอง' : ''}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      จำนวนวัน
                      {isDateFieldsDisabled && formData.numDays && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                          API
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomTour(true);
                              setSelectedPeriod(null);
                            }}
                            className="hover:bg-blue-200 rounded-full p-0.5"
                            title="ล้างเพื่อกำหนดเอง"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                    </label>
                    <SearchableSelect
                      value={formData.numDays}
                      onChange={(value) => setFormData({ ...formData, numDays: value })}
                      placeholder="-- เลือกจำนวนวัน --"
                      options={numDays.map(nd => ({
                        value: nd.id.toString(),
                        label: nd.name
                      }))}
                      disabled={isDateFieldsDisabled}
                    />
                  </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      จำนวนผู้เดินทาง (PAX)
                    </label>
                    <Input
                      type="number"
                      value={formData.paxCount}
                      readOnly
                      className="bg-gray-100 cursor-not-allowed"
                      title="คำนวณอัตโนมัติจากรายการสินค้าที่มี (PAX)"
                    />
                    <p className="text-xs text-gray-500 mt-1">คำนวณจากรายการสินค้า (PAX)</p>
                  </div>
                </div>

            
              </CardContent>
            </Card>

            {/* Items - รายได้ */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-green-600">
                    <DollarSign className="w-5 h-5" />
                    รายได้
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem('INCOME')}>
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่มรายการรายได้
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-visible">
                  <table className="w-full text-sm table-fixed">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 w-60">รายการ</th>
                        <th className="text-center py-2 px-2 w-10">3%</th>
                        <th className="text-center py-2 px-2 w-10">Vat</th>
                        <th className="text-center py-2 px-2 w-20">จำนวน</th>
                        <th className="text-right py-2 px-2 w-28">ราคา/หน่วย</th>
                        <th className="text-right py-2 px-2 w-28">รวม</th>
                        <th className="text-center py-2 px-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.filter(item => item.itemType === 'INCOME').map((item) => {
                        const index = items.indexOf(item);
                        return (
                          <tr key={index} className="border-b border-gray-200">
                            <td className="py-2 px-2 relative">
                              <SearchableSelect
                                value={item.productId?.toString() || ''}
                                onChange={(value) => updateItem(index, 'productId', value ? Number(value) : null)}
                                placeholder="-- เลือกรายการรายได้ --"
                                options={products
                                  .filter(p => p.calculationType === 'INCOME')
                                  .map(product => ({
                                    value: product.id.toString(),
                                    label: product.name,
                                    subLabel: product.includePax ? '(PAX)' : undefined
                                  }))}
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={item.hasWithholdingTax}
                                onChange={(e) => updateItem(index, 'hasWithholdingTax', e.target.checked)}
                                className="w-4 h-4 accent-blue-600"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={item.vatType === 'VAT'}
                                onChange={(e) => updateItem(index, 'vatType', e.target.checked ? 'VAT' : 'NO_VAT')}
                                className="w-4 h-4 accent-blue-600"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="text-center text-sm"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="text-right text-sm"
                              />
                            </td>
                            <td className="py-2 px-2 text-right font-medium">
                              {formatNumber(item.hasWithholdingTax ? item.amount * 1.03 : item.amount)}
                            </td>
                            <td className="py-2 px-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                disabled={items.filter(i => i.itemType === 'INCOME').length === 1}
                                className="text-red-600 hover:text-red-700 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Items - ส่วนลด */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-red-600">
                    <DollarSign className="w-5 h-5" />
                    ส่วนลด / ของแถม
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem('DISCOUNT')}>
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่มส่วนลด
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-visible">
                  <table className="w-full text-sm table-fixed">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 w-60">รายการ</th>
                        <th className="text-center py-2 px-2 w-10"></th>
                        <th className="text-center py-2 px-2 w-10"></th>
                        <th className="text-center py-2 px-2 w-20">จำนวน</th>
                        
                        <th className="text-right py-2 px-2 w-28">ราคา/หน่วย</th>
                        <th className="text-right py-2 px-2 w-28">รวม</th>
                        <th className="text-center py-2 px-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.filter(item => item.itemType === 'DISCOUNT' || item.itemType === 'FREE').map((item) => {
                        const index = items.indexOf(item);
                        return (
                          <tr key={index} className="border-b border-gray-200">
                            <td className="py-2 px-2 relative max-w-[0px]">
                              <SearchableSelect
                                value={item.productId?.toString() || ''}
                                onChange={(value) => updateItem(index, 'productId', value ? Number(value) : null)}
                                placeholder="-- เลือกส่วนลด/ของแถม --"
                                options={products
                                  .filter(p => p.calculationType === 'DISCOUNT' || p.calculationType === 'FREE')
                                  .map(product => ({
                                    value: product.id.toString(),
                                    label: product.name,
                                    subLabel: product.includePax ? '(PAX)' : undefined
                                  }))}
                              />
                            </td>
                            <td className='py-2 px-2'></td>
                            <td className='py-2 px-2'></td>
                            <td className="py-2 px-2">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="text-center text-sm"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="text-right text-sm"
                              />
                            </td>
                            <td className="py-2 px-2 text-right font-medium text-red-600">
                              -{formatNumber(item.amount)}
                            </td>
                            <td className="py-2 px-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                className="text-red-600 hover:text-red-700 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {items.filter(item => item.itemType === 'DISCOUNT' || item.itemType === 'FREE').length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-gray-400 text-sm">
                            ไม่มีส่วนลด
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 font-semibold">
                  <FileText className="w-5 h-5" />
                  หมายเหตุ
                </div>
              </CardHeader>
              <CardContent>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="หมายเหตุเพิ่มเติม..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* เลขที่ใบเสนอราคา และ รหัสทัวร์ */}
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      เลขที่ใบเสนอราคา
                      <span className="text-xs text-gray-400 ml-1">(Auto)</span>
                    </label>
                    <Input
                      value={quotationNumber}
                      readOnly
                      disabled
                      className="bg-gray-100 cursor-not-allowed font-mono text-sm"
                      placeholder="กำลังสร้าง..."
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="noCost"
                      checked={!!formData.noCost}
                      onChange={(e) => {
                        // console.log('=== noCost Debug ===');
                        // console.log('Checkbox clicked:', e.target.checked);
                        // console.log('Current formData.noCost:', formData.noCost);
                        setFormData(prev => {
                          const updated = { ...prev, noCost: e.target.checked };
                          // console.log('Updated formData.noCost:', updated.noCost);
                          return updated;
                        });
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="noCost" className="text-sm text-gray-700 cursor-pointer">
                      ByPass ไม่มีต้นทุน
                      <span className="ml-2 text-xs text-gray-400">
                        (Current: {String(formData.noCost)})
                      </span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            {selectedCustomer && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold">
                      <User className="w-5 h-5" />
                      ข้อมูลลูกค้า
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCustomerModalMode('edit');
                        setShowCustomerModal(true);
                      }}
                      className="text-xs"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      แก้ไข
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setShowCustomerDetails(!showCustomerDetails)}
                  >
                    <div>
                      <div className="font-medium text-gray-800">{selectedCustomer.name}</div>
                      <div className="text-sm text-gray-500">{selectedCustomer.code}</div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                      <span>{showCustomerDetails ? 'ซ่อน' : 'ดู'}</span>
                      {showCustomerDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                  
                  {showCustomerDetails && (
                    <div className="pt-3 border-t border-gray-200 space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">เบอร์โทร:</span>
                        <span className="ml-2">{selectedCustomer.phone || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">อีเมล:</span>
                        <span className="ml-2 break-all">{selectedCustomer.email || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">เลขผู้เสียภาษี:</span>
                        <span className="ml-2">{selectedCustomer.taxId || '-'}</span>
                      </div>
                      {selectedCustomer.fax && (
                        <div>
                          <span className="text-gray-500">แฟกซ์:</span>
                          <span className="ml-2">{selectedCustomer.fax}</span>
                        </div>
                      )}
                      {selectedCustomer.address && (
                        <div>
                          <span className="text-gray-500">ที่อยู่:</span>
                          <p className="mt-1 text-xs">{selectedCustomer.address}</p>
                        </div>
                      )}
                      {selectedCustomer.contactName && (
                        <div>
                          <span className="text-gray-500">ผู้ติดต่อ:</span>
                          <span className="ml-2">{selectedCustomer.contactName}</span>
                        </div>
                      )}
                      {selectedCustomer.contactPhone && (
                        <div>
                          <span className="text-gray-500">เบอร์ผู้ติดต่อ:</span>
                          <span className="ml-2">{selectedCustomer.contactPhone}</span>
                        </div>
                      )}
                      {selectedCustomer.notes && (
                        <div>
                          <span className="text-gray-500">หมายเหตุ:</span>
                          <p className="mt-1 text-xs">{selectedCustomer.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 font-semibold">
                  <Calendar className="w-5 h-5" />
                  เงื่อนไขการชำระเงิน
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      วันที่สั่งซื้อ/จอง
                    </label>
                    <Input
                      type="date"
                      value={formData.bookingDate}
                      onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      วันที่เสนอราคา
                    </label>
                    <Input
                      type="date"
                      value={formData.quotationDate}
                      onChange={(e) => setFormData({ ...formData, quotationDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Payment Type Radio */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentType"
                      value="deposit"
                      checked={formData.paymentType === 'deposit'}
                      onChange={() => {
                        setIsPaymentTypeManual(true);
                        setFormData({ ...formData, paymentType: 'deposit' });
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium">เงินมัดจำ</span>
                  </label>
                </div>

                {/* Deposit Section */}
                <div className={`space-y-3 p-3 rounded-lg ${formData.paymentType === 'deposit' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 opacity-60'}`}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ภายในวันที่
                    </label>
                    <Input
                      type="date"
                      value={formData.depositDueDate}
                      onChange={(e) => setFormData({ ...formData, depositDueDate: e.target.value })}
                      disabled={formData.paymentType !== 'deposit'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เรทเงินมัดจำ (ต่อคน)
                    </label>
                    <Select
                      value={formData.depositAmount.toString()}
                      onChange={(e) => {
                        const rate = parseFloat(e.target.value) || 0;
                        const total = (rate * formData.paxCount) + formData.depositExtra;
                        const fullPayment = totals.grandTotal - total;
                        setFormData({ 
                          ...formData, 
                          depositAmount: rate,
                          depositTotal: total,
                          fullPaymentAmount: fullPayment > 0 ? fullPayment : 0
                        });
                      }}
                      disabled={formData.paymentType !== 'deposit'}
                    >
                      {depositRateOptions.map(rate => (
                        <option key={rate} value={rate}>
                          {rate === 0 ? '0.00' : rate.toLocaleString()}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ชำระเพิ่มเติม
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.depositExtra || ''}
                      onChange={(e) => {
                        const extra = parseFloat(e.target.value) || 0;
                        const total = (formData.depositAmount * formData.paxCount) + extra;
                        const fullPayment = totals.grandTotal - total;
                        setFormData({ 
                          ...formData, 
                          depositExtra: extra,
                          depositTotal: total,
                          fullPaymentAmount: fullPayment > 0 ? fullPayment : 0
                        });
                      }}
                      placeholder="0.00"
                      disabled={formData.paymentType !== 'deposit'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      จำนวนเงินที่ต้องชำระ
                    </label>
                    <Input
                      type="text"
                      value={((formData.depositAmount * formData.paxCount) + formData.depositExtra).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      readOnly
                      className="bg-yellow-50 font-semibold text-orange-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">= (เรท {formData.depositAmount.toLocaleString()} × {formData.paxCount} PAX) + ชำระเพิ่ม {formData.depositExtra.toLocaleString()}</p>
                  </div>
                </div>

                {/* Full Payment Radio */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentType"
                      value="full"
                      checked={formData.paymentType === 'full'}
                      onChange={() => {
                        setIsPaymentTypeManual(true);
                        setFormData({ 
                          ...formData, 
                          paymentType: 'full',
                          depositAmount: 0,
                          depositExtra: 0,
                          depositTotal: 0,
                          fullPaymentAmount: totals.grandTotal
                        });
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium">ชำระเต็มจำนวน</span>
                  </label>
                </div>

                {/* Full Payment Section */}
                <div className={`space-y-3 p-3 rounded-lg ${formData.paymentType === 'full' ? 'bg-green-50 border border-green-200' : 'bg-gray-50 opacity-60'}`}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ภายในวันที่
                    </label>
                    <Input
                      type="date"
                      value={formData.fullPaymentDueDate}
                      onChange={(e) => setFormData({ ...formData, fullPaymentDueDate: e.target.value })}
                      disabled={formData.paymentType !== 'full'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      จำนวนเงิน
                    </label>
                    <Input
                      type="text"
                      value={formData.paymentType === 'full' 
                        ? totals.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })
                        : (totals.grandTotal - ((formData.depositAmount * formData.paxCount) + formData.depositExtra)).toLocaleString('th-TH', { minimumFractionDigits: 2 })
                      }
                      readOnly
                      className={formData.paymentType === 'full' ? 'bg-green-100 font-semibold text-green-700' : 'bg-gray-100'}
                    />
                    {formData.paymentType === 'deposit' && (
                      <p className="text-xs text-gray-500 mt-1">ยอดคงเหลือหลังหักมัดจำ</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* VAT Mode */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 font-semibold">
                  <DollarSign className="w-5 h-5" />
                  การคำนวณ VAT
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="vatMode"
                      checked={formData.vatMode === 'INCLUDE'}
                      onChange={() => setFormData({ ...formData, vatMode: 'INCLUDE' })}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm">VAT Include</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="vatMode"
                      checked={formData.vatMode === 'EXCLUDE'}
                      onChange={() => setFormData({ ...formData, vatMode: 'EXCLUDE' })}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm">VAT Exclude</span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasWithholdingTax"
                    checked={formData.hasWithholdingTax}
                    onChange={(e) => setFormData({ ...formData, hasWithholdingTax: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="hasWithholdingTax" className="text-sm text-gray-700">
                    หักภาษี ณ ที่จ่าย 3%
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 font-semibold">
                  <DollarSign className="w-5 h-5" />
                  สรุปยอด
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">ยอดรวมยกเว้นภาษี / Vat-Exempted Amount</span>
                  <span>{formatNumber(totals.vatExemptAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">ราคาสุทธิสินค้าที่เสียภาษี / Pre-Tax Amount</span>
                  <span>{formatNumber(totals.preTaxAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">ส่วนลด / Discount</span>
                  <span className="text-red-600">-{formatNumber(totals.discount)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-gray-600">ราคาก่อนภาษีมูลค่าเพิ่ม / Pre-VAT Amount</span>
                  <span>{formatNumber(totals.preVatAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">ภาษีมูลค่าเพิ่ม VAT : 7%</span>
                  <span>{formatNumber(totals.vatAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">ราคารวมภาษีมูลค่าเพิ่ม / Include VAT</span>
                  <span>{formatNumber(totals.includeVatAmount)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>จำนวนเงินรวมทั้งสิ้น / Grand Total</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatNumber(totals.grandTotal)}
                    </span>
                  </div>
                </div>
                {formData.hasWithholdingTax && (
                  <div className="flex justify-between text-sm text-orange-600 border-t pt-2">
                    <span>หักภาษี ณ ที่จ่าย 3%</span>
                    <span>{formatNumber(totals.withholdingTax)}</span>
                  </div>
                )}
                <div className="text-right text-xs text-gray-500">บาท (THB)</div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={loading} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'กำลังบันทึก...' : (mode === 'create' ? 'สร้างใบเสนอราคา' : 'บันทึกการแก้ไข')}
              </Button>
              <Link href="/quotations">
                <Button type="button" variant="outline" className="w-full">
                  ยกเลิก
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </form>

      {/* Customer Modal */}
      <CustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        customer={customerModalMode === 'edit' ? selectedCustomer : null}
        onSave={handleCustomerSave}
        mode={customerModalMode}
      />
    </div>
  );
}
