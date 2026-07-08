export type AdminItemStatus = "inbox" | "tracked" | "done";

export type AdminItem = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  company: string | null;
  due_date: string;
  amount: string | null;
  action: string;
  note: string | null;
  status: AdminItemStatus;
  created_at: string;
};
