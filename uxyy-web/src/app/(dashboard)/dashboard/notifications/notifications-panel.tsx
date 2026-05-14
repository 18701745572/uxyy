"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationPriorityColor,
  getNotificationTypeIcon,
  getNotificationTypeLabel,
  type Notification,
  type NotificationType,
} from "@/lib/api/notifications";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiErrorCallout } from "@/components/ui/api-error-callout";
import { formatDistanceToNow } from "@/lib/utils";

export function NotificationsPanel() {
  const [filterType, setFilterType] = useState<NotificationType | "all">("all");
  const [filterRead, setFilterRead] = useState<"all" | "read" | "unread">("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["notifications", page, pageSize, filterType, filterRead],
    queryFn: () =>
      fetchNotifications({
        page,
        pageSize,
        type: filterType === "all" ? undefined : filterType,
        isRead:
          filterRead === "read" ? true : filterRead === "unread" ? false : undefined,
      }),
  });

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  function handleMarkAsRead(id: number) {
    markAsReadMutation.mutate(id);
  }

  function handleMarkAllAsRead() {
    if (confirm("确定要将所有通知标记为已读吗？")) {
      markAllAsReadMutation.mutate();
    }
  }

  function handleDelete(id: number) {
    if (confirm("确定要删除这条通知吗？")) {
      deleteMutation.mutate(id);
    }
  }

  function NotificationCard({ notification }: { notification: Notification }) {
    const priorityClass = getNotificationPriorityColor(notification.priority);
    const typeIcon = getNotificationTypeIcon(notification.type);
    const typeLabel = getNotificationTypeLabel(notification.type);

    return (
      <div
        className={`relative p-4 border rounded-lg transition-all ${
          notification.isRead
            ? "bg-white border-border-primary"
            : "bg-blue-50/30 border-blue-200"
        }`}
      >
        <div className="flex items-start gap-3">
          {/* 类型图标 */}
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${priorityClass}`}
          >
            {typeIcon}
          </div>

          {/* 内容区域 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${priorityClass}`}
              >
                {typeLabel}
              </span>
              {!notification.isRead && (
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              )}
              <span className="text-xs text-text-muted ml-auto">
                {formatDistanceToNow(notification.createdAt)}
              </span>
            </div>

            <h3 className="text-sm font-medium text-text-primary mb-1">
              {notification.title}
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {notification.content}
            </p>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2 mt-3">
              {!notification.isRead && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleMarkAsRead(notification.id)}
                  disabled={markAsReadMutation.isPending}
                >
                  标记已读
                </Button>
              )}
              {notification.actionUrl && (
                <Link href={notification.actionUrl}>
                  <Button variant="primary" size="sm">
                    查看详情
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(notification.id)}
                disabled={deleteMutation.isPending}
                className="text-text-muted hover:text-red-600"
              >
                删除
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">通知中心</h1>
        {data && data.unreadCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-tertiary">
              未读通知: <strong className="text-red-600">{data.unreadCount}</strong>
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              全部已读
            </Button>
          </div>
        )}
      </div>

      {/* 筛选器 */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-tertiary">类型:</span>
            <select
              className="text-sm rounded-md border border-border-primary bg-bg-secondary text-text-primary px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as NotificationType | "all");
                setPage(1);
              }}
            >
              <option value="all">全部</option>
              <option value="approval">审批</option>
              <option value="system">系统</option>
              <option value="reminder">提醒</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-text-tertiary">状态:</span>
            <select
              className="text-sm rounded-md border border-border-primary bg-bg-secondary text-text-primary px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all"
              value={filterRead}
              onChange={(e) => {
                setFilterRead(e.target.value as "all" | "read" | "unread");
                setPage(1);
              }}
            >
              <option value="all">全部</option>
              <option value="unread">未读</option>
              <option value="read">已读</option>
            </select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="ml-auto"
          >
            {isFetching ? "刷新中..." : "刷新"}
          </Button>
        </div>
      </Card>

      {/* 通知列表 */}
      <Card className="p-4">
        {isLoading ? (
          <div className="py-8 text-center text-text-tertiary">加载中...</div>
        ) : isError ? (
          <ApiErrorCallout
            error={error}
            title="加载通知失败"
            onRetry={() => refetch()}
            retrying={isFetching}
          />
        ) : data?.data.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-4xl mb-3">🔔</div>
            <p className="text-text-tertiary">暂无通知</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.data.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))}
          </div>
        )}

        {/* 分页 */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-secondary">
            <span className="text-sm text-text-tertiary">
              共 {data.total} 条通知，第 {data.page} / {data.totalPages} 页
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
              >
                上一页
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages || isFetching}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
