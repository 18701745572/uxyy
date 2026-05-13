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
import { cn } from "@/lib/utils";

function typeStyle(t: InboxMessageType): { label: string; className: string } {
  switch (t) {
    case "price_alert":
      return { 
        label: "价格/成本", 
        className: "bg-amber-500/20 text-amber-300 border border-amber-500/30" 
      };
    case "approval":
      return { 
        label: "审批", 
        className: "bg-sky-500/20 text-sky-300 border border-sky-500/30" 
      };
    case "insight":
      return { 
        label: "经营洞察", 
        className: "bg-violet-500/20 text-violet-300 border border-violet-500/30" 
      };
    default:
      return {
        label: "系统",
        className: "bg-text-tertiary/20 text-text-secondary border border-text-tertiary/30"
      };
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
      className={cn(
        "p-4 transition-all duration-200",
        m.read 
          ? "border-border-primary bg-bg-secondary/50" 
          : "border-accent-blue/30 bg-accent-blue/5"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", meta.className)}>
            {meta.label}
          </span>
          <h2 className={cn(
            "font-medium text-sm md:text-base",
            m.read ? "text-text-secondary" : "text-text-primary"
          )}>
            {m.title}
          </h2>
          {!m.read ? (
            <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-accent-blue animate-pulse" />
          ) : null}
        </div>
        <time className="text-xs text-text-quaternary tabular-nums shrink-0">{time}</time>
      </div>
      <p className="mt-2 text-sm text-text-tertiary whitespace-pre-wrap leading-relaxed">
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
        <h1 className="text-lg font-semibold text-text-primary">消息中心</h1>
        <p className="mt-1 text-sm text-text-tertiary">
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
        <Card className="p-8 text-center text-sm text-text-tertiary border-border-primary bg-bg-secondary/30">
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
