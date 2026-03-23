import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Badge } from "@/app/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/app/components/ui/dialog";
import { Phone, Mail, MapPin, Clock, User, MessageSquare, History } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { studentApi } from "@/app/lib/api";

interface Query {
  id: string;
  subject: string;
  message: string;
  status: "pending" | "replied" | "resolved";
  date: string;
  response?: string;
}

export function StudentContactPage() {
  const [formData, setFormData] = useState({
    subject: "",
    message: ""
  });

  const [previousQueries, setPreviousQueries] = useState<Query[]>([]);

  const fetchQueries = async () => {
    try {
      const data = (await studentApi.getMyQueries()) as any[];
      setPreviousQueries(
        data.map((q: any) => ({
          id: q._id,
          subject: q.subject,
          message: q.message,
          status: q.status ?? "pending",
          date: q.createdAt,
          response: q.response ?? undefined,
        }))
      );
    } catch (_) {}
  };

  useEffect(() => { fetchQueries(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await studentApi.submitQuery({ subject: formData.subject, message: formData.message });
      toast.success("Your message has been sent!");
      setFormData({ subject: "", message: "" });
      await fetchQueries();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send message");
    }
  };

  const contacts = [
    {
      role: "Placement Coordinator",
      name: "Dr. Anita Sharma",
      email: "placement@iit.ac.in",
      phone: "+91 11 2659 1234",
      availability: "Mon-Fri, 9:00 AM - 5:00 PM"
    },
    {
      role: "Student Coordinator",
      name: "Rahul Verma",
      email: "student.coord@iit.ac.in",
      phone: "+91 98765 12345",
      availability: "Mon-Sat, 10:00 AM - 6:00 PM"
    },
    {
      role: "Technical Support",
      name: "Support Team",
      email: "support@iit.ac.in",
      phone: "+91 11 2659 5678",
      availability: "24/7"
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Phone className="h-8 w-8 mr-3 text-indigo-600" />
          Contact Us
        </h1>
        {/* My Queries Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-indigo-600 text-indigo-600 hover:bg-indigo-50">
              <History className="h-4 w-4 mr-2" />
              My Queries
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[600px] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <History className="h-5 w-5 mr-2 text-indigo-600" />
                My Previous Queries
              </DialogTitle>
              <DialogDescription>
                View all your previous queries and their responses
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {previousQueries.map((query) => {
                const statusColor =
                  query.status === "resolved" ? "bg-green-100 text-green-800 border-green-200" :
                    query.status === "replied" ? "bg-blue-100 text-blue-800 border-blue-200" :
                      "bg-yellow-100 text-yellow-800 border-yellow-200";

                return (
                  <Card key={query.id} className="border border-gray-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base font-semibold text-gray-900">
                            {query.subject}
                          </CardTitle>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(query.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </p>
                        </div>
                        <Badge className={`${statusColor} text-xs`}>
                          {query.status.charAt(0).toUpperCase() + query.status.slice(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Your Query:</p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                          {query.message}
                        </p>
                      </div>
                      {query.response && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Response:</p>
                          <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
                            {query.response}
                          </p>
                        </div>
                      )}
                      {query.status === "pending" && (
                        <p className="text-xs text-yellow-600 italic">
                          Your query is being reviewed. You'll receive a response soon.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {previousQueries.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No previous queries found</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Placement Office</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-indigo-600 mr-3 mt-1" />
                <div>
                  <p className="font-medium text-gray-900">Address</p>
                  <p className="text-sm text-gray-600">
                    Training & Placement Cell<br />
                    Indian Institute of Technology<br />
                    Hauz Khas, New Delhi - 110016
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <Mail className="h-5 w-5 text-indigo-600 mr-3 mt-1" />
                <div>
                  <p className="font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">placement@iit.ac.in</p>
                </div>
              </div>

              <div className="flex items-start">
                <Phone className="h-5 w-5 text-indigo-600 mr-3 mt-1" />
                <div>
                  <p className="font-medium text-gray-900">Phone</p>
                  <p className="text-sm text-gray-600">+91 11 2659 1234</p>
                </div>
              </div>

              <div className="flex items-start">
                <Clock className="h-5 w-5 text-indigo-600 mr-3 mt-1" />
                <div>
                  <p className="font-medium text-gray-900">Office Hours</p>
                  <p className="text-sm text-gray-600">
                    Monday - Friday: 9:00 AM - 5:00 PM<br />
                    Saturday: 10:00 AM - 2:00 PM
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Contacts */}
          <Card>
            <CardHeader>
              <CardTitle>Key Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contacts.map((contact, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start mb-2">
                      <User className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900">{contact.name}</p>
                        <p className="text-sm text-gray-600">{contact.role}</p>
                      </div>
                    </div>
                    <div className="ml-7 space-y-1">
                      <p className="text-sm text-gray-600">
                        <Mail className="h-3 w-3 inline mr-1" />
                        {contact.email}
                      </p>
                      <p className="text-sm text-gray-600">
                        <Phone className="h-3 w-3 inline mr-1" />
                        {contact.phone}
                      </p>
                      <p className="text-sm text-gray-600">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {contact.availability}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-gray-600" />
                Send a Message
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Brief subject of your query"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Describe your query in detail..."
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    rows={8}
                    required
                  />
                </div>

                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Quick Help</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  How do I join a queue?
                </p>
                <p className="text-xs text-gray-600">
                  Go to Home, find your company and click "Join Queue" button.
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  When will I know my queue position?
                </p>
                <p className="text-xs text-gray-600">
                  Once you join the queue, your position will be displayed on the company tile.
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Can I update my profile?
                </p>
                <p className="text-xs text-gray-600">
                  Yes, go to Profile page and click "Edit Profile" to update your information.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}