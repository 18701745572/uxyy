"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  useMessageInboxStore,
  type InboxMessage,
  type InboxMessageType,
} from "@/stores/message-inbox-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function typeStyle(t: InboxMessageType): { label: string; className: string } {
  switch (t) {
    case "price_alert":
      return { label: "价格/成本", className: "bg-amber-100 text-amber-900" };
    case "approval":
      return { label: "审批", className: "bg-sky-100 text-sky-900" };
    case "insight":
      return { label: "经营洞察", className: "bg-violet-100 text-violet-900" };
    default:
      return { label: "系统", className: "bg-zinc-100 text-zinc-800" };
  }
}

function MessageCard({
  m,
  onRead,
  onDismiss,
}: {
  m: InboxMessage;
  onRead: () => void;
  onDismiss: () => void;
}) {
  const meta = typeStyle(m.type);
  const time = new Date(m.createdAt).toLocaleString("zh-CN", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <Card
      className={`p-4 transition-colors ${
        m.read ? "border-zinc-100 bg-white" : "border-sky-200/80 bg-sky-50/40"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${meta.className}`}
          >
            {meta.label}
          </span>
          <h2 className="font-medium text-zinc-900 text-sm md:text-base">{m.title}</h2>
          {!m.read ? (
            <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-sky-500" />
          ) : null}
        </div>
        <time className="text-xs text-zinc-500 tabular-nums shrink-0">{time}</time>
      </div>
      <p className="mt-2 text-sm text-zinc-600 whitespace-pre-wrap leading-relaxed">
        {m.body}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {!m.read ? (
          <Button type="button" variant="secondary" size="sm" onClick={onRead}>
            标为已读
          </Button>
        ) : null}
        {m.link ? (
          <Button type="button" variant="primary" size="sm" asChild>
            <Link href={m.link}>{m.linkLabel ?? "前往处理"}</Link>
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
          关闭本条
        </Button>
      </div>
    </Card>
  );
}

export default function MessagesPage() {
  const messages = useMessageInboxStore((s) => s.messages);
  const seedIfEmpty = useMessageInboxStore((s) => s.seedIfEmpty);
  const markRead = useMessageInboxStore((s) => s.markRead);
  const markAllRead = useMessageInboxStore((s) => s.markAllRead);
  const dismiss = useMessageInboxStore((s) => s.dismiss);

  useEffect(() => {
    seedIfEmpty();
  }, [seedIfEmpty]);

  const sorted = [...messages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">消息中心</h1>
        <p className="mt-1 text-sm text-zinc-600">
          系统提醒、价格与成本异常示意、经营摘要等统一收拢于此；后续可对接服务端推送与实时告警。
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => markAllRead()}
          disabled={messages.every((m) => m.read)}
        >
          全部标为已读
        </Button>
      </div>

      {sorted.length === 0 ? (
        <Card className="p-8 text-center text-sm text-zinc-500">
          暂无消息。进销存与财务经营数据满足规则时，将在此推送价格类与库存类提醒（待对接后端）。
        </Card>
      ) : (
        <ul className="space-y-3">
          {sorted.map((m) => (
            <li key={m.id}>
              <MessageCard
                m={m}
                onRead={() => markRead(m.id)}
                onDismiss={() => dismiss(m.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
