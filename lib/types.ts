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
  document_name: string | null;
  document_path: string | null;
  document_type: string | null;
  status: AdminItemStatus;
  created_at: string;
};

export type AdminItemInsert = {
  title: string;
  category: string;
  company?: string | null;
  due_date: string;
  amount?: string | null;
  action: string;
  note?: string | null;
  document_name?: string | null;
  document_path?: string | null;
  document_type?: string | null;
  status?: AdminItemStatus;
};
