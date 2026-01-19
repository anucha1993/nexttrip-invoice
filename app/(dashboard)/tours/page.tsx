'use client';

import { useState } from 'react';
import { Plus, Search, Eye, Edit, Trash2, MoreVertical, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tour } from '@/types';

// Mock Data
const mockTours: Tour[] = [
  {
    id: '1',
    name: 'เชียงใหม่ 3 วัน 2 คืน',
    destination: 'เชียงใหม่',
    duration: '3 วัน 2 คืน',
    price: 15000,
    description: 'เที่ยวเชียงใหม่ ชมวัดพระธาตุดอยสุเทพ สวนสัตว์เชียงใหม่ ไนท์บาซาร์',
    status: 'active',
    createdAt: '2025-01-01',
  },
  {
    id: '2',
    name: 'ภูเก็ต 4 วัน 3 คืน',
    destination: 'ภูเก็ต',
    duration: '4 วัน 3 คืน',
    price: 25000,
    description: 'เที่ยวภูเก็ต หาดป่าตอง เกาะพีพี แหลมพรหมเทพ',
    status: 'active',
    createdAt: '2025-02-15',
  },
  {
    id: '3',
    name: 'กระบี่ 3 วัน 2 คืน',
    destination: 'กระบี่',
    duration: '3 วัน 2 คืน',
    price: 18000,
    description: 'เที่ยวกระบี่ อ่าวนาง เกาะ 4 เกาะ สระมรกต',
    status: 'active',
    createdAt: '2025-03-10',
  },
  {
    id: '4',
    name: 'เกาะสมุย 5 วัน 4 คืน',
    destination: 'เกาะสมุย',
    duration: '5 วัน 4 คืน',
    price: 35000,
    description: 'พักผ่อนเกาะสมุย หาดเฉวง วัดพระใหญ่ อุทยานแห่งชาติหมู่เกาะอ่างทอง',
    status: 'active',
    createdAt: '2025-04-01',
  },
  {
    id: '5',
    name: 'พัทยา 2 วัน 1 คืน',
    destination: 'พัทยา',
    duration: '2 วัน 1 คืน',
    price: 8000,
    description: 'เที่ยวพัทยา เกาะล้าน Walking Street สวนนงนุช',
    status: 'active',
    createdAt: '2025-05-20',
  },
  {
    id: '6',
    name: 'เชียงราย 3 วัน 2 คืน',
    destination: 'เชียงราย',
    duration: '3 วัน 2 คืน',
    price: 12000,
    description: 'เที่ยวเชียงราย วัดร่องขุ่น วัดร่องเสือเต้น ภูชี้ฟ้า',
    status: 'inactive',
    createdAt: '2025-06-15',
  },
];

export default function ToursPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amount);
  };

  const filteredTours = mockTours.filter((tour) => {
    return (
      tour.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tour.destination.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ทัวร์</h1>
          <p className="text-gray-500 mt-1">จัดการแพ็คเกจทัวร์ทั้งหมด</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มทัวร์
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="ค้นหาชื่อทัวร์ หรือจุดหมายปลายทาง..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Tour Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTours.map((tour) => (
          <Card key={tour.id} className="overflow-hidden">
            {/* Tour Image Placeholder */}
            <div className="h-40 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              <MapPin className="w-12 h-12 text-white/50" />
            </div>
            
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{tour.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    <MapPin className="w-3 h-3" />
                    {tour.destination}
                    <span className="mx-1">•</span>
                    <Clock className="w-3 h-3" />
                    {tour.duration}
                  </div>
                </div>
                <Badge variant={tour.status === 'active' ? 'success' : 'default'}>
                  {tour.status === 'active' ? 'เปิดให้บริการ' : 'ปิดให้บริการ'}
                </Badge>
              </div>
              
              <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                {tour.description}
              </p>
              
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(tour.price)}
                </p>
                <div className="flex gap-1">
                  <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
