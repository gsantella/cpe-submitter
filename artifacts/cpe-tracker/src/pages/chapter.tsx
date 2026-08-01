import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Building2, ShieldCheck, ShieldOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
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

interface CredentialsState {
  enabled: boolean;
  username: string | null;
  managedByEnv: boolean;
}

export default function Chapter() {
  const { toast } = useToast();
  const { refetch: refetchAuth, logout } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const [chapterName, setChapterName] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Auth credentials state
  const [creds, setCreds] = useState<CredentialsState | null>(null);
  const [credsLoading, setCredsLoading] = useState(true);
  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [credsSaving, setCredsSaving] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  useEffect(() => {
    if (settings?.chapterName !== undefined) {
      setChapterName(settings.chapterName);
      setIsDirty(false);
    }
  }, [settings?.chapterName]);

  const loadCreds = async () => {
    setCredsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/auth/credentials`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCreds(data);
        setNewUsername(data.username ?? "");
      }
    } finally {
      setCredsLoading(false);
    }
  };

  useEffect(() => { loadCreds(); }, []);

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

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setCredsSaving(true);
    try {
      const body: Record<string, string> = { username: newUsername, newPassword };
      if (creds?.enabled) body.currentPassword = currentPassword;

      const res = await fetch(`${import.meta.env.BASE_URL}api/auth/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast({ title: creds?.enabled ? "Credentials updated" : "Sign-in enabled" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        await loadCreds();
        await refetchAuth();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error ?? "Unknown error", variant: "destructive" });
      }
    } finally {
      setCredsSaving(false);
    }
  };

  const handleDisableAuth = async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}api/auth/credentials`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      toast({ title: "Sign-in disabled" });
      await logout();
      await refetchAuth();
      await loadCreds();
    } else {
      const data = await res.json();
      toast({ title: "Error", description: data.error ?? "Unknown error", variant: "destructive" });
    }
    setShowDisableConfirm(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Chapter Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your ISC2 chapter information</p>
      </div>

      {/* Chapter Name */}
      <Card className="max-w-xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-4 h-4 text-primary" />
            Chapter Information
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  This appears in the ISC2 CPE submission spreadsheet
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

      <Separator className="max-w-xl" />

      {/* Security */}
      <Card className="max-w-xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Sign-In Protection
          </CardTitle>
          <CardDescription>
            {creds?.enabled
              ? "Sign-in is currently enabled. Only someone with the password can access this app."
              : "Sign-in is currently disabled. Anyone with access to this URL can use the app."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {credsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          ) : creds?.managedByEnv ? (
            <p className="text-sm text-muted-foreground">
              Credentials are managed via environment variables (<code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">AUTH_USERNAME</code> / <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">AUTH_PASSWORD</code>) and cannot be changed here.
            </p>
          ) : (
            <form onSubmit={handleSaveCredentials} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="authUsername">Username</Label>
                <Input
                  id="authUsername"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="e.g. officer"
                  required
                  disabled={credsSaving}
                />
              </div>

              {creds?.enabled && (
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    disabled={credsSaving}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  {creds?.enabled ? "New Password" : "Password"}
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={credsSaving}
                />
                <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={credsSaving}
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={credsSaving}>
                  {credsSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {creds?.enabled ? "Update Credentials" : "Enable Sign-In"}
                </Button>

                {creds?.enabled && (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setShowDisableConfirm(true)}
                    disabled={credsSaving}
                  >
                    <ShieldOff className="w-4 h-4 mr-2" />
                    Disable Sign-In
                  </Button>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDisableConfirm} onOpenChange={setShowDisableConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable sign-in?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the username and password and allow anyone with access to this URL to use the app. You will be signed out immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDisableAuth}
            >
              Disable Sign-In
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
