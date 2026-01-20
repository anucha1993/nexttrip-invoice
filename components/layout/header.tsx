'use client';

import { Bell, Search, User, ChevronDown, LogOut, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Prevent redirect loop - only check once
    if (authChecked) return;
    
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            // Session expired or invalid, redirect to login
            router.push('/login');
            return;
          }
          // For other errors, just log and continue
          console.error('Auth check failed with status:', res.status);
          setAuthChecked(true);
          return;
        }
        
        const data = await res.json();
        
        if (!data.user) {
          // No user data, redirect to login
          router.push('/login');
          return;
        }
        
        setUser(data.user);
        setAuthChecked(true);
      } catch (error) {
        console.error('Network error fetching user:', error);
        // Don't redirect on network errors, user might be offline
        setAuthChecked(true);
      }
    };
    
    checkAuth();
  }, [authChecked, router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      {/* Mobile Menu Button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหา..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">การแจ้งเตือน</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                  <p className="text-sm text-gray-900">ใบแจ้งหนี้ #INV-2026-001 ได้รับการชำระแล้ว</p>
                  <p className="text-xs text-gray-500 mt-1">5 นาทีที่แล้ว</p>
                </div>
                <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                  <p className="text-sm text-gray-900">ใบแจ้งหนี้ #INV-2026-002 เกินกำหนดชำระ</p>
                  <p className="text-xs text-gray-500 mt-1">1 ชั่วโมงที่แล้ว</p>
                </div>
                <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                  <p className="text-sm text-gray-900">ลูกค้าใหม่: สมชาย ใจดี</p>
                  <p className="text-xs text-gray-500 mt-1">2 ชั่วโมงที่แล้ว</p>
                </div>
              </div>
              <div className="px-4 py-2 border-t border-gray-100">
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  ดูทั้งหมด
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 lg:gap-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500">{user?.email || ''}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                {user?.profileCode && (
                  <p className="text-xs text-blue-600 mt-1">Role: {user.profileCode}</p>
                )}
              </div>
              <a
                href="/profile"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                โปรไฟล์
              </a>
              <a
                href="/settings"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                ตั้งค่า
              </a>
              <hr className="my-2" />
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                ออกจากระบบ
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
