import { Card, CardContent, CardHeader } from "@/components/ui/card";

/** 请假/报销详情首屏加载占位 */
export function OaDocumentDetailSkeleton() {
  return (
    <Card className="animate-pulse border-border-secondary">
      <CardHeader>
        <div className="h-5 w-40 rounded bg-bg-tertiary" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-4 w-full rounded bg-bg-tertiary" />
        <div className="h-4 w-11/12 rounded bg-bg-tertiary" />
        <div className="h-4 w-2/3 rounded bg-bg-tertiary" />
      </CardContent>
    </Card>
  );
}
