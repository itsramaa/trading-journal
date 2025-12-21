import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export interface AccountLink {
  id: string;
  parent_account_id: string;
  child_account_id: string;
  link_type: string;
  user_id: string;
  created_at: string;
}

export interface CreateAccountLinkInput {
  parent_account_id: string;
  child_account_id: string;
  link_type?: string;
}

const ACCOUNT_LINKS_KEY = ["account-links"];

export function useAccountLinks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ACCOUNT_LINKS_KEY,
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("account_links")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as AccountLink[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateAccountLink() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAccountLinkInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Validate: parent and child can't be the same
      if (input.parent_account_id === input.child_account_id) {
        throw new Error("Cannot link an account to itself");
      }

      const { data, error } = await supabase
        .from("account_links")
        .insert({
          user_id: user.id,
          parent_account_id: input.parent_account_id,
          child_account_id: input.child_account_id,
          link_type: input.link_type || "general",
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("This link already exists");
        }
        throw error;
      }
      return data as AccountLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNT_LINKS_KEY });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account link created");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteAccountLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("account_links")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNT_LINKS_KEY });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account link removed");
    },
    onError: (error) => {
      toast.error(`Failed to remove link: ${error.message}`);
    },
  });
}

// Get linked accounts for a specific parent account
export function useLinkedAccounts(parentAccountId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...ACCOUNT_LINKS_KEY, "children", parentAccountId],
    queryFn: async () => {
      if (!user?.id || !parentAccountId) return [];

      const { data, error } = await supabase
        .from("account_links")
        .select(`
          *,
          child_account:accounts!account_links_child_account_id_fkey(*)
        `)
        .eq("user_id", user.id)
        .eq("parent_account_id", parentAccountId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!parentAccountId,
  });
}

// Get parent accounts for a specific child account
export function useParentAccounts(childAccountId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...ACCOUNT_LINKS_KEY, "parents", childAccountId],
    queryFn: async () => {
      if (!user?.id || !childAccountId) return [];

      const { data, error } = await supabase
        .from("account_links")
        .select(`
          *,
          parent_account:accounts!account_links_parent_account_id_fkey(*)
        `)
        .eq("user_id", user.id)
        .eq("child_account_id", childAccountId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!childAccountId,
  });
}
