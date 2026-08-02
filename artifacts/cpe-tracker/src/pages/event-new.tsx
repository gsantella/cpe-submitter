import { useState } from "react";
import { useCreateEvent } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { EventInputGroupType } from "@workspace/api-client-react";

export default function NewEvent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [descriptionTouched, setDescriptionTouched] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    date: string;
    groupType: EventInputGroupType;
    cpeCredits: string;
    description: string;
  }>({
    name: "",
    date: new Date().toISOString().split("T")[0],
    groupType: EventInputGroupType.Group_A,
    cpeCredits: "1",
    description: ""
  });

  const createEvent = useCreateEvent({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Event created successfully" });
        setLocation(`/events/${data.id}`);
      },
      onError: (err) => {
        toast({ 
          title: "Failed to create event", 
          description: (err.data as { error?: string })?.error || "Check your input and try again.",
          variant: "destructive" 
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEvent.mutate({
      data: {
        name: formData.name,
        date: formData.date,
        groupType: formData.groupType,
        cpeCredits: parseFloat(formData.cpeCredits),
        description: formData.description
      }
    });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescriptionTouched(true);
    const val = e.target.value.replace(/[,"']/g, ""); // Strip commas and single/double quotes
    if (val.length <= 100) {
      setFormData(prev => ({ ...prev, description: val }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Create Event</h1>
        <p className="text-muted-foreground mt-1">Add a new chapter meeting or activity</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Event Name</Label>
              <Input 
                id="name"
                value={formData.name}
                onChange={e => {
                  const name = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    name,
                    ...(descriptionTouched ? {} : {
                      description: name.replace(/[,"']/g, "").slice(0, 100)
                    })
                  }));
                }}
                placeholder="e.g. Q3 Chapter Meeting"
                required
                data-testid="input-event-name"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="date">Event Date</Label>
                <Input 
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                  data-testid="input-event-date"
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
                  onChange={e => setFormData(prev => ({ ...prev, cpeCredits: e.target.value }))}
                  placeholder="e.g. 1"
                  required
                  data-testid="input-cpe-credits"
                />
                <p className="text-xs text-muted-foreground">.25, .50, .75, or 1 per hour — MAX 40 CPEs</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Group Type</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 border rounded-md p-4 flex-1 cursor-pointer hover:bg-accent transition-colors data-[selected=true]:border-primary data-[selected=true]:bg-primary/5" data-selected={formData.groupType === EventInputGroupType.Group_A}>
                  <input 
                    type="radio" 
                    name="groupType" 
                    value={EventInputGroupType.Group_A}
                    checked={formData.groupType === EventInputGroupType.Group_A}
                    onChange={() => setFormData(prev => ({ ...prev, groupType: EventInputGroupType.Group_A }))}
                    className="sr-only"
                    data-testid="radio-group-a"
                  />
                  <div>
                    <div className="font-semibold text-sm">Group A</div>
                    <div className="text-xs text-muted-foreground mt-1">Domain-related activities</div>
                  </div>
                </label>
                <label className="flex items-center gap-2 border rounded-md p-4 flex-1 cursor-pointer hover:bg-accent transition-colors data-[selected=true]:border-primary data-[selected=true]:bg-primary/5" data-selected={formData.groupType === EventInputGroupType.Group_B}>
                  <input 
                    type="radio" 
                    name="groupType" 
                    value={EventInputGroupType.Group_B}
                    checked={formData.groupType === EventInputGroupType.Group_B}
                    onChange={() => setFormData(prev => ({ ...prev, groupType: EventInputGroupType.Group_B }))}
                    className="sr-only"
                    data-testid="radio-group-b"
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
                <span className={`text-xs ${formData.description.length === 100 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
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
                data-testid="input-event-description"
              />
              <p className="text-xs text-muted-foreground">
                Appears as the Title in each member's ISC2 record. Max 100 characters — commas and quotes are not allowed and will be removed automatically.
              </p>
            </div>

            <div className="pt-4 flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => setLocation('/events')} data-testid="button-cancel-event">
                Cancel
              </Button>
              <Button type="submit" disabled={createEvent.isPending} data-testid="button-save-event">
                {createEvent.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Event
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
