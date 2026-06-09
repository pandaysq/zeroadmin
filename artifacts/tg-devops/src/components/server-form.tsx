import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateServer, useUpdateServer, getListServersQueryKey, getGetServerQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const serverSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  host: z.string().min(1, "Host/IP is required").max(255),
  description: z.string().optional(),
});

type ServerFormValues = z.infer<typeof serverSchema>;

interface ServerFormProps {
  onSuccess?: () => void;
  defaultValues?: Partial<ServerFormValues> & { id?: number };
}

export function ServerForm({ onSuccess, defaultValues }: ServerFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!defaultValues?.id;

  const form = useForm<ServerFormValues>({
    resolver: zodResolver(serverSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      host: defaultValues?.host || "",
      description: defaultValues?.description || "",
    },
  });

  const createServer = useCreateServer({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Server Added",
          description: "Server has been successfully added to monitoring.",
        });
        queryClient.invalidateQueries({ queryKey: getListServersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        onSuccess?.();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to add server",
          variant: "destructive",
        });
      },
    }
  });

  const updateServer = useUpdateServer({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Server Updated",
          description: "Server configuration has been saved.",
        });
        queryClient.invalidateQueries({ queryKey: getListServersQueryKey() });
        if (defaultValues?.id) {
          queryClient.invalidateQueries({ queryKey: getGetServerQueryKey(defaultValues.id) });
        }
        onSuccess?.();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to update server",
          variant: "destructive",
        });
      },
    }
  });

  function onSubmit(data: ServerFormValues) {
    if (isEditing && defaultValues.id) {
      updateServer.mutate({ id: defaultValues.id, data });
    } else {
      createServer.mutate({ data });
    }
  }

  const isPending = createServer.isPending || updateServer.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Server Name</FormLabel>
              <FormControl>
                <Input placeholder="prod-db-01" className="bg-background" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="host"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Host / IP Address</FormLabel>
              <FormControl>
                <Input placeholder="10.0.0.45" className="bg-background font-mono" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Primary database cluster node" 
                  className="bg-background resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="pt-4 flex justify-end">
          <Button type="submit" disabled={isPending} className="font-mono">
            {isPending ? "SAVING..." : isEditing ? "SAVE CHANGES" : "ADD SERVER"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
