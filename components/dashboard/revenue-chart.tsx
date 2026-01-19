'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/card';

interface RevenueChartProps {
  data: { month: string; revenue: number }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue));

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">รายได้รายเดือน</h3>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-2 h-48">
          {data.map((item) => {
            const height = (item.revenue / maxRevenue) * 100;
            return (
              <div
                key={item.month}
                className="flex-1 flex flex-col items-center gap-2"
              >
                <div className="w-full flex justify-center">
                  <div
                    className="w-8 bg-blue-500 rounded-t-md transition-all duration-300 hover:bg-blue-600"
                    style={{ height: `${height}%` }}
                    title={`${item.revenue.toLocaleString()} บาท`}
                  />
                </div>
                <span className="text-xs text-gray-500">{item.month}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
