import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetEvent, useUpdateEvent, getGetEventQueryKey, EventUpdateGroupType } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function EditEvent() {
  const { id } = useParams();
  const eventId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useGetEvent(eventId, {
    query: { enabled: !!eventId, queryKey: getGetEventQueryKey(eventId) }
  });

  const [formData, setFormData] = useState<{
    name: string;
    date: string;
    groupType: EventUpdateGroupType;
    cpeCredits: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    if (event && !formData) {
      setFormData({
        name: event.name,
        date: event.date,
        groupType: event.groupType as EventUpdateGroupType,
        cpeCredits: String(event.cpeCredits),
        description: event.description,
      });
    }
  }, [event]);

  const updateEvent = useUpdateEvent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Event updated" });
        queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(eventId) });
        setLocation(`/events/${eventId}`);
      },
      onError: (err) => {
        toast({
          title: "Failed to update event",
          description: (err.data as { error?: string })?.error || "Check your input and try again.",
          variant: "destructive",
        });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    updateEvent.mutate({
      id: eventId,
      data: {
        name: formData.name,
        date: formData.date,
        groupType: formData.groupType,
        cpeCredits: parseFloat(formData.cpeCredits),
        description: formData.description,
      },
    });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.replace(/[,"']/g, "");
    if (val.length <= 100) {
      setFormData(prev => prev ? { ...prev, description: val } : prev);
    }
  };

  if (isLoading || !formData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Edit Event</h1>
        <p className="text-muted-foreground mt-1">Update the details for this event.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Event Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(prev => prev ? { ...prev, name: e.target.value } : prev)}
                placeholder="e.g. Q3 Chapter Meeting"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="date">Event Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(prev => prev ? { ...prev, date: e.target.value } : prev)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpeCredits">CPE Credits</Label>
                <Input
                  id="cpeCredits"
                  type="number"
                  min="0.25"
                  max="40"
                  step="0.25"
                  value={formData.cpeCredits}
                  onChange={e => setFormData(prev => prev ? { ...prev, cpeCredits: e.target.value } : prev)}
                  placeholder="e.g. 1"
                  required
                />
                <p className="text-xs text-muted-foreground">.25, .50, .75, or 1 per hour — MAX 40 CPEs</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Group Type</Label>
              <div className="flex gap-4">
                <label
                  className="flex items-center gap-2 border rounded-md p-4 flex-1 cursor-pointer hover:bg-accent transition-colors data-[selected=true]:border-primary data-[selected=true]:bg-primary/5"
                  data-selected={formData.groupType === EventUpdateGroupType.Group_A}
                >
                  <input
                    type="radio"
                    name="groupType"
                    value={EventUpdateGroupType.Group_A}
                    checked={formData.groupType === EventUpdateGroupType.Group_A}
                    onChange={() => setFormData(prev => prev ? { ...prev, groupType: EventUpdateGroupType.Group_A } : prev)}
                    className="sr-only"
                  />
                  <div>
                    <div className="font-semibold text-sm">Group A</div>
                    <div className="text-xs text-muted-foreground mt-1">Domain-related activities</div>
                  </div>
                </label>
                <label
                  className="flex items-center gap-2 border rounded-md p-4 flex-1 cursor-pointer hover:bg-accent transition-colors data-[selected=true]:border-primary data-[selected=true]:bg-primary/5"
                  data-selected={formData.groupType === EventUpdateGroupType.Group_B}
                >
                  <input
                    type="radio"
                    name="groupType"
                    value={EventUpdateGroupType.Group_B}
                    checked={formData.groupType === EventUpdateGroupType.Group_B}
                    onChange={() => setFormData(prev => prev ? { ...prev, groupType: EventUpdateGroupType.Group_B } : prev)}
                    className="sr-only"
                  />
                  <div>
                    <div className="font-semibold text-sm">Group B</div>
                    <div className="text-xs text-muted-foreground mt-1">Management/Officer meetings, no domain</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="description">Description</Label>
                <span className={`text-xs ${formData.description.length === 100 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {formData.description.length}/100
                </span>
              </div>
              <textarea
                id="description"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-none"
                value={formData.description}
                onChange={handleDescriptionChange}
                placeholder="e.g. August Chapter Mtg - Cloud Security"
                required
              />
              <p className="text-xs text-muted-foreground">
                Appears as the Title in each member's ISC2 record. Max 100 characters — commas and quotes are not allowed and will be removed automatically.
              </p>
            </div>

            <div className="pt-4 flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => setLocation(`/events/${eventId}`)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateEvent.isPending}>
                {updateEvent.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
