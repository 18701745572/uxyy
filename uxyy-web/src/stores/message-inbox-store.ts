"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type InboxMessageType =
  | "price_alert"
  | "system"
  | "approval"
  | "insight";

export interface InboxMessage {
  id: string;
  type: InboxMessageType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  link?: string;
  linkLabel?: string;
}

function seedMessages(): InboxMessage[] {
  const now = new Date().toISOString();
  return [
    {
      id: "seed-price-v1",
      type: "price_alert",
      title: "采购均价波动超过阈值（示意）",
      body:
        "监测到示例 SKU 本期采购均价较上期上升约 18%，超过企业设定提醒线 15%。建议核对供应商报价单与最近一次入库单价，排除录错或合同变更未同步。",
      createdAt: now,
      read: false,
      link: "/dashboard/inventory",
      linkLabel: "进销存 · 采购与商品",
    },
    {
      id: "seed-system-v1",
      type: "system",
      title: "消息中心已启用",
      body:
        "系统、价格类提醒与审批摘要将统一收拢在此页。后续若对接服务端推送，未读角标将与之同步。",
      createdAt: now,
      read: false,
      link: "/dashboard/finance/reports",
      linkLabel: "财务报表 · 经营仪表盘",
    },
    {
      id: "seed-insight-v1",
      type: "insight",
      title: "经营分析图表已增强",
      body:
        "在「财务报表 → 经营仪表盘」可查看销售/采购对比与热销商品条形图；利润表页提供收入/成本/费用结构图，便于周会快速过数。",
      createdAt: now,
      read: false,
      link: "/dashboard/finance/reports",
      linkLabel: "打开经营仪表盘",
    },
  ];
}

interface MessageInboxState {
  messages: InboxMessage[];
  inboxInitialized: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  seedIfEmpty: () => void;
  dismiss: (id: string) => void;
}

export const useMessageInboxStore = create<MessageInboxState>()(
  persist(
    (set, get) => ({
      messages: [],
      inboxInitialized: false,
      markRead: (id) =>
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === id ? { ...m, read: true } : m,
          ),
        })),
      markAllRead: () =>
        set((s) => ({
          messages: s.messages.map((m) => ({ ...m, read: true })),
        })),
      seedIfEmpty: () => {
        const { messages, inboxInitialized } = get();
        if (inboxInitialized) return;
        if (messages.length > 0) {
          set({ inboxInitialized: true });
          return;
        }
        set({ messages: seedMessages(), inboxInitialized: true });
      },
      dismiss: (id) =>
        set((s) => ({
          messages: s.messages.filter((m) => m.id !== id),
        })),
    }),
    {
      name: "uxyy-message-inbox-v1",
      partialize: (s) => ({
        messages: s.messages,
        inboxInitialized: s.inboxInitialized,
      }),
    },
  ),
);

export function useUnreadMessageCount(): number {
  return useMessageInboxStore((s) => s.messages.filter((m) => !m.read).length);
}
