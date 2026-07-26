import Link from 'next/link';
import { Users, FileText, ReceiptText, ArrowRight, Sparkles } from 'lucide-react';

const shortcuts = [
  {
    href: '/customers',
    title: 'ลูกค้า',
    description: 'จัดการข้อมูลลูกค้า',
    icon: Users,
    gradient: 'from-blue-500 to-blue-600',
    ring: 'group-hover:ring-blue-200',
  },
  {
    href: '/quotations',
    title: 'ใบเสนอราคา',
    description: 'สร้างและจัดการใบเสนอราคา',
    icon: FileText,
    gradient: 'from-indigo-500 to-indigo-600',
    ring: 'group-hover:ring-indigo-200',
  },
  {
    href: '/invoices',
    title: 'ใบแจ้งหนี้',
    description: 'จัดการใบแจ้งหนี้และติดตามการชำระเงิน',
    icon: ReceiptText,
    gradient: 'from-sky-500 to-cyan-600',
    ring: 'group-hover:ring-sky-200',
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 p-6 sm:p-8 text-white shadow-lg animate-fade-in-up">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 -right-4 h-48 w-48 rounded-full bg-white/5" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            ระบบทำงานปกติ
          </div>
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">NextTrip Invoice</h1>
          <p className="mt-1 text-sm text-blue-100 sm:text-base">
            ยินดีต้อนรับกลับมา เลือกเมนูด้านล่างเพื่อเริ่มทำงาน
          </p>
        </div>
      </div>

      {/* Quick shortcuts */}
      <div className="stagger-children grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {shortcuts.map(({ href, title, description, icon: Icon, gradient, ring }) => (
          <Link
            key={href}
            href={href}
            className={`hover-lift group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 sm:p-6 ring-0 transition-all ${ring} hover:ring-4`}
          >
            <div className="flex items-start justify-between">
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md transition-transform duration-300 group-hover:scale-110`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-gray-300 transition-all duration-300 group-hover:translate-x-1 group-hover:text-blue-500" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900 transition-colors group-hover:text-blue-600 sm:text-xl">
              {title}
            </h2>
            <p className="mt-1 text-sm text-gray-500 sm:text-base">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
