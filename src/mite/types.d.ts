type Rate = {
  service_id: number;
  hourly_rate: number;
};

export type Customer = {
  id: number;
  name: string;
  hourly_rate: number;
  active_hourly_rate: "hourly_rate" | "hourly_rates_per_service" | null;
  hourly_rates_per_service: Rate[];
  note: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
};

export type Project = {
  id: number;
  name: string;
  customer_id: number;
  customer_name: string;
  budget: number;
  budget_type: "minutes" | "minutes_per_month" | "cents" | "cents_per_month";
  hourly_rate: number;
  active_hourly_rate: "hourly_rate" | "hourly_rates_per_service" | null;
  hourly_rates_per_service: Rate[];
  note: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
};

export type Service = {
  id: number;
  name: string;
  billable: boolean;
  hourly_rate: number;
  note: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
};

export type TimeEntry = {
  id: number;
  date_at: string;
  minutes: number;
  started_time: string | null;
  service_id: number;
  service_name: string;
  project_id: number;
  project_name: string;
  customer_id: number;
  customer_name: string;
  user_id: number;
  user_name: string;
  note: string;
  billable: boolean;
  hourly_rate: number;
  revenue: number;
  tracking?: {
    since: string;
    minutes: number;
  };
  locked: boolean;
  created_at: string;
  updated_at: string;
};

export type TimeEntryGroup = {
  minutes: number;
  from: string;
  to: string;
  time_entries_params: Record<string, string>;
} & (
  | {
      user_id: number;
      user_name: string;
    }
  | {
      customer_id: number;
      customer_name: string;
    }
  | {
      project_id: number;
      project_name: string;
    }
  | {
      service_id: number;
      service_name: string;
    }
  | {
      day: string;
    }
  | {
      week: string;
    }
  | {
      month: string;
    }
  | {
      year: string;
    }
);

export type TimeEntriesQuery = {
  customer_id?: number;
  at?:
    | "today"
    | "yesterday"
    | "this_week"
    | "last_week"
    | "this_month"
    | "last_month"
    | "this_year"
    | "last_year"
    | string;
  tracking?: boolean;
};

export type GroupedTimeEntriesQuery = TimeEntriesQuery & {
  group_by:
    | "user"
    | "customer"
    | "project"
    | "service"
    | "day"
    | "week"
    | "month"
    | "year";
};

export type Tracker = {
  tracking_time_entry?: {
    id: number;
    minutes: number;
    since: string;
  };
  stopped_time_entry?: {
    id: number;
    minutes: number;
  };
};
