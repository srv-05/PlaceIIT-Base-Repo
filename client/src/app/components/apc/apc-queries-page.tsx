import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Input } from "@/app/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { MessageSquare, Clock, CheckCircle2, Search, Send, User } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { adminApi } from "@/app/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Query {
  _id: string;
  studentName: string;
  studentRollNo: string;
  subject: string;
  message: string;
  status: "pending" | "replied" | "resolved";
  response?: string;
  createdAt: string;
}

export function APCQueriesPage() {
  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchQueries = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await adminApi.getQueries();
      setQueries(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load queries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueries();
  }, [fetchQueries]);

  const handleRespond = async () => {
    if (!selectedQuery) return;
    if (!responseMessage.trim()) {
      toast.error("Please enter a response message");
      return;
    }

    setSubmitting(true);
    try {
      await adminApi.respondToQuery(selectedQuery._id, {
        response: responseMessage,
        status: "replied", // or resolved
      });
      toast.success("Response sent successfully!");
      setResponseMessage("");
      setSelectedQuery(null);
      fetchQueries();
    } catch (err: any) {
      toast.error(err.message || "Failed to send response");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (queryId: string) => {
    try {
      await adminApi.respondToQuery(queryId, {
        response: "",
        status: "resolved",
      });
      toast.success("Query marked as resolved");
      fetchQueries();
      if (selectedQuery?._id === queryId) {
        setSelectedQuery(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve query");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Resolved</Badge>;
      case "replied":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Replied</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
    }
  };

  const filteredQueries = queries.filter(
    (q) =>
      q.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.studentRollNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500 gap-2">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading queries...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <MessageSquare className="h-8 w-8 mr-3 text-indigo-600" /> Student Queries
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Queries</CardTitle>
          <CardDescription>Manage and respond to support queries from students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search subject, name, roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredQueries.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 border border-gray-100 rounded-lg">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No student queries found.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredQueries.map((query) => (
                <Card key={query._id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg text-gray-900">{query.subject}</h3>
                          {getStatusBadge(query.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                          <span className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {query.studentName} ({query.studentRollNo})
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {new Date(query.createdAt).toLocaleDateString("en-US", {
                              month: "short", day: "numeric", hour: "numeric", minute: "numeric"
                            })}
                          </span>
                        </div>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 font-medium">
                          {query.message}
                        </p>
                        
                        {query.response && (
                          <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                            <p className="text-sm font-semibold text-indigo-900 mb-1">Your Response:</p>
                            <p className="text-sm text-indigo-800">{query.response}</p>
                          </div>
                        )}
                      </div>
                      <div className="ml-6 flex flex-col gap-2">
                        {query.status !== "resolved" && (
                          <>
                            <Button 
                              variant="outline" 
                              className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                              onClick={() => {
                                setSelectedQuery(query);
                                setResponseMessage(query.response || "");
                              }}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Reply
                            </Button>
                            <Button 
                              variant="outline" 
                              className="border-green-600 text-green-600 hover:bg-green-50"
                              onClick={() => handleResolve(query._id)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Mark Resolved
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reply Dialog */}
      <Dialog open={!!selectedQuery} onOpenChange={(open) => !open && setSelectedQuery(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reply to Query</DialogTitle>
            <DialogDescription>
              Sending a response to {selectedQuery?.studentName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="font-semibold text-sm">Query Context:</p>
              <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 border border-gray-100 max-h-32 overflow-y-auto">
                <span className="font-semibold block mb-1">{selectedQuery?.subject}</span>
                {selectedQuery?.message}
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-sm">Your Response:</p>
              <Textarea
                placeholder="Type your response here..."
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedQuery(null)}>Cancel</Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700" 
              onClick={handleRespond} 
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
