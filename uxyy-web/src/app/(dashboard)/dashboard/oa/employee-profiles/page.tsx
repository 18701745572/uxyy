"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Plus, 
  Search, 
  Users,
  Phone,
  Mail,
  Building2,
  Briefcase
} from "lucide-react";

// 模拟数据
const mockEmployees = [
  {
    id: 1,
    name: "张三",
    phone: "13800138001",
    email: "zhangsan@example.com",
    department: "技术部",
    position: "工程师",
    employeeNo: "EMP001",
    joinDate: "2025-01-15",
  },
  {
    id: 2,
    name: "李四",
    phone: "13800138002",
    email: "lisi@example.com",
    department: "销售部",
    position: "销售经理",
    employeeNo: "EMP002",
    joinDate: "2025-03-01",
  },
  {
    id: 3,
    name: "王五",
    phone: "13800138003",
    email: "wangwu@example.com",
    department: "财务部",
    position: "会计",
    employeeNo: "EMP003",
    joinDate: "2025-02-20",
  },
];

const departments = ["全部", "技术部", "销售部", "财务部", "人事部"];

export default function EmployeeProfilesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState("全部");

  const filteredEmployees = mockEmployees.filter((emp) => {
    if (filterDept !== "全部" && emp.department !== filterDept) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        emp.name.toLowerCase().includes(query) ||
        emp.phone.includes(query) ||
        emp.position.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">员工通讯录</h1>
          <p className="text-zinc-500 mt-1">员工信息、部门管理、联系方式</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          添加员工
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">员工总数</p>
            <p className="text-2xl font-bold text-zinc-900">{mockEmployees.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">部门数量</p>
            <p className="text-2xl font-bold text-zinc-900">3</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">本月入职</p>
            <p className="text-2xl font-bold text-green-600">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">本月离职</p>
            <p className="text-2xl font-bold text-red-600">0</p>
          </CardContent>
        </Card>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="搜索姓名、手机号、职位..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {departments.map((dept) => (
            <Button
              key={dept}
              variant={filterDept === dept ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilterDept(dept)}
            >
              {dept}
            </Button>
          ))}
        </div>
      </div>

      {/* 员工列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">员工列表</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无员工记录</p>
              <p className="text-sm mt-1">点击右上角按钮添加员工</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-zinc-200 text-zinc-700">
                        {emp.name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-zinc-900">{emp.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {emp.employeeNo}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-zinc-500 mt-1">
                        <Building2 className="w-3 h-3" />
                        {emp.department}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-zinc-500">
                        <Briefcase className="w-3 h-3" />
                        {emp.position}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-zinc-400" />
                      <span className="text-zinc-600">{emp.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-zinc-400" />
                      <span className="text-zinc-600 truncate">{emp.email}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Phone className="w-3 h-3 mr-1" />
                      拨打
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Mail className="w-3 h-3 mr-1" />
                      邮件
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
