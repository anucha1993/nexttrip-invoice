export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard - NextTrip Invoice</h1>
      <p>ระบบทำงานปกติแล้ว ยินดีต้อนรับ!</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="/customers" className="p-6 bg-white border rounded-lg hover:shadow-lg transition">
          <h2 className="text-xl font-semibold mb-2">ลูกค้า</h2>
          <p className="text-gray-600">จัดการข้อมูลลูกค้า</p>
        </a>
        
        <a href="/quotations" className="p-6 bg-white border rounded-lg hover:shadow-lg transition">
          <h2 className="text-xl font-semibold mb-2">ใบเสนอราคา</h2>
          <p className="text-gray-600">สร้างและจัดการใบเสนอราคา</p>
        </a>
        
        <a href="/invoices" className="p-6 bg-white border rounded-lg hover:shadow-lg transition">
          <h2 className="text-xl font-semibold mb-2">ใบแจ้งหนี้</h2>
          <p className="text-gray-600">จัดการใบแจ้งหนี้</p>
        </a>
      </div>
    </div>
  );
}
