import { toast } from "sonner";

/** 场景化成功反馈：主文案 + 一行补充说明，减少「点了不知道成没成」 */
export function toastSaved(context?: string) {
  toast.success(context ? `已保存：${context}` : "已保存", {
    description: "变更已提交到服务端，列表将自动刷新。",
  });
}

export function toastDeleted(what = "记录") {
  toast.success(`已删除${what}`, {
    description: "如为误删，请联系管理员看是否可从备份恢复（视企业配置而定）。",
  });
}

export function toastSubmitted(what = "申请") {
  toast.success(`已提交${what}`, {
    description: "提交成功后通常进入审批或处理队列，可在对应列表中跟踪状态。",
  });
}

export function toastCopied() {
  toast.success("已复制到剪贴板");
}

export function toastNetworkOrUnknownErr(err: unknown, fallback = "操作失败") {
  const msg = err instanceof Error ? err.message : String(err);
  toast.error(msg || fallback, {
    description: "请检查网络后重试；若为权限问题请联系管理员。",
  });
}
