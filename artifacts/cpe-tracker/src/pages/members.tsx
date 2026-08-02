import { useState, useEffect } from "react";
import { useListMembers, useCreateMember, useDeleteMember, getListMembersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Search, UserPlus, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Members() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useListMembers(
    { search: debouncedSearch || undefined },
    { query: { queryKey: getListMembersQueryKey({ search: debouncedSearch || undefined }) } }
  );

  const createMember = useCreateMember({
    mutation: {
      onSuccess: () => {
        toast({ title: "Member added successfully" });
        setIsAdding(false);
        setNewMember({ firstName: "", lastName: "", isc2Number: "" });
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      },
      onError: (err) => {
        toast({
          title: "Error adding member",
          description: (err.data as { error?: string })?.error || "Unknown error occurred",
          variant: "destructive",
        });
      },
    },
  });

  const deleteMember = useDeleteMember({
    mutation: {
      onSuccess: () => {
        toast({ title: "Member removed" });
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      },
      onError: (err) => {
        toast({
          title: "Error removing member",
          description: (err.data as { error?: string })?.error || "Unknown error occurred",
          variant: "destructive",
        });
      },
    },
  });

  const [newMember, setNewMember] = useState({
    firstName: "",
    lastName: "",
    isc2Number: "",
  });

  // Handle search debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.firstName || !newMember.lastName || !newMember.isc2Number) return;
    createMember.mutate({ data: newMember });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMember.mutate({ id: deleteTarget.id });
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Member Directory</h1>
          <p className="text-muted-foreground mt-1">Manage and search chapter members</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} data-testid="button-add-member">
          {isAdding ? "Cancel" : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </>
          )}
        </Button>
      </div>

      {isAdding && (
        <Card className="border-primary/20 shadow-md">
          <CardContent className="pt-6">
            <form onSubmit={handleAddSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 w-full">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <Input
                    value={newMember.firstName}
                    onChange={e => setNewMember({ ...newMember, firstName: e.target.value })}
                    placeholder="Jane"
                    data-testid="input-first-name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <Input
                    value={newMember.lastName}
                    onChange={e => setNewMember({ ...newMember, lastName: e.target.value })}
                    placeholder="Doe"
                    data-testid="input-last-name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">ISC2 Number</label>
                  <Input
                    value={newMember.isc2Number}
                    onChange={e => setNewMember({ ...newMember, isc2Number: e.target.value.replace(/\D/g, "") })}
                    placeholder="123456"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    data-testid="input-isc2-number"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={createMember.isPending}
                data-testid="button-save-member"
              >
                {createMember.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Member"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="p-4 border-b border-border">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or ISC2 number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-members"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading directory...
          </div>
        ) : !members || members.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No members found matching your search
          </div>
        ) : (
          <>
            {/* ── Mobile card list (hidden on sm+) ── */}
            <div className="sm:hidden divide-y divide-border">
              {members.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between px-4 py-3 gap-3"
                  data-testid={`row-member-${member.id}`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono mt-0.5">
                      {member.isc2Number}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget({ id: member.id, name: `${member.firstName} ${member.lastName}` })}
                    data-testid={`button-delete-member-${member.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* ── Desktop table (hidden on mobile) ── */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ISC2 Number</TableHead>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(member => (
                    <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                      <TableCell className="font-mono font-medium">{member.isc2Number}</TableCell>
                      <TableCell>{member.firstName}</TableCell>
                      <TableCell>{member.lastName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget({ id: member.id, name: `${member.firstName} ${member.lastName}` })}
                          data-testid={`button-delete-member-${member.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.name}</strong> from the directory
              Their attendance records will also be removed. This cannot be undone
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Remove member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
