import { apiFetch } from "./client";

export type NotificationType = "approval" | "system" | "reminder";
export type NotificationPriority = "low" | "normal" | "high";

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  content: string;
  priority: NotificationPriority;
  isRead: boolean;
  sourceType: string | null;
  sourceId: number | null;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  data: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UnreadCountResponse {
  count: number;
}

/**
 * 获取用户通知列表
 */
export async function fetchNotifications(params: {
  page?: number;
  pageSize?: number;
  isRead?: boolean;
  type?: NotificationType;
} = {}): Promise<NotificationsResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.isRead !== undefined) searchParams.set("isRead", String(params.isRead));
  if (params.type) searchParams.set("type", params.type);

  const qs = searchParams.toString();
  return apiFetch<NotificationsResponse>(
    `/oa/notifications${qs ? `?${qs}` : ""}`
  );
}

/**
 * 获取未读通知数量
 */
export async function fetchUnreadCount(): Promise<UnreadCountResponse> {
  return apiFetch<UnreadCountResponse>("/oa/notifications/unread-count");
}

/**
 * 标记通知为已读
 */
export async function markNotificationAsRead(id: number): Promise<Notification> {
  return apiFetch<Notification>(`/oa/notifications/${id}/read`, {
    method: "PATCH",
  });
}

/**
 * 标记所有通知为已读
 */
export async function markAllNotificationsAsRead(): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/oa/notifications/read-all", {
    method: "POST",
  });
}

/**
 * 删除通知
 */
export async function deleteNotification(id: number): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/oa/notifications/${id}`, {
    method: "DELETE",
  });
}

/**
 * 获取通知优先级对应的颜色
 */
export function getNotificationPriorityColor(priority: NotificationPriority): string {
  switch (priority) {
    case "high":
      return "text-red-600 bg-red-50 border-red-100";
    case "normal":
      return "text-blue-600 bg-blue-50 border-blue-100";
    case "low":
      return "text-text-secondary bg-bg-secondary border-border-secondary";
    default:
      return "text-text-secondary bg-bg-secondary border-border-secondary";
  }
}

/**
 * 获取通知类型对应的图标
 */
export function getNotificationTypeIcon(type: NotificationType): string {
  switch (type) {
    case "approval":
      return "✓";
    case "system":
      return "🔔";
    case "reminder":
      return "⏰";
    default:
      return "📌";
  }
}

/**
 * 获取通知类型对应的标签文字
 */
export function getNotificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case "approval":
      return "审批";
    case "system":
      return "系统";
    case "reminder":
      return "提醒";
    default:
      return "通知";
  }
}
