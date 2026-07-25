import { useListEvents } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Events() {
  const { data: events, isLoading } = useListEvents();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Events</h1>
          <p className="text-muted-foreground mt-1">Manage chapter meetings and track CPE attendance.</p>
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
                    <Link 
                      href={`/events/${event.id}`}
                      className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                      data-testid={`link-manage-${event.id}`}
                    >
                      Manage <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
