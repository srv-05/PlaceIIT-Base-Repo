import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  iconColor?: string;
}

export function StatsCard({ title, value, icon: Icon, iconColor = "text-blue-600" }: StatsCardProps) {
  return (
    <Card className="shadow-sm hover:shadow-lg transition-all duration-200 border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {title}
        </CardTitle>
        <div className={`p-3 bg-gray-50 rounded-xl`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold text-gray-900">{value}</div>
      </CardContent>
    </Card>
  );
}