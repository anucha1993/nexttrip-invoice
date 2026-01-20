'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  MapPin,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Receipt,
  ShoppingCart,
  ChevronDown,
  FileCheck,
  FileClock,
  FileX,
  CreditCard,
  Wallet,
  Package,
  LucideIcon,
  UserCog,
  Shield,
  ShoppingBag,
} from 'lucide-react';
import { useState } from 'react';

interface SubMenuItem {
  label: string;
  href: string;
  icon?: LucideIcon;
}

interface MenuItem {
  icon: LucideIcon;
  label: string;
  href?: string;
  subItems?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'แดชบอร์ด', href: '/' },

  {
    icon: ShoppingCart,
    label: 'งานขาย',
    subItems: [
      { label: 'ใบเสนอราคาทัังหมด', href: '/quotations', icon: FileCheck },
      { label: 'ใบเสนอราคารออนุมัติ', href: '/sales/quotations/pending', icon: FileClock },
      { label: 'ใบเสนอราคายกเลิก', href: '/sales/quotations/cancelled', icon: FileX },
      { label: 'ใบเสนอราคาอนุมัติแล้ว', href: '/sales/quotations/approved', icon: FileCheck },
    ],
  },
  {
    icon: FileText,
    label: 'ใบแจ้งหนี้',
    subItems: [
      { label: 'ใบแจ้งหนี้ทั้งหมด', href: '/invoices', icon: FileText },
      { label: 'รอชำระ', href: '/invoices/pending', icon: FileClock },
      { label: 'ชำระแล้ว', href: '/invoices/paid', icon: FileCheck },
      { label: 'เกินกำหนด', href: '/invoices/overdue', icon: FileX },
    ],
  },
  {
    icon: CreditCard,
    label: 'การเงิน',
    subItems: [
      { label: 'รับชำระเงิน', href: '/finance/payments', icon: Wallet },
      { label: 'ใบเสร็จรับเงิน', href: '/finance/receipts', icon: Receipt },
    ],
  },
  { icon: Users, label: 'ลูกค้า', href: '/customers' },
  { icon: ShoppingBag, label: 'รายการสินค้า/บริการ', href: '/products' },
  { icon: MapPin, label: 'ทัวร์', href: '/tours' },
  { icon: Package, label: 'แพ็คเกจ', href: '/packages' },
  { icon: Receipt, label: 'รายงาน', href: '/reports' },
  {
    icon: UserCog,
    label: 'ผู้ใช้งาน',
    subItems: [
      { label: 'รายการผู้ใช้งาน', href: '/users', icon: Users },
      { label: 'โปรไฟล์สิทธิ์', href: '/profiles', icon: Shield },
      { label: 'สิทธิ์การใช้งาน', href: '/permissions', icon: Shield },
    ],
  },
  { icon: Settings, label: 'ตั้งค่า', href: '/settings' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const toggleSubmenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const isMenuActive = (item: MenuItem) => {
    if (item.href) {
      return pathname === item.href || pathname?.startsWith(item.href + '/');
    }
    if (item.subItems) {
      return item.subItems.some(
        (sub) => pathname === sub.href || pathname?.startsWith(sub.href + '/')
      );
    }
    return false;
  };

  const handleLinkClick = () => {
    // Close sidebar on mobile when clicking a link
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300 
        ${collapsed ? 'w-16' : 'w-64'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">NT</span>
            </div>
            <span className="font-semibold text-gray-900">NextTrip</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
        {menuItems.map((item) => {
          const isActive = isMenuActive(item);
          const isExpanded = expandedMenus.includes(item.label);
          const hasSubItems = item.subItems && item.subItems.length > 0;

          return (
            <div key={item.label}>
              {/* Main Menu Item */}
              {hasSubItems ? (
                <button
                  onClick={() => !collapsed && toggleSubmenu(item.label)}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="font-medium">{item.label}</span>}
                  </div>
                  {!collapsed && (
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>
              ) : (
                <Link
                  href={item.href || '#'}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="font-medium">{item.label}</span>}
                </Link>
              )}

              {/* Sub Menu Items */}
              {hasSubItems && !collapsed && isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-3">
                  {item.subItems?.map((subItem) => {
                    const isSubActive = pathname === subItem.href || pathname?.startsWith(subItem.href + '/');
                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        onClick={handleLinkClick}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isSubActive
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                        }`}
                      >
                        {subItem.icon && <subItem.icon className="w-4 h-4" />}
                        <span>{subItem.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200 bg-white">
        <button
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">ออกจากระบบ</span>}
        </button>
      </div>
    </aside>
  );
}
