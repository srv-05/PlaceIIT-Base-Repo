import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { StatsCard } from "@/app/components/stats-card";
import {
  Users,
  UserCog,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Briefcase,
  User,
  Award,
  Loader2,
} from "lucide-react";
import { adminApi } from "@/app/lib/api";
import { useSocket } from "@/app/socket-context";
import { formatSlotLabel } from "@/app/lib/format";

interface APCHomePageProps {
  userName: string;
  stats: {
    students: number;
    cocos: number;
    companies: number;
  };
  onNavigate: (page: string) => void;
  isMainAdmin: boolean;
}

interface ScheduleItem {
  id: string;
  company: string;
  time: string;
  venue: string;
  candidates: number;
  status: string;
}

export function APCHomePage({ userName, stats, onNavigate, isMainAdmin }: APCHomePageProps) {
  const { socket } = useSocket();
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  const fetchSchedule = useCallback(async () => {
    setLoadingSchedule(true);
    try {
      const data: any = await adminApi.getCompanies();
      const companies = Array.isArray(data) ? data : data.companies ?? [];
      const items: ScheduleItem[] = companies.slice(0, 5).map((c: any, i: number) => ({
        id: c._id ?? String(i),
        company: c.name ?? "—",
        time: formatSlotLabel(c.slot),
        venue: c.venue ?? "TBA",
        candidates: c.shortlistedStudents?.length ?? 0,
        status: c.walkInOpen ? "ongoing" : "upcoming",
      }));
      setSchedule(items);
    } catch {
      setSchedule([]);
    } finally {
      setLoadingSchedule(false);
    }
  }, []);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  // Live schedule refresh
  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchSchedule();
    socket.on("walkin:updated", refresh);
    socket.on("queue:updated", refresh);
    return () => {
      socket.off("walkin:updated", refresh);
      socket.off("queue:updated", refresh);
    };
  }, [socket, fetchSchedule]);

  const getStatusBadge = (status: string) => {
    if (status === "ongoing") {
      return <Badge className="bg-green-100 text-green-700 border-green-200">Ongoing</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Upcoming</Badge>;
  };

  return (
    <>
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Hello, {userName}</h1>
        <p className="text-gray-600 text-lg">
          All the best for managing placements today. You have{" "}
          <span className="text-indigo-600 font-semibold">{stats.companies} active companies</span> pending.
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <StatsCard
          title="Total Students"
          value={stats.students}
          icon={Users}
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Total CoCos"
          value={stats.cocos}
          icon={UserCog}
          iconColor="text-green-600"
        />
        <StatsCard
          title="Total Companies"
          value={stats.companies}
          icon={Building2}
          iconColor="text-purple-600"
        />
      </div>

      {/* Today's Schedule */}
      <div className="mb-8">
        <Card>
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                Today's Schedule
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("manage-companies")}
                className="text-indigo-600 hover:text-indigo-700"
              >
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingSchedule ? (
              <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading…
              </div>
            ) : schedule.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <Calendar className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p>No companies scheduled yet. <button onClick={() => onNavigate("manage-companies")} className="text-indigo-600 hover:underline font-medium">Add one</button></p>
              </div>
            ) : (
              <div className="space-y-4">
                {schedule.map((interview) => (
                  <div
                    key={interview.id}
                    className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{interview.company}</h4>
                        {getStatusBadge(interview.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {interview.time}
                        </div>
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {interview.venue}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {interview.candidates} candidates
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2 bg-white hover:bg-indigo-50 hover:border-indigo-300"
              onClick={() => onNavigate("student-search")}
            >
              <Users className="h-6 w-6 text-indigo-600" />
              <span className="text-sm font-medium">Search Students</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2 bg-white hover:bg-indigo-50 hover:border-indigo-300"
              onClick={() => onNavigate("manage-cocos")}
            >
              <UserCog className="h-6 w-6 text-green-600" />
              <span className="text-sm font-medium">Manage CoCos</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2 bg-white hover:bg-indigo-50 hover:border-indigo-300"
              onClick={() => onNavigate("manage-companies")}
            >
              <Building2 className="h-6 w-6 text-purple-600" />
              <span className="text-sm font-medium">Manage Companies</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2 bg-white hover:bg-indigo-50 hover:border-indigo-300"
              onClick={() => onNavigate("queries")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-amber-600"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
              <span className="text-sm font-medium">Student Queries</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2 bg-white hover:bg-indigo-50 hover:border-indigo-300"
              onClick={() => onNavigate("profile")}
            >
              <User className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium">My Profile</span>
            </Button>
            {isMainAdmin && (
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2 bg-white hover:bg-emerald-50 hover:border-emerald-300"
                onClick={() => onNavigate("manage-apcs")}
              >
                <Users className="h-6 w-6 text-emerald-600" />
                <span className="text-sm font-medium">Manage APCs</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}