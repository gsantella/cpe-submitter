import { useState } from "react";
import { useListEvents, useDeleteEvent, getListEventsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, ArrowRight, Loader2, Trash2, Users, Award } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Events() {
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useListEvents();

  const deleteEvent = useDeleteEvent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Event deleted" });
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
      },
      onError: (err) => {
        toast({
          title: "Error deleting event",
          description: (err.data as { error?: string })?.error || "Unknown error occurred",
          variant: "destructive",
        });
      },
    },
  });

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteEvent.mutate({ id: deleteTarget.id });
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Events</h1>
          <p className="text-muted-foreground mt-1">Manage chapter meetings and track CPE attendance</p>
        </div>
        <Link href="/events/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2" data-testid="button-create-event">
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Link>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading events...
          </div>
        ) : !events || events.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No events found. Create one to get started.
          </div>
        ) : (
          <>
            {/* ── Mobile card list (hidden on sm+) ── */}
            <div className="sm:hidden divide-y divide-border">
              {events.map(event => (
                <div
                  key={event.id}
                  className="px-4 py-3 space-y-2"
                  data-testid={`row-event-${event.id}`}
                >
                  {/* Name + badge row */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground leading-snug">{event.name}</p>
                    <Badge
                      variant={event.groupType === "Group A" ? "default" : "secondary"}
                      className="flex-shrink-0"
                    >
                      {event.groupType}
                    </Badge>
                  </div>

                  {/* Date + stats row */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="font-mono">{format(new Date(event.date), "yyyy-MM-dd")}</span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      {event.cpeCredits} CPE
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {event.attendeeCount}
                    </span>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={`/events/${event.id}`}
                      className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                      data-testid={`link-manage-${event.id}`}
                    >
                      Manage Check-ins <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget({ id: event.id, name: event.name })}
                      data-testid={`button-delete-event-${event.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Desktop table (hidden on mobile) ── */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                    <TableHead className="text-right">Attendees</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map(event => (
                    <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                      <TableCell className="font-mono text-sm whitespace-nowrap">
                        {format(new Date(event.date), "yyyy-MM-dd")}
                      </TableCell>
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell>
                        <Badge variant={event.groupType === "Group A" ? "default" : "secondary"}>
                          {event.groupType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{event.cpeCredits}</TableCell>
                      <TableCell className="text-right font-mono">{event.attendeeCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget({ id: event.id, name: event.name })}
                            data-testid={`button-delete-event-${event.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Link
                            href={`/events/${event.id}`}
                            className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                            data-testid={`link-manage-${event.id}`}
                          >
                            Manage <ArrowRight className="w-4 h-4 ml-1" />
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all of its
              attendance records. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
