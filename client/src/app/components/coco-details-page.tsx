import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { ArrowLeft, Mail, Calendar, Clock } from "lucide-react";

interface Company {
  id: string;
  name: string;
  day: string;
  slot: string;
}

interface CoCoDetailsPageProps {
  cocoId: string;
  cocoName: string;
  cocoEmail: string;
  cocoPhone: string;
  assignments: Company[];
  onBack: () => void;
}

export function CoCoDetailsPage({
  cocoName,
  cocoEmail,
  cocoPhone,
  assignments,
  onBack
}: CoCoDetailsPageProps) {
  return (
    <div className="space-y-8">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{cocoName}</h1>
          <p className="text-gray-500">CoCo details and schedule</p>
        </div>
      </div>

      {/* CoCo Information Card */}
      <Card className="border-2 border-indigo-100">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900">CoCo Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3 bg-indigo-50 p-4 rounded-lg">
              <Mail className="h-5 w-5 text-indigo-600 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email</div>
                <div className="font-semibold text-gray-900 truncate">{cocoEmail}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-indigo-50 p-4 rounded-lg">
              <span className="text-xl">📞</span>
              <div className="flex-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone</div>
                <div className="font-semibold text-gray-900">{cocoPhone}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-600">
              <div className="flex-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Assignments</div>
                <div className="text-3xl font-bold text-indigo-900">{assignments.length}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Schedule ({assignments.length} Companies)</h2>
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No company assignments yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {assignments.map((company) => (
              <Card key={company.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardContent className="py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 text-lg mb-2">{company.name}</div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg">
                          <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                          <span className="font-medium text-indigo-900">{company.day}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-yellow-50 px-3 py-1.5 rounded-lg">
                          <Clock className="h-3.5 w-3.5 text-yellow-600" />
                          <span className="font-medium text-yellow-900">{company.slot}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
