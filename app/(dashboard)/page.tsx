export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard - NextTrip Invoice</h1>
        <p className="text-gray-600">ระบบทำงานปกติแล้ว ยินดีต้อนรับ!</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <a href="/customers" className="group p-4 sm:p-6 bg-white border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-300 transition-all duration-200">
          <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-900 group-hover:text-blue-600">ลูกค้า</h2>
          <p className="text-gray-600 text-sm sm:text-base">จัดการข้อมูลลูกค้า</p>
        </a>
        
        <a href="/quotations" className="group p-4 sm:p-6 bg-white border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-300 transition-all duration-200">
          <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-900 group-hover:text-blue-600">ใบเสนอราคา</h2>
          <p className="text-gray-600 text-sm sm:text-base">สร้างและจัดการใบเสนอราคา</p>
        </a>
        
        <a href="/invoices" className="group p-4 sm:p-6 bg-white border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-300 transition-all duration-200 sm:col-span-2 lg:col-span-1">
          <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-900 group-hover:text-blue-600">ใบแจ้งหนี้</h2>
          <p className="text-gray-600 text-sm sm:text-base">จัดการใบแจ้งหนี้</p>
        </a>
      </div>
    </div>
  );
}
