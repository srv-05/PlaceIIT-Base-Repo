import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Separator } from "@/app/components/ui/separator";
import { ArrowLeft, Calendar, Clock, Building2, MapPin, Users } from "lucide-react";

interface CoCoSchedulePageProps {
  coco: {
    id: string;
    name: string;
    email: string;
    phone: string;
    assignments?: Array<{
      id: string;
      name: string;
      day: string;
      slot: string;
      venue?: string;
    }>;
  };
  onBack: () => void;
}

export function CoCoSchedulePage({ coco, onBack }: CoCoSchedulePageProps) {
  const assignments = coco.assignments || [];

  // Group by day (e.g. "Day 1", "Day 2")
  const groupedTasks: Record<string, typeof assignments> = {};
  assignments.forEach((a) => {
    if (!groupedTasks[a.day]) {
      groupedTasks[a.day] = [];
    }
    groupedTasks[a.day].push(a);
  });

  // Convert to scheduleData format
  const scheduleData = Object.keys(groupedTasks).sort().map((dayLabel) => {
    const slots = groupedTasks[dayLabel].map((assignment) => ({
      time: assignment.slot.toLowerCase() === "morning" ? "Morning" : "Afternoon",
      company: assignment.name,
      venue: assignment.venue && assignment.venue !== "Not Assigned" ? assignment.venue : "Not Assigned",
      candidateCount: 0,
      status: "upcoming"
    }));
    return {
      day: dayLabel,
      date: "Schedule depending on slot",
      slots
    };
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Upcoming</Badge>;
      case "ongoing":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Ongoing</Badge>;
      case "completed":
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Completed</Badge>;
      default:
        return null;
    }
  };

  const totalAssignments = scheduleData.reduce((acc, day) => acc + day.slots.length, 0);
  const totalCandidates = scheduleData.reduce(
    (acc, day) => acc + day.slots.reduce((sum, slot) => sum + slot.candidateCount, 0),
    0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-yellow-50 py-8">
      <div className="container mx-auto px-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to CoCo Management
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{coco.name}</h1>
              <p className="text-gray-600 mt-2">Complete Schedule Overview</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Assignments</p>
                  <p className="text-2xl font-bold text-gray-900">{totalAssignments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Days Scheduled</p>
                  <p className="text-2xl font-bold text-gray-900">{scheduleData.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Candidates</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCandidates}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  📧
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Email</p>
                  <p className="text-sm font-medium text-gray-900">{coco.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  📞
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Phone</p>
                  <p className="text-sm font-medium text-gray-900">{coco.phone}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Schedule */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Interview Schedule</h2>

          {scheduleData.map((daySchedule, dayIndex) => (
            <Card key={dayIndex}>
              <CardHeader className="bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{daySchedule.day}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4" />
                      {daySchedule.date}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {daySchedule.slots.length} {daySchedule.slots.length === 1 ? 'Session' : 'Sessions'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {daySchedule.slots.map((slot, slotIndex) => (
                    <div key={slotIndex}>
                      <div className="flex items-start gap-4">
                        {/* Timeline indicator */}
                        <div className="flex flex-col items-center">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <Clock className="h-5 w-5 text-indigo-600" />
                          </div>
                          {slotIndex < daySchedule.slots.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                          )}
                        </div>

                        {/* Slot details */}
                        <div className="flex-1 pb-6">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-gray-900 text-lg">{slot.company}</p>
                              <p className="text-sm text-indigo-600 font-medium mt-1">{slot.time}</p>
                            </div>
                            {getStatusBadge(slot.status)}
                          </div>

                          <div className="grid md:grid-cols-2 gap-4 mt-4">
                            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                              <MapPin className="h-5 w-5 text-gray-600" />
                              <div>
                                <p className="text-xs text-gray-500 font-semibold uppercase">Venue</p>
                                <p className="text-sm font-medium text-gray-900">{slot.venue}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                              <Users className="h-5 w-5 text-gray-600" />
                              <div>
                                <p className="text-xs text-gray-500 font-semibold uppercase">Candidates</p>
                                <p className="text-sm font-medium text-gray-900">{slot.candidateCount > 0 ? `${slot.candidateCount} students` : "TBD"}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {slotIndex < daySchedule.slots.length - 1 && (
                        <Separator className="my-4" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </div>
  );
}
