import { useState } from "react";
import { useListServers, getListServersQueryKey, useDeleteServer } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Server, Plus, MoreVertical, Trash2, Edit } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Link } from "wouter";
import { formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ServerForm } from "@/components/server-form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function ServersList() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: servers, isLoading } = useListServers({
    query: {
      queryKey: getListServersQueryKey(),
      refetchInterval: 10000
    }
  });

  const deleteServer = useDeleteServer({
    mutation: {
      onSuccess: () => {
        toast({ title: "Server deleted" });
        queryClient.invalidateQueries({ queryKey: getListServersQueryKey() });
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Fleet Management</h1>
          <p className="text-muted-foreground text-sm">Monitor and configure all registered servers.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="font-mono text-xs">
              <Plus className="w-4 h-4 mr-2" />
              ADD SERVER
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] border-border/50 bg-card/95 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="font-mono">NEW SERVER</DialogTitle>
              <DialogDescription>
                Register a new server to begin monitoring. You will get an agent token after creation.
              </DialogDescription>
            </DialogHeader>
            <ServerForm onSuccess={() => setIsAddOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-[200px] font-mono text-xs">NAME</TableHead>
              <TableHead className="font-mono text-xs">STATUS</TableHead>
              <TableHead className="font-mono text-xs">HOST</TableHead>
              <TableHead className="hidden md:table-cell font-mono text-xs">REGISTERED</TableHead>
              <TableHead className="text-right font-mono text-xs">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-border/50">
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : servers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Server className="w-8 h-8 mb-3 opacity-50" />
                    <p>No servers found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              servers?.map((server) => (
                <TableRow key={server.id} className="border-border/50 hover:bg-white/5 transition-colors group">
                  <TableCell className="font-medium">
                    <Link href={`/servers/${server.id}`} className="hover:text-primary transition-colors hover:underline">
                      {server.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={server.status as any} />
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {server.host}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {formatDate(server.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border-border/50 bg-card/95 backdrop-blur-xl">
                        <Link href={`/servers/${server.id}`}>
                          <DropdownMenuItem className="cursor-pointer font-mono text-xs">
                            <Server className="mr-2 h-4 w-4" />
                            VIEW DETAILS
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem 
                          className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive font-mono text-xs"
                          onClick={() => {
                            if (window.confirm("Delete this server? This action cannot be undone.")) {
                              deleteServer.mutate({ id: server.id });
                            }
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          DELETE SERVER
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
