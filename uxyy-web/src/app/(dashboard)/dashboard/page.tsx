"use client";

import { OverviewCards } from "./_components/overview-cards";
import { QuickActions } from "./_components/quick-actions";
import { TodoList } from "./_components/todo-list";

/**
 * Dashboard 首页 - 深色主题
 *
 * 页面结构：
 * 1. 欢迎区域
 * 2. 经营概览卡片（今日销售额、待处理订单、库存预警）
 * 3. 快捷操作（新建客户、新建订单、录入发票）
 * 4. 待办事项（待审批、待跟进客户、库存预警列表）
 *
 * 设计原则：
 * 1. 深色背景适配
 * 2. 渐变图标背景
 * 3. 玻璃拟态卡片
 * 4. 悬停发光效果
 * 5. 避免与侧边栏导航重复
 */
export default function DashboardHome() {
  return (
    <div className="flex flex-col gap-6">
      {/* 欢迎区域 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-bg-secondary to-bg-tertiary border border-border-primary p-6">
        {/* 装饰背景 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-blue/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-purple/5 rounded-full blur-[60px] pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-xl font-bold text-text-primary">欢迎使用优效营</h1>
          <p className="mt-2 text-sm text-text-secondary">
            小微企业经营智能体平台
          </p>
          <p className="mt-3 text-xs text-text-muted">
            请使用左侧菜单导航到各功能模块，或点击下方快捷操作快速开始。
          </p>
        </div>
      </div>

      {/* 经营概览 */}
      <OverviewCards />

      {/* 快捷操作 */}
      <QuickActions />

      {/* 待办事项 */}
      <TodoList />
    </div>
  );
}
