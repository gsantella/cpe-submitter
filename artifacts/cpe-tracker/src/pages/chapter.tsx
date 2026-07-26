import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Chapter() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const [chapterName, setChapterName] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (settings?.chapterName !== undefined) {
      setChapterName(settings.chapterName);
      setIsDirty(false);
    }
  }, [settings?.chapterName]);

  const updateSettings = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        toast({ title: "Chapter name saved" });
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        setIsDirty(false);
      },
      onError: (err) => {
        toast({
          title: "Error saving chapter name",
          description: (err.data as { error?: string })?.error || "Unknown error occurred",
          variant: "destructive",
        });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate({ data: { chapterName } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Chapter Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your ISC2 chapter information.</p>
        </div>
      </div>

      <Card className="max-w-xl">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chapterName">ISC2 Official Chapter Name</Label>
                <Input
                  id="chapterName"
                  value={chapterName}
                  onChange={e => { setChapterName(e.target.value); setIsDirty(true); }}
                  placeholder="e.g. Pennsylvania Highlands Chapter"
                  maxLength={200}
                  data-testid="input-chapter-name"
                />
                <p className="text-xs text-muted-foreground">
                  This appears in cell B2 of every exported ISC2 CPE submission spreadsheet.
                </p>
              </div>
              <Button
                type="submit"
                disabled={updateSettings.isPending || !isDirty}
                data-testid="button-save-chapter"
              >
                {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
