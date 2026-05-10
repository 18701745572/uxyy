import { ApiError, UnauthorizedError } from "./client";

/** 面向用户的 HTTP 状态与文案提示，用于错误卡片中的「您可以尝试」列表 */
export function recoveryStepsForApiError(error: unknown): string[] {
  const steps: string[] = [];

  if (error instanceof UnauthorizedError) {
    steps.push("会话已失效，请重新登录后再操作。");
    return steps;
  }

  if (!(error instanceof ApiError)) {
    steps.push("若问题持续，可刷新页面或稍后再试。");
    return steps;
  }

  const { status, message } = error;
  const lower = message.toLowerCase();

  if (status === 403) {
    steps.push(
      "当前账号缺少所需权限，请联系企业管理员在「企业成员」中调整角色或分配权限。",
    );
    steps.push("若您有多企业账号，可尝试切换到已授权的企业空间。");
  } else if (status === 404) {
    steps.push("资源可能已被他人删除或您无权查看，请返回列表刷新后再打开。");
  } else if (status === 409) {
    steps.push("数据状态已被其他操作改变，请刷新页面获取最新数据后重试。");
  } else if (status === 422 || status === 400) {
    steps.push("请根据上方具体提示检查表单必填项与格式（如日期、金额）。");
  } else if (status >= 500) {
    steps.push("多为服务端暂时不可用，请稍后点击「重试」；若持续出现请联系管理员。");
  }

  if (lower.includes("network") || lower.includes("failed to fetch")) {
    steps.push("请检查本机网络与代理；本地开发还需确认 NEXT_PUBLIC_API_URL 指向可访问的后端。");
  }

  if (steps.length === 0) {
    steps.push("可稍后再试，或通过「重试」立即重新请求。");
  }

  return steps;
}
