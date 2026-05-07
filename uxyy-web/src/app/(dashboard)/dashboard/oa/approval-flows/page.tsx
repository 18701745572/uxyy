"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Settings,
  ArrowRight,
  CheckCircle,
  XCircle,
  User,
  DollarSign
} from "lucide-react";

// 条件类型定义
type AmountCondition = { amount: { gte: number } };
type DaysCondition = { days: { gte: number } };
type Condition = AmountCondition | DaysCondition | null;

interface FlowStep {
  step: number;
  role: string;
  condition: Condition;
}

interface Flow {
  id: number;
  name: string;
  type: "leave" | "reimbursement" | "purchase" | "sales";
  status: "active" | "inactive";
  steps: FlowStep[];
}

// 模拟数据
const mockFlows: Flow[] = [
  {
    id: 1,
    name: "请假审批流程",
    type: "leave",
    status: "active",
    steps: [
      { step: 1, role: "直属主管", condition: null },
      { step: 2, role: "人事经理", condition: { days: { gte: 3 } } },
    ],
  },
  {
    id: 2,
    name: "报销审批流程",
    type: "reimbursement",
    status: "active",
    steps: [
      { step: 1, role: "直属主管", condition: null },
      { step: 2, role: "财务经理", condition: { amount: { gte: 1000 } } },
    ],
  },
  {
    id: 3,
    name: "采购审批流程",
    type: "purchase",
    status: "active",
    steps: [
      { step: 1, role: "部门经理", condition: null },
      { step: 2, role: "总经理", condition: { amount: { gte: 5000 } } },
    ],
  },
  {
    id: 4,
    name: "销售审批流程",
    type: "sales",
    status: "inactive",
    steps: [
      { step: 1, role: "销售经理", condition: { amount: { gte: 10000 } } },
    ],
  },
];

// 类型守卫函数
function hasAmountCondition(condition: Condition): condition is AmountCondition {
  return condition !== null && "amount" in condition;
}

function hasDaysCondition(condition: Condition): condition is DaysCondition {
  return condition !== null && "days" in condition;
}

const typeMap = {
  leave: { label: "请假", color: "bg-green-100 text-green-800" },
  reimbursement: { label: "报销", color: "bg-orange-100 text-orange-800" },
  purchase: { label: "采购", color: "bg-blue-100 text-blue-800" },
  sales: { label: "销售", color: "bg-purple-100 text-purple-800" },
};

export default function ApprovalFlowsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFlows = mockFlows.filter((flow) => {
    if (searchQuery && !flow.name.includes(searchQuery)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">审批流程</h1>
          <p className="text-zinc-500 mt-1">配置采购、销售、报销、请假审批流程</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          新建流程
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">流程总数</p>
            <p className="text-2xl font-bold text-zinc-900">{mockFlows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">启用中</p>
            <p className="text-2xl font-bold text-green-600">
              {mockFlows.filter(f => f.status === "active").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">已停用</p>
            <p className="text-2xl font-bold text-gray-600">
              {mockFlows.filter(f => f.status === "inactive").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">今日审批</p>
            <p className="text-2xl font-bold text-blue-600">0</p>
          </CardContent>
        </Card>
      </div>

      {/* 搜索栏 */}
      <div className="relative">
        <Settings className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input
          placeholder="搜索流程名称..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 流程列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">审批流程列表</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFlows.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无审批流程</p>
              <p className="text-sm mt-1">点击右上角按钮创建审批流程</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFlows.map((flow) => {
                const type = typeMap[flow.type as keyof typeof typeMap];
                return (
                  <div
                    key={flow.id}
                    className="p-4 border rounded-lg hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-zinc-900">{flow.name}</h3>
                          <Badge className={type.color}>{type.label}</Badge>
                          <Badge 
                            variant={flow.status === "active" ? "default" : "secondary"}
                          >
                            {flow.status === "active" ? "启用" : "停用"}
                          </Badge>
                        </div>
                        
                        {/* 审批步骤 */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {flow.steps.map((step, index) => (
                            <div key={step.step} className="flex items-center">
                              <div className="flex items-center gap-1 bg-zinc-100 px-3 py-1 rounded-full text-sm">
                                <User className="w-3 h-3 text-zinc-500" />
                                <span>步骤{step.step}:</span>
                                <span className="font-medium">{step.role}</span>
                                {hasAmountCondition(step.condition) && (
                                  <span className="text-xs text-zinc-500">
                                    (金额≥{step.condition.amount.gte})
                                  </span>
                                )}
                                {hasDaysCondition(step.condition) && (
                                  <span className="text-xs text-zinc-500">
                                    (天数≥{step.condition.days.gte})
                                  </span>
                                )}
                              </div>
                              {index < flow.steps.length - 1 && (
                                <ArrowRight className="w-4 h-4 text-zinc-400 mx-1" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button variant="ghost" size="sm">
                          编辑
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className={flow.status === "active" ? "text-red-600" : "text-green-600"}
                        >
                          {flow.status === "active" ? "停用" : "启用"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 流程说明 */}
      <Card className="bg-zinc-50">
        <CardHeader>
          <CardTitle className="text-lg">流程说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-600">
          <p>• 每个企业可以配置多个审批流程，按业务类型区分</p>
          <p>• 支持条件审批，如金额超过设定值需要更高层级审批</p>
          <p>• 审批流程支持多步骤，按顺序逐级审批</p>
          <p>• 停用流程后，新提交的申请将不再使用该流程</p>
        </CardContent>
      </Card>
    </div>
  );
}
