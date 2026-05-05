import { Card } from "@/components/ui/card";

export default function AiPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-zinc-900">AI 智能</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="font-medium text-zinc-400">OCR 发票识别</h2>
          <p className="mt-1 text-sm text-zinc-400">即将上线</p>
        </Card>
        <Card>
          <h2 className="font-medium text-zinc-400">智能记账建议</h2>
          <p className="mt-1 text-sm text-zinc-400">即将上线</p>
        </Card>
        <Card>
          <h2 className="font-medium text-zinc-400">经营分析</h2>
          <p className="mt-1 text-sm text-zinc-400">即将上线</p>
        </Card>
        <Card>
          <h2 className="font-medium text-zinc-400">AI 助手</h2>
          <p className="mt-1 text-sm text-zinc-400">即将上线</p>
        </Card>
      </div>
    </div>
  );
}
