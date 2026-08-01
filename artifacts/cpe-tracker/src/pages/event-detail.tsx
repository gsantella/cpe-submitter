import { useState, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import { 
  useGetEvent, 
  useListEventAttendees, 
  useListMembers, 
  useCheckInAttendee, 
  useRemoveAttendee, 
  useCreateMember,
  getListEventAttendeesQueryKey,
  getGetEventQueryKey,
  getListMembersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Download, Search, CheckCircle2, UserPlus, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function EventDetail() {
  const { id } = useParams();
  const eventId = parseInt(id || "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [memberSearch, setMemberSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [newMember, setNewMember] = useState({ firstName: "", lastName: "", isc2Number: "" });

  const { data: event, isLoading: isLoadingEvent } = useGetEvent(eventId, {
    query: { enabled: !!eventId, queryKey: getGetEventQueryKey(eventId) }
  });

  const { data: attendees, isLoading: isLoadingAttendees } = useListEventAttendees(eventId, {
    query: { enabled: !!eventId, queryKey: getListEventAttendeesQueryKey(eventId) }
  });

  // Handle search debounce for existing members
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(memberSearch), 300);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  const { data: searchResults, isLoading: isLoadingSearch } = useListMembers(
    { search: debouncedSearch || undefined },
    { query: { enabled: debouncedSearch.length > 0, queryKey: getListMembersQueryKey({ search: debouncedSearch }) } }
  );

  const checkIn = useCheckInAttendee({
    mutation: {
      onSuccess: () => {
        toast({ title: "Checked in successfully" });
        queryClient.invalidateQueries({ queryKey: getListEventAttendeesQueryKey(eventId) });
        queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(eventId) });
        setMemberSearch("");
      },
      onError: (err) => {
        toast({ title: "Check-in failed", description: (err.data as { error?: string })?.error, variant: "destructive" });
      }
    }
  });

  const removeAttendee = useRemoveAttendee({
    mutation: {
      onSuccess: () => {
        toast({ title: "Attendee removed" });
        queryClient.invalidateQueries({ queryKey: getListEventAttendeesQueryKey(eventId) });
        queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(eventId) });
      },
      onError: (err) => {
        toast({ title: "Failed to remove", description: (err.data as { error?: string })?.error, variant: "destructive" });
      }
    }
  });

  const createMemberAndCheckIn = useCreateMember({
    mutation: {
      onSuccess: (data) => {
        setNewMember({ firstName: "", lastName: "", isc2Number: "" });
        // Check them in immediately after creation
        checkIn.mutate({ id: eventId, data: { memberId: data.id } });
      },
      onError: (err) => {
        toast({ title: "Failed to create member", description: (err.data as { error?: string })?.error, variant: "destructive" });
      }
    }
  });

  const handleCheckInExisting = (memberId: number) => {
    checkIn.mutate({ id: eventId, data: { memberId } });
  };

  const handleCreateAndCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.firstName || !newMember.lastName || !newMember.isc2Number) return;
    createMemberAndCheckIn.mutate({ data: newMember });
  };

  const handleRemove = (memberId: number) => {
    if (confirm("Remove this attendee?")) {
      removeAttendee.mutate({ id: eventId, memberId });
    }
  };

  const attendeeIds = useMemo(() => new Set(attendees?.map(a => a.memberId) || []), [attendees]);

  if (isLoadingEvent || !event) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mr-2" /> Loading event details...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant={event.groupType === "Group A" ? "default" : "secondary"}>
              {event.groupType}
            </Badge>
            <span className="text-sm font-mono text-muted-foreground">
              {format(new Date(event.date), "MMMM d, yyyy")}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{event.name}</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">{event.description}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right mr-2">
            <div className="text-2xl font-bold font-mono text-primary">{event.cpeCredits}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">CPE Credits</div>
          </div>
          <div className="text-right mr-2 pl-4 border-l border-border">
            <div className="text-2xl font-bold font-mono">{event.attendeeCount}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Attendees</div>
          </div>
          <Button asChild variant="outline" className="ml-2 gap-2 w-full sm:w-auto" data-testid="button-export">
            <a href={`/api/events/${eventId}/export`} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4" />
              Export to Excel
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CHECK-IN WORKFLOWS */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="w-5 h-5 text-muted-foreground" />
                Existing Member Check-in
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name or ISC2 number..." 
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-checkin"
                />
              </div>

              {debouncedSearch.length > 0 && (
                <div className="border rounded-md overflow-hidden bg-background max-h-64 overflow-y-auto">
                  {isLoadingSearch ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
                  ) : !searchResults || searchResults.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">No matching members found.</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {searchResults.map(member => {
                        const isCheckedIn = attendeeIds.has(member.id);
                        return (
                          <div key={member.id} className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                            <div>
                              <div className="font-medium text-sm">{member.firstName} {member.lastName}</div>
                              <div className="font-mono text-xs text-muted-foreground">{member.isc2Number}</div>
                            </div>
                            {isCheckedIn ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> In
                              </Badge>
                            ) : (
                              <Button 
                                size="sm" 
                                onClick={() => handleCheckInExisting(member.id)}
                                disabled={checkIn.isPending}
                                data-testid={`button-checkin-member-${member.id}`}
                              >
                                Check In
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-muted-foreground" />
                New Member Check-in
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleCreateAndCheckIn} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First Name</label>
                    <Input 
                      value={newMember.firstName} 
                      onChange={e => setNewMember({ ...newMember, firstName: e.target.value })}
                      required
                      data-testid="input-new-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Name</label>
                    <Input 
                      value={newMember.lastName} 
                      onChange={e => setNewMember({ ...newMember, lastName: e.target.value })}
                      required
                      data-testid="input-new-last-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">ISC2 Number</label>
                  <Input 
                    value={newMember.isc2Number} 
                    onChange={e => setNewMember({ ...newMember, isc2Number: e.target.value })}
                    required
                    data-testid="input-new-isc2-number"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={createMemberAndCheckIn.isPending || checkIn.isPending}
                  data-testid="button-create-checkin"
                >
                  {(createMemberAndCheckIn.isPending || checkIn.isPending) ? 
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create & Check In
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: ATTENDEE LIST */}
        <div className="lg:col-span-7">
          <Card className="h-full flex flex-col">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg">Checked-in Attendees ({attendees?.length || 0})</CardTitle>
            </CardHeader>
            <div className="flex-1 overflow-auto max-h-[600px]">
              {isLoadingAttendees ? (
                <div className="p-8 text-center text-muted-foreground flex justify-center items-center">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading roster...
                </div>
              ) : !attendees || attendees.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                  <UsersIcon className="w-12 h-12 text-muted mb-4" />
                  <p>No attendees checked in yet.</p>
                </div>
              ) : (
                <>
                  {/* Mobile: stacked card list */}
                  <div className="sm:hidden divide-y divide-border">
                    {attendees.map(attendee => (
                      <div
                        key={attendee.memberId}
                        className="flex items-center justify-between px-4 py-3"
                        data-testid={`row-attendee-${attendee.memberId}`}
                      >
                        <div>
                          <div className="font-medium text-sm">
                            {attendee.firstName} {attendee.lastName}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {attendee.isc2Number} · {format(new Date(attendee.checkedInAt), "HH:mm")}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemove(attendee.memberId)}
                          className="ml-3 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                          title="Remove check-in"
                          data-testid={`button-remove-attendee-${attendee.memberId}`}
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: table */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>ISC2 Number</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendees.map(attendee => (
                          <TableRow key={attendee.memberId} data-testid={`row-attendee-${attendee.memberId}`}>
                            <TableCell className="font-medium">
                              {attendee.firstName} {attendee.lastName}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{attendee.isc2Number}</TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {format(new Date(attendee.checkedInAt), "HH:mm")}
                            </TableCell>
                            <TableCell>
                              <button
                                onClick={() => handleRemove(attendee.memberId)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                title="Remove check-in"
                                data-testid={`button-remove-attendee-${attendee.memberId}`}
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}

// Icon component missing from import
function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
