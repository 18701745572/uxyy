# 优效营 - 统一深色主题设计系统

> 版本: v1.0  
> 创建日期: 2026-05-13  
> 适用范围: 全系统 UI 组件与页面设计

---

## 1. 设计哲学

### 1.1 核心理念
- **深邃优雅**: 以近黑色为基底，营造专业、沉浸的视觉体验
- **高对比可读**: 确保文字与背景之间有足够的对比度，符合 WCAG 2.1 AA 标准
- **品牌渐变**: 使用蓝紫粉渐变作为品牌识别色，贯穿全系统
- **玻璃拟态**: 适度使用毛玻璃效果，增加层次感和现代感

### 1.2 设计原则
1. **一致性**: 所有页面遵循统一的色彩、间距、圆角规范
2. **层次清晰**: 通过背景色深浅建立视觉层级
3. **交互反馈**: 每个可交互元素都有明确的状态变化
4. **无障碍**: 支持键盘导航、屏幕阅读器，确保色盲用户可用

---

## 2. 设计令牌 (Design Tokens)

### 2.1 色彩系统

#### 背景色 (Background Colors)
| Token | 色值 | 用途 |
|-------|------|------|
| `bg-primary` | `#0a0a0a` | 页面主背景 |
| `bg-secondary` | `#111111` | 卡片、面板背景 |
| `bg-tertiary` | `#1a1a1a` | 悬停、选中状态 |
| `bg-elevated` | `#1c1c1e` | 弹窗、下拉菜单、浮层 |
| `bg-overlay` | `rgba(0, 0, 0, 0.8)` | 遮罩层、模态框背景 |

#### 文字色 (Text Colors)

> **设计理念**: 采用 7 级灰度体系，确保在深色背景上具有优秀的可读性和层次感。所有颜色均经过 WCAG 2.1 AA 标准验证。

##### 灰度文字层级
| Token | 色值 | 对比度 | 用途 |
|-------|------|--------|------|
| `text-primary` | `#fafafa` | 19.4:1 | 页面主标题、关键数据、核心信息 |
| `text-secondary` | `#e4e4e7` | 14.1:1 | 正文内容、描述文字、列表项 |
| `text-tertiary` | `#a1a1aa` | 7.1:1 | 辅助说明、次要信息 |
| `text-quaternary` | `#71717a` | 4.6:1 | 元信息、时间戳、标签 |
| `text-muted` | `#52525b` | 3.2:1 | 禁用状态、非激活项 |
| `text-placeholder` | `#3f3f46` | 2.4:1 | 输入框占位符、提示文字 |
| `text-inverse` | `#18181b` | - | 浅色背景上的文字 |

##### 品牌色文字
| Token | 色值 | 对比度 | 用途 |
|-------|------|--------|------|
| `text-brand` | `#60a5fa` | 8.2:1 | 品牌链接、可点击文字、高亮关键词 |
| `text-brand-light` | `#93c5fd` | 11.5:1 | 品牌悬停态、强调文字 |

##### 语义化文字（功能色）
| Token | 色值 | 对比度 | 用途 |
|-------|------|--------|------|
| `text-success` | `#4ade80` | 10.8:1 | 成功状态、正向数据、完成标记 |
| `text-warning` | `#fbbf24` | 10.2:1 | 警告状态、需要注意的信息 |
| `text-error` | `#f87171` | 7.8:1 | 错误状态、删除操作、负面数据 |
| `text-info` | `#60a5fa` | 8.2:1 | 信息提示、帮助文字、提示图标 |

##### 文字颜色使用规范

**主内容区**:
- 页面标题 → `text-primary`
- 段落正文 → `text-secondary`
- 辅助说明 → `text-tertiary`
- 时间/日期 → `text-quaternary`

**交互元素**:
- 默认链接 → `text-brand`
- 链接悬停 → `text-brand-light`
- 禁用文字 → `text-muted`

**数据展示**:
- 正增长 → `text-success`
- 负增长 → `text-error`
- 警告值 → `text-warning`
- 中性值 → `text-secondary`

#### 强调色 (Accent Colors)
| Token | 色值 | 用途 |
|-------|------|------|
| `accent-blue` | `#3b82f6` | 主要操作、链接 |
| `accent-purple` | `#8b5cf6` | 品牌色、高亮 |
| `accent-pink` | `#ec4899` | 强调、特殊状态 |
| `accent-gradient` | `linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)` | 品牌渐变 |
| `accent-gradient-hover` | `linear-gradient(135deg, #2563eb, #7c3aed, #db2777)` | 渐变悬停态 |

#### 功能色 (Functional Colors)
| Token | 色值 | 用途 |
|-------|------|------|
| `success` | `#22c55e` | 成功状态 |
| `warning` | `#f59e0b` | 警告状态 |
| `error` | `#ef4444` | 错误状态 |
| `info` | `#3b82f6` | 信息提示 |

#### 边框色 (Border Colors)
| Token | 色值 | 用途 |
|-------|------|------|
| `border-primary` | `#27272a` | 主边框 |
| `border-secondary` | `#3f3f46` | 次级边框、分隔线 |
| `border-focus` | `#3b82f6` | 聚焦状态边框 |

### 2.2 间距系统 (Spacing)

| Token | 值 | 用途 |
|-------|-----|------|
| `space-1` | `4px` | 极小间距 |
| `space-2` | `8px` | 紧凑间距 |
| `space-3` | `12px` | 标准间距 |
| `space-4` | `16px` | 默认间距 |
| `space-5` | `20px` | 中等间距 |
| `space-6` | `24px` | 大间距 |
| `space-8` | `32px` | 区块间距 |
| `space-10` | `40px` | 大区块间距 |
| `space-12` | `48px` | 页面级间距 |

### 2.3 圆角系统 (Border Radius)

| Token | 值 | 用途 |
|-------|-----|------|
| `radius-sm` | `6px` | 小元素、标签 |
| `radius-md` | `8px` | 按钮、输入框 |
| `radius-lg` | `12px` | 卡片、面板 |
| `radius-xl` | `16px` | 大卡片、弹窗 |
| `radius-2xl` | `24px` | 特殊容器 |
| `radius-full` | `9999px` | 圆形、胶囊形 |

### 2.4 阴影系统 (Shadows)

| Token | 值 | 用途 |
|-------|-----|------|
| `shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.3)` | 轻微提升 |
| `shadow-md` | `0 4px 6px -1px rgba(0, 0, 0, 0.4)` | 卡片默认 |
| `shadow-lg` | `0 10px 15px -3px rgba(0, 0, 0, 0.5)` | 弹窗、下拉 |
| `shadow-xl` | `0 20px 25px -5px rgba(0, 0, 0, 0.6)` | 模态框 |
| `shadow-glow` | `0 0 20px rgba(59, 130, 246, 0.3)` | 品牌光晕 |

### 2.5 字体系统 (Typography)

#### 字体族
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

#### 字号规范
| Token | 大小 | 行高 | 字重 | 用途 |
|-------|------|------|------|------|
| `text-xs` | 12px | 16px | 400 | 标签、辅助文字 |
| `text-sm` | 14px | 20px | 400 | 正文、描述 |
| `text-base` | 16px | 24px | 400 | 默认正文 |
| `text-lg` | 18px | 28px | 500 | 小标题 |
| `text-xl` | 20px | 28px | 600 | 卡片标题 |
| `text-2xl` | 24px | 32px | 600 | 区块标题 |
| `text-3xl` | 30px | 36px | 700 | 页面标题 |
| `text-4xl` | 36px | 40px | 700 | 大标题 |

---

## 3. 布局框架 (Layout)

### 3.1 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar (侧边栏)          │  Header (顶部导航)              │
│  - Logo                    ├─────────────────────────────────┤
│  - 主导航菜单              │                                 │
│  - 用户快捷操作            │  Main Content (主内容区)        │
│                            │  - Breadcrumb (面包屑)          │
│                            │  - Page Title (页面标题)        │
│                            │  - Content (内容区域)           │
│                            │                                 │
│                            │                                 │
└────────────────────────────┴─────────────────────────────────┘
```

### 3.2 布局规范

#### 容器宽度
| 断点 | 宽度 | 说明 |
|------|------|------|
| 移动端 | 100% | 全宽，侧边栏收起 |
| 平板 (768px+) | 100% | 侧边栏可收起 |
| 桌面 (1024px+) | 100% | 固定侧边栏 280px |
| 大屏 (1440px+) | 1200px 主内容 | 居中显示 |

#### 侧边栏 (Sidebar)
- **宽度**: 280px (展开) / 72px (收起)
- **背景**: `bg-secondary` (#111111)
- **边框**: 右侧 1px `border-primary`
- **Logo 区**: 高度 64px，内边距 20px
- **菜单项**: 高度 44px，圆角 8px，间距 4px

#### 顶部导航 (Header)
- **高度**: 64px
- **背景**: `bg-primary` 带底部边框
- **边框**: 底部 1px `border-primary`
- **内容**: 页面标题、全局搜索、通知、用户头像

#### 主内容区 (Main Content)
- **背景**: `bg-primary`
- **内边距**: 24px (桌面) / 16px (移动)
- **最大宽度**: 无限制，内容自适应

### 3.3 响应式断点

```typescript
const breakpoints = {
  sm: '640px',   // 小屏手机
  md: '768px',   // 平板
  lg: '1024px',  // 小桌面
  xl: '1280px',  // 桌面
  '2xl': '1536px' // 大屏
};
```

---

## 4. 卡片组件 (Card)

### 4.1 基础卡片

#### 视觉规范
- **背景**: `bg-secondary` (#111111)
- **边框**: 1px solid `border-primary`
- **圆角**: `radius-lg` (12px)
- **阴影**: `shadow-md`
- **内边距**: 24px (默认) / 16px (紧凑)

#### 状态样式
| 状态 | 样式 |
|------|------|
| 默认 | 背景 #111111，边框 #27272a |
| 悬停 | 边框变为 #3f3f46，轻微阴影增强 |
| 选中 | 边框变为 accent-blue，添加 glow 阴影 |
| 禁用 | 透明度 0.5，指针事件禁用 |

### 4.2 卡片变体

#### 数据概览卡片 (Stat Card)
```
┌─────────────────────────────┐
│  Icon    指标名称            │
│          ▼ 12.5%            │
│                             │
│  ¥ 128,450                  │
│  较上月 +¥15,230            │
└─────────────────────────────┘
```
- **图标容器**: 48px 圆形，渐变背景
- **指标值**: text-3xl, font-bold, text-primary
- **变化率**: 正数绿色，负数红色

#### 功能入口卡片 (Feature Card)
```
┌─────────────────────────────┐
│  ┌─────┐                    │
│  │图标 │  功能名称           │
│  └─────┘  功能描述文字...    │
│                             │
└─────────────────────────────┘
```
- **图标区**: 40px 圆角 8px，bg-tertiary
- **悬停效果**: 整体上浮 2px，阴影增强

#### 信息卡片 (Info Card)
- 用于展示详情信息
- 可包含头像、标题、描述、操作按钮
- 支持带头图或不带头图

### 4.3 代码示例

```tsx
// 基础卡片
<Card className="bg-[#111111] border-[#27272a] rounded-xl p-6">
  <CardHeader>
    <CardTitle className="text-white text-xl font-semibold">卡片标题</CardTitle>
    <CardDescription className="text-[#a1a1aa]">卡片描述文字</CardDescription>
  </CardHeader>
  <CardContent className="text-[#a1a1aa]">
    内容区域
  </CardContent>
</Card>

// 数据概览卡片
<Card className="bg-[#111111] border-[#27272a] rounded-xl p-6 hover:border-[#3f3f46] transition-all">
  <div className="flex items-center justify-between">
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <TrendUp className="w-6 h-6 text-white" />
    </div>
    <span className="text-green-500 text-sm">▲ 12.5%</span>
  </div>
  <div className="mt-4">
    <p className="text-[#71717a] text-sm">本月营收</p>
    <p className="text-white text-3xl font-bold mt-1">¥128,450</p>
  </div>
</Card>
```

---

## 5. 数据表格 (Table)

### 5.1 表格结构

```
┌─────────────────────────────────────────────────────────────┐
│  标题                    [搜索] [筛选] [导出] [新增]          │
├─────────────────────────────────────────────────────────────┤
│  □  列标题1    列标题2    列标题3    列标题4      操作        │
├─────────────────────────────────────────────────────────────┤
│  □  数据1      数据2      数据3      数据4      [编辑][删除]  │
│  □  数据1      数据2      数据3      数据4      [编辑][删除]  │
│  □  数据1      数据2      数据3      数据4      [编辑][删除]  │
├─────────────────────────────────────────────────────────────┤
│  全选                     共 50 条    < 1 2 3 ... 10 >       │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 视觉规范

#### 表头 (Table Header)
- **背景**: `bg-tertiary` (#1a1a1a)
- **文字**: text-secondary (14px, 500)
- **高度**: 48px
- **边框**: 底部 1px `border-primary`

#### 表格行 (Table Row)
- **背景**: transparent
- **高度**: 56px
- **边框**: 底部 1px `border-primary`
- **悬停**: 背景变为 `bg-tertiary`
- **选中**: 背景变为 rgba(59, 130, 246, 0.1)

#### 单元格 (Table Cell)
- **内边距**: 16px 水平
- **文字**: text-primary (14px)
- **对齐**: 左对齐（文字）/ 右对齐（数字）/ 居中（操作）

#### 分页器 (Pagination)
- **位置**: 表格底部右侧
- **样式**: 简洁数字按钮
- **当前页**: 渐变背景，白色文字
- **其他页**: bg-secondary，hover 变 bg-tertiary

### 5.3 功能规范

| 功能 | 说明 |
|------|------|
| 排序 | 点击表头排序，显示 ↑↓ 图标 |
| 筛选 | 表头右侧筛选图标，下拉筛选面板 |
| 搜索 | 表格上方全局搜索框 |
| 批量操作 | 左上角下拉菜单，选中后显示 |
| 行操作 | 右侧操作列，图标按钮组 |
| 空状态 | 居中显示，带图标和提示 |

### 5.4 代码示例

```tsx
<div className="bg-[#111111] border border-[#27272a] rounded-xl overflow-hidden">
  {/* 工具栏 */}
  <div className="flex items-center justify-between p-4 border-b border-[#27272a]">
    <h3 className="text-white font-semibold">数据列表</h3>
    <div className="flex gap-2">
      <Input placeholder="搜索..." className="w-64 bg-[#1a1a1a] border-[#3f3f46]" />
      <Button variant="outline" className="border-[#3f3f46] text-[#a1a1aa]">筛选</Button>
      <Button className="bg-gradient-to-r from-blue-500 to-purple-600">新增</Button>
    </div>
  </div>

  {/* 表格 */}
  <Table>
    <TableHeader className="bg-[#1a1a1a]">
      <TableRow className="border-[#27272a] hover:bg-transparent">
        <TableHead className="w-12"><Checkbox /></TableHead>
        <TableHead className="text-[#a1a1aa]">名称</TableHead>
        <TableHead className="text-[#a1a1aa]">状态</TableHead>
        <TableHead className="text-[#a1a1aa] text-right">金额</TableHead>
        <TableHead className="text-[#a1a1aa] text-center">操作</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {data.map((row) => (
        <TableRow key={row.id} className="border-[#27272a] hover:bg-[#1a1a1a]">
          <TableCell><Checkbox /></TableCell>
          <TableCell className="text-white font-medium">{row.name}</TableCell>
          <TableCell>
            <Badge variant={row.status === 'active' ? 'success' : 'default'}>
              {row.status}
            </Badge>
          </TableCell>
          <TableCell className="text-right text-white">¥{row.amount}</TableCell>
          <TableCell className="text-center">
            <Button variant="ghost" size="sm" className="text-[#71717a] hover:text-white">
              <PencilSimple className="w-4 h-4" />
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>

  {/* 分页 */}
  <div className="flex items-center justify-between p-4 border-t border-[#27272a]">
    <span className="text-[#71717a] text-sm">共 {total} 条</span>
    <Pagination>
      {/* 分页组件 */}
    </Pagination>
  </div>
</div>
```

---

## 6. 表单组件 (Form)

### 6.1 输入框 (Input)

#### 视觉规范
- **背景**: `bg-tertiary` (#1a1a1a)
- **边框**: 1px solid `border-primary`，聚焦时 `border-focus`
- **圆角**: `radius-md` (8px)
- **高度**: 44px (默认) / 36px (紧凑)
- **内边距**: 12px 16px
- **文字**: text-primary (16px)
- **占位符**: text-muted

#### 状态样式
| 状态 | 边框色 | 阴影 |
|------|--------|------|
| 默认 | #27272a | 无 |
| 聚焦 | #3b82f6 | 0 0 0 2px rgba(59, 130, 246, 0.2) |
| 错误 | #ef4444 | 0 0 0 2px rgba(239, 68, 68, 0.2) |
| 禁用 | #27272a | 无，背景变暗 |
| 自动填充 | #27272a | 覆盖浏览器默认样式 |

#### 自动填充样式覆盖
```css
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus {
  -webkit-text-fill-color: #ffffff !important;
  -webkit-box-shadow: 0 0 0px 1000px #1a1a1a inset !important;
  transition: background-color 5000s ease-in-out 0s;
}
```

### 6.2 选择器 (Select)

#### 视觉规范
- **触发器**: 同 Input 样式
- **下拉菜单**: bg-elevated，圆角 12px，阴影 shadow-lg
- **选项**: 高度 40px，hover bg-tertiary
- **选中**: 左侧显示蓝色竖线，文字高亮

### 6.3 复选框与单选框

#### 复选框 (Checkbox)
- **尺寸**: 18px × 18px
- **未选中**: bg-tertiary，border-primary
- **选中**: 渐变背景，白色勾选图标
- **圆角**: 4px

#### 单选框 (Radio)
- **尺寸**: 18px 圆形
- **未选中**: bg-tertiary，border-primary
- **选中**: 外圈渐变，内圈白色圆点

### 6.4 开关 (Switch)
- **尺寸**: 44px × 24px
- **关闭**: bg-tertiary
- **开启**: 渐变背景
- **滑块**: 白色圆形，带阴影

### 6.5 文本域 (Textarea)
- **样式**: 同 Input，支持多行
- **最小高度**: 100px
- **可调整**: 垂直方向可拖拽

### 6.6 表单布局

#### 垂直布局 (默认)
```
标签
[输入框        ]
帮助文字
```

#### 水平布局
```
标签          [输入框        ]
              帮助文字
```

#### 行内布局
```
[标签] [输入框] [标签] [输入框] [按钮]
```

### 6.7 代码示例

```tsx
// 输入框
<Input 
  className="h-11 bg-[#1a1a1a] border-[#27272a] text-white placeholder:text-[#52525b] 
             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
  placeholder="请输入内容"
/>

// 带标签的表单字段
<div className="space-y-2">
  <Label className="text-[#a1a1aa] text-sm">邮箱地址</Label>
  <Input 
    type="email"
    className="h-11 bg-[#1a1a1a] border-[#27272a] text-white rounded-lg
               focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
  />
  <p className="text-[#71717a] text-xs">我们将通过此邮箱与您联系</p>
</div>

// 选择器
<Select>
  <SelectTrigger className="h-11 bg-[#1a1a1a] border-[#27272a] text-white rounded-lg">
    <SelectValue placeholder="请选择" />
  </SelectTrigger>
  <SelectContent className="bg-[#1c1c1e] border-[#27272a] rounded-xl">
    <SelectItem value="1" className="text-white hover:bg-[#1a1a1a] focus:bg-[#1a1a1a]">
      选项一
    </SelectItem>
  </SelectContent>
</Select>

// 复选框
<div className="flex items-center space-x-2">
  <Checkbox 
    id="terms" 
    className="border-[#3f3f46] data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-purple-600"
  />
  <label htmlFor="terms" className="text-[#a1a1aa] text-sm">同意服务条款</label>
</div>
```

---

## 7. 图表与数据可视化 (Charts)

### 7.1 色彩规范

#### 图表配色方案
```typescript
const chartColors = {
  primary: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#ef4444'],
  gradient: [
    ['#3b82f6', '#1d4ed8'],
    ['#8b5cf6', '#6d28d9'],
    ['#ec4899', '#be185d'],
  ],
  monochrome: ['#27272a', '#3f3f46', '#52525b', '#71717a', '#a1a1aa'],
};
```

### 7.2 折线图 (Line Chart)

#### 视觉规范
- **线条**: 2px 宽度，平滑曲线
- **数据点**: 4px 圆形，hover 时 6px
- **填充**: 渐变填充，透明度 0.1-0.3
- **网格线**: #27272a，1px 虚线
- **坐标轴**: #3f3f46

### 7.3 柱状图 (Bar Chart)

#### 视觉规范
- **柱宽**: 自适应，间距为柱宽 50%
- **圆角**: 顶部 4px 圆角
- **颜色**: 品牌渐变或单色
- **hover**: 亮度提升 10%

### 7.4 饼图/环形图 (Pie/Donut Chart)

#### 视觉规范
- **环形内径**: 60%
- **扇区间距**: 2px
- **标签**: 外部显示，带连接线
- **图例**: 底部水平排列

### 7.5 仪表盘 (Gauge)

#### 视觉规范
- **范围**: 0-100% 半圆
- **刻度**: 主刻度 + 次刻度
- **指针**: 渐变色彩
- **数值**: 底部居中显示

### 7.6 代码示例

```tsx
// 使用 recharts 的深色主题配置
const chartConfig = {
  backgroundColor: 'transparent',
  gridColor: '#27272a',
  textColor: '#a1a1aa',
  axisColor: '#3f3f46',
};

// 折线图
<LineChart data={data}>
  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
  <XAxis dataKey="name" stroke="#3f3f46" tick={{ fill: '#a1a1aa' }} />
  <YAxis stroke="#3f3f46" tick={{ fill: '#a1a1aa' }} />
  <Tooltip 
    contentStyle={{ 
      backgroundColor: '#1c1c1e', 
      border: '1px solid #27272a',
      borderRadius: '8px'
    }}
    labelStyle={{ color: '#ffffff' }}
  />
  <Line 
    type="monotone" 
    dataKey="value" 
    stroke="#3b82f6" 
    strokeWidth={2}
    dot={{ fill: '#3b82f6', strokeWidth: 0 }}
    activeDot={{ r: 6, fill: '#3b82f6' }}
  />
</LineChart>
```

---

## 8. 导航与菜单 (Navigation)

### 8.1 侧边栏导航

#### 视觉规范
- **背景**: bg-secondary
- **宽度**: 280px (展开) / 72px (收起)
- **Logo 区**: 高度 64px，底部边框

#### 菜单项
| 状态 | 背景 | 文字 | 图标 |
|------|------|------|------|
| 默认 | transparent | text-secondary | text-secondary |
| 悬停 | bg-tertiary | text-primary | text-primary |
| 选中 | bg-tertiary + 左边框 3px 渐变 | text-primary | 渐变色彩 |
| 禁用 | transparent | text-muted | text-muted |

#### 子菜单
- **展开动画**: 高度展开 200ms ease
- **缩进**: 左侧 20px 缩进
- **样式**: 同主菜单，但高度 40px

### 8.2 顶部导航

#### 面包屑 (Breadcrumb)
- **分隔符**: / 或 >
- **当前页**: text-primary
- **父级**: text-secondary，hover 变 text-primary

#### 标签页 (Tabs)
- **高度**: 40px
- **默认**: text-secondary，底部透明边框
- **选中**: text-primary，底部 2px 渐变边框
- **内容区**: 顶部 24px 间距

### 8.3 下拉菜单 (Dropdown)

#### 视觉规范
- **背景**: bg-elevated
- **圆角**: radius-lg (12px)
- **阴影**: shadow-lg
- **宽度**: 根据内容自适应，最小 160px
- **内边距**: 8px

#### 菜单项
- **高度**: 36px
- **内边距**: 8px 12px
- **圆角**: radius-md
- **hover**: bg-tertiary
- **图标**: 左侧 16px，间距 12px

### 8.4 代码示例

```tsx
// 侧边栏菜单项
<nav className="space-y-1">
  <a
    href="/dashboard"
    className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#a1a1aa] 
               hover:bg-[#1a1a1a] hover:text-white transition-colors
               data-[active=true]:bg-[#1a1a1a] data-[active=true]:text-white
               data-[active=true]:border-l-3 data-[active=true]:border-l-gradient-to-b"
  >
    <House className="w-5 h-5" />
    <span className="font-medium">首页</span>
  </a>
</nav>

// 标签页
<Tabs defaultValue="overview" className="w-full">
  <TabsList className="bg-transparent border-b border-[#27272a] w-full justify-start rounded-none h-12 p-0">
    <TabsTrigger 
      value="overview"
      className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 
                 data-[state=active]:text-white rounded-none px-4 py-3 text-[#a1a1aa]"
    >
      概览
    </TabsTrigger>
  </TabsList>
  <TabsContent value="overview" className="mt-6">
    {/* 内容 */}
  </TabsContent>
</Tabs>

// 下拉菜单
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" className="text-[#a1a1aa]">
      <User className="w-5 h-5" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent 
    align="end" 
    className="w-48 bg-[#1c1c1e] border-[#27272a] rounded-xl"
  >
    <DropdownMenuLabel className="text-white">我的账户</DropdownMenuLabel>
    <DropdownMenuSeparator className="bg-[#27272a]" />
    <DropdownMenuItem className="text-[#a1a1aa] hover:bg-[#1a1a1a] hover:text-white cursor-pointer">
      <Gear className="w-4 h-4 mr-2" />
      设置
    </DropdownMenuItem>
    <DropdownMenuItem className="text-red-400 hover:bg-red-500/10 hover:text-red-400 cursor-pointer">
      <SignOut className="w-4 h-4 mr-2" />
      退出登录
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## 9. 模态框与对话框 (Modal & Dialog)

### 9.1 模态框 (Modal)

#### 视觉规范
- **遮罩**: bg-overlay，backdrop-blur-sm
- **背景**: bg-elevated
- **圆角**: radius-xl (16px)
- **阴影**: shadow-xl
- **最大宽度**: 480px (小) / 640px (中) / 900px (大)
- **最大高度**: 90vh，超出可滚动

#### 结构
```
┌─────────────────────────────────────────┐
│  标题                        [关闭]      │
├─────────────────────────────────────────┤
│                                         │
│  内容区域                                │
│                                         │
├─────────────────────────────────────────┤
│              [取消]  [确认]              │
└─────────────────────────────────────────┘
```

#### 尺寸规范
| 尺寸 | 宽度 | 用途 |
|------|------|------|
| sm | 400px | 简单确认、提示 |
| md | 560px | 表单、详情 |
| lg | 720px | 复杂表单、预览 |
| xl | 900px | 全屏内容、大屏表格 |
| full | 95vw | 特殊场景 |

### 9.2 对话框变体

#### 确认对话框 (Confirm Dialog)
- 图标 + 标题 + 描述 + 两个按钮
- 危险操作使用红色按钮

#### 表单对话框 (Form Dialog)
- 标题 + 表单内容 + 操作按钮
- 提交按钮在表单验证通过前禁用

#### 详情对话框 (Detail Dialog)
- 标题 + 详情内容 + 关闭按钮
- 可能包含编辑功能

### 9.3 抽屉 (Drawer)

#### 视觉规范
- **位置**: 右侧滑入 (默认)
- **宽度**: 400px (默认) / 600px (宽)
- **背景**: bg-elevated
- **遮罩**: 同 Modal

### 9.4 代码示例

```tsx
// 基础模态框
<Dialog>
  <DialogTrigger asChild>
    <Button>打开模态框</Button>
  </DialogTrigger>
  <DialogContent className="bg-[#1c1c1e] border-[#27272a] rounded-2xl max-w-lg">
    <DialogHeader>
      <DialogTitle className="text-white text-xl">确认删除</DialogTitle>
      <DialogDescription className="text-[#a1a1aa]">
        此操作不可撤销，确定要删除该数据吗？
      </DialogDescription>
    </DialogHeader>
    <DialogFooter className="gap-2">
      <Button variant="outline" className="border-[#3f3f46] text-[#a1a1aa]">
        取消
      </Button>
      <Button className="bg-red-500 hover:bg-red-600 text-white">
        删除
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// 抽屉
<Sheet>
  <SheetTrigger asChild>
    <Button>打开抽屉</Button>
  </SheetTrigger>
  <SheetContent className="bg-[#1c1c1e] border-l-[#27272a] w-[400px]">
    <SheetHeader>
      <SheetTitle className="text-white">编辑信息</SheetTitle>
    </SheetHeader>
    <div className="mt-6 space-y-4">
      {/* 表单内容 */}
    </div>
  </SheetContent>
</Sheet>
```

---

## 10. 加载与空状态 (Loading & Empty)

### 10.1 加载状态 (Loading)

#### 加载指示器 (Spinner)
- **尺寸**: sm (16px) / md (24px) / lg (32px) / xl (48px)
- **颜色**: 默认白色，可自定义
- **样式**: 旋转圆环，2px 边框

#### 骨架屏 (Skeleton)
- **背景**: 线性渐变动画
- **基础色**: #27272a
- **高亮色**: #3f3f46
- **动画**:  shimmer 效果，1.5s 循环

#### 加载变体
| 类型 | 用途 | 示例 |
|------|------|------|
| Inline | 按钮内、表单提交 | Spinner + 文字 |
| Overlay | 卡片、面板加载 | 半透明遮罩 + 居中 Spinner |
| Page | 页面级加载 | 全屏居中 + Logo 动画 |
| Skeleton | 内容预占位 | 灰色块模拟内容结构 |

### 10.2 空状态 (Empty State)

#### 视觉规范
- **图标**: 48px，text-muted 或渐变
- **标题**: text-primary，18px，600
- **描述**: text-secondary，14px
- **操作**: 可选的主按钮

#### 空状态变体
| 类型 | 图标 | 标题 | 描述 |
|------|------|------|------|
| 无数据 | Database | 暂无数据 | 开始添加您的第一条数据 |
| 搜索无结果 | MagnifyingGlass | 未找到结果 | 请尝试其他关键词 |
| 无权限 | Lock | 无访问权限 | 请联系管理员获取权限 |
| 网络错误 | WifiX | 连接失败 | 请检查网络后重试 |
| 404 | FileX | 页面不存在 | 您访问的页面已删除或不存在 |

### 10.3 代码示例

```tsx
// 加载指示器
<div className="flex items-center justify-center">
  <div className="w-8 h-8 border-2 border-[#3f3f46] border-t-blue-500 rounded-full animate-spin" />
</div>

// 骨架屏
<div className="space-y-3">
  <Skeleton className="h-4 w-3/4 bg-[#27272a]" />
  <Skeleton className="h-4 w-1/2 bg-[#27272a]" />
  <Skeleton className="h-20 w-full bg-[#27272a] rounded-lg" />
</div>

// 空状态
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
    <Database className="w-8 h-8 text-[#52525b]" />
  </div>
  <h3 className="text-white text-lg font-semibold mb-2">暂无数据</h3>
  <p className="text-[#71717a] text-sm mb-6 max-w-sm">
    当前列表为空，点击下方按钮添加您的第一条数据
  </p>
  <Button className="bg-gradient-to-r from-blue-500 to-purple-600">
    <Plus className="w-4 h-4 mr-2" />
    新增数据
  </Button>
</div>

// 页面加载
<div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center z-50">
  <div className="w-12 h-12 border-3 border-[#27272a] border-t-blue-500 rounded-full animate-spin mb-4" />
  <p className="text-[#a1a1aa] text-sm">加载中...</p>
</div>
```

---

## 11. 按钮组件 (Button)

### 11.1 按钮变体

| 变体 | 背景 | 文字 | 边框 | 用途 |
|------|------|------|------|------|
| primary | 渐变 | 白色 | 无 | 主要操作 |
| secondary | bg-tertiary | text-primary | 无 | 次要操作 |
| outline | transparent | text-primary | border-primary | 辅助操作 |
| ghost | transparent | text-secondary | 无 | 图标按钮、链接 |
| danger | red-500 | 白色 | 无 | 危险操作 |

### 11.2 按钮尺寸

| 尺寸 | 高度 | 内边距 | 字号 | 图标 |
|------|------|--------|------|------|
| sm | 32px | 8px 12px | 12px | 14px |
| md | 40px | 10px 16px | 14px | 16px |
| lg | 48px | 12px 24px | 16px | 20px |
| icon | 40px | 10px | - | 20px |

### 11.3 代码示例

```tsx
// 主要按钮
<Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg h-10 px-4">
  确认提交
</Button>

// 次要按钮
<Button className="bg-[#1a1a1a] hover:bg-[#27272a] text-white border border-[#27272a] rounded-lg h-10 px-4">
  取消
</Button>

// 图标按钮
<Button variant="ghost" size="icon" className="text-[#71717a] hover:text-white hover:bg-[#1a1a1a]">
  <PencilSimple className="w-4 h-4" />
</Button>

// 加载状态
<Button disabled className="bg-gradient-to-r from-blue-500 to-purple-600 opacity-70">
  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
  提交中...
</Button>
```

---

## 12. 标签与徽章 (Badge & Tag)

### 12.1 徽章 (Badge)

| 变体 | 背景 | 文字 | 用途 |
|------|------|------|------|
| default | bg-tertiary | text-secondary | 默认状态 |
| primary | blue-500/20 | blue-400 | 主要 |
| success | green-500/20 | green-400 | 成功 |
| warning | yellow-500/20 | yellow-400 | 警告 |
| error | red-500/20 | red-400 | 错误 |

### 12.2 代码示例

```tsx
<Badge className="bg-[#1a1a1a] text-[#a1a1aa] hover:bg-[#27272a]">默认</Badge>
<Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">进行中</Badge>
<Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">已完成</Badge>
<Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30">已取消</Badge>
```

---

## 13. 提示与通知 (Toast & Alert)

### 13.1 提示消息 (Toast)

#### 视觉规范
- **位置**: 右上角 (默认)
- **背景**: bg-elevated
- **圆角**: radius-lg
- **阴影**: shadow-lg
- **图标**: 左侧状态图标
- **关闭**: 右侧关闭按钮

#### 类型样式
| 类型 | 图标 | 左边框 |
|------|------|--------|
| success | CheckCircle | green-500 |
| error | XCircle | red-500 |
| warning | Warning | yellow-500 |
| info | Info | blue-500 |

### 13.2 警告提示 (Alert)

#### 视觉规范
- **背景**: 状态色 10% 透明度
- **边框**: 状态色 30% 透明度
- **圆角**: radius-lg
- **内边距**: 16px

### 13.3 代码示例

```tsx
// Toast 通知
toast.success('操作成功完成', {
  style: {
    background: '#1c1c1e',
    border: '1px solid #27272a',
    color: '#ffffff',
  },
});

// 警告提示
<Alert className="bg-blue-500/10 border-blue-500/30 rounded-lg">
  <Info className="w-4 h-4 text-blue-400" />
  <AlertTitle className="text-blue-400">提示</AlertTitle>
  <AlertDescription className="text-blue-300/80">
    这是一条重要信息，请注意查看。
  </AlertDescription>
</Alert>
```

---

## 14. 工具类与快捷方式

### 14.1 Tailwind 配置扩展

```typescript
// tailwind.config.ts
const config = {
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0a0a',
          800: '#111111',
          700: '#1a1a1a',
          600: '#1c1c1e',
          500: '#27272a',
          400: '#3f3f46',
          300: '#52525b',
          200: '#71717a',
          100: '#a1a1aa',
          50: '#ffffff',
        },
        accent: {
          blue: '#3b82f6',
          purple: '#8b5cf6',
          pink: '#ec4899',
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)',
        'gradient-brand-hover': 'linear-gradient(135deg, #2563eb, #7c3aed, #db2777)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-lg': '0 0 40px rgba(59, 130, 246, 0.4)',
      },
    },
  },
};
```

### 14.2 常用组合类

```css
/* 卡片基础 */
.card-base {
  @apply bg-[#111111] border border-[#27272a] rounded-xl;
}

/* 输入框基础 */
.input-base {
  @apply h-11 bg-[#1a1a1a] border-[#27272a] text-white rounded-lg
         focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20;
}

/* 按钮主要 */
.btn-primary {
  @apply bg-gradient-to-r from-blue-500 to-purple-600 
         hover:from-blue-600 hover:to-purple-700 text-white rounded-lg;
}

/* 文字渐变 */
.text-gradient {
  @apply bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent;
}

/* 玻璃效果 */
.glass {
  @apply bg-white/5 backdrop-blur-xl border border-white/10;
}
```

---

## 15. 无障碍设计 (Accessibility)

### 15.1 键盘导航
- 所有交互元素可通过 Tab 键聚焦
- 焦点顺序符合视觉顺序
- 支持 Enter/Space 激活
- 支持 Esc 关闭弹窗

### 15.2 焦点指示器
```css
:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

### 15.3 色彩对比度
- 文字与背景对比度至少 4.5:1
- 大文字对比度至少 3:1
- 交互元素对比度至少 3:1

### 15.4 屏幕阅读器
- 所有图片提供 alt 文本
- 表单字段关联 label
- 动态内容使用 aria-live
- 图标按钮使用 aria-label

---

## 16. 实现检查清单

### 全局样式
- [ ] 设置页面背景为 #0a0a0a
- [ ] 设置默认文字颜色为 #a1a1aa
- [ ] 配置自动填充样式覆盖
- [ ] 设置滚动条样式

### 组件更新
- [ ] 更新 Button 组件样式
- [ ] 更新 Card 组件样式
- [ ] 更新 Input 组件样式
- [ ] 更新 Table 组件样式
- [ ] 更新 Modal 组件样式
- [ ] 更新 Dropdown 组件样式
- [ ] 更新 Toast 组件样式

### 页面迁移
- [ ] 登录页 (已完成)
- [ ] 仪表盘首页
- [ ] CRM 模块
- [ ] 进销存模块
- [ ] 财务模块
- [ ] 系统设置

### 图表配置
- [ ] 配置 recharts 深色主题
- [ ] 更新所有图表颜色
- [ ] 配置坐标轴样式
- [ ] 配置提示框样式

---

## 17. 图标系统 (Icon System)

### 17.1 图标库选择

**使用 `@phosphor-icons/react` 作为统一图标库**

- **版本**: `^2.1.10`
- **官网**: https://phosphoricons.com
- **优势**:
  - 风格统一：所有图标采用相同的线条粗细和设计风格
  - 权重多样：提供 thin、light、regular、bold、fill、duotone 六种权重
  - 图标丰富：超过 7000+ 个图标，覆盖各种使用场景
  - React 友好：官方提供 React 组件，支持 Tree Shaking
  - 可定制性强：支持颜色、大小、权重等属性的灵活调整

### 17.2 图标分类与映射

#### 导航图标
| 功能模块 | Phosphor 图标 | 导入路径 |
|----------|---------------|----------|
| 首页 | `House` | `@phosphor-icons/react` |
| 客户管理 | `Users` | `@phosphor-icons/react` |
| 进销存 | `Package` | `@phosphor-icons/react` |
| 财务 | `Coins` | `@phosphor-icons/react` |
| OA 办公 | `ClipboardText` | `@phosphor-icons/react` |
| AI 智能 | `Robot` | `@phosphor-icons/react` |
| 设置 | `Gear` | `@phosphor-icons/react` |
| 通知 | `Bell` | `@phosphor-icons/react` |

#### 操作图标
| 操作 | Phosphor 图标 |
|------|---------------|
| 添加 | `Plus` |
| 编辑 | `PencilSimple` |
| 删除 | `Trash` |
| 保存 | `FloppyDisk` |
| 取消 | `X` |
| 查看 | `Eye` |
| 复制 | `Copy` |
| 下载 | `DownloadSimple` |
| 搜索 | `MagnifyingGlass` |
| 刷新 | `ArrowsClockwise` |
| 返回 | `ArrowLeft` |
| 关闭 | `X` |
| 下拉 | `CaretDown` |

#### 状态图标
| 状态 | Phosphor 图标 |
|------|---------------|
| 成功 | `CheckCircle` |
| 错误 | `XCircle` |
| 警告 | `Warning` / `WarningCircle` |
| 信息 | `Info` |
| 加载中 | `Spinner` |

#### Lucide → Phosphor 迁移映射
| Lucide | Phosphor | 说明 |
|--------|----------|------|
| `Home` | `House` | 首页 |
| `Bell` | `Bell` | 通知 |
| `Users` | `Users` | 用户/客户 |
| `Package` | `Package` | 包裹/库存 |
| `Coins` | `Coins` | 财务 |
| `ClipboardList` | `ClipboardText` | 办公/任务 |
| `Bot` | `Robot` | AI |
| `Settings` | `Gear` | 设置 |
| `Menu` | `List` | 菜单 |
| `X` | `X` | 关闭 |
| `ChevronDown` | `CaretDown` | 下拉 |
| `Search` | `MagnifyingGlass` | 搜索 |
| `Plus` | `Plus` | 添加 |
| `Trash2` | `Trash` | 删除 |
| `Pencil` | `PencilSimple` | 编辑 |
| `BookOpen` | `BookOpen` | 账本 |
| `ArrowLeft` | `ArrowLeft` | 返回 |
| `Check` | `Check` | 确认 |
| `CheckCircle2` | `CheckCircle` | 成功 |
| `XCircle` | `XCircle` | 错误 |
| `Clock` | `Clock` | 时钟 |
| `RefreshCw` | `ArrowsClockwise` | 刷新 |
| `Loader2` | `Spinner` | 加载中 |
| `Calendar` | `Calendar` | 日历 |
| `MapPin` | `MapPin` | 位置 |
| `AlertCircle` | `WarningCircle` | 警告 |
| `TrendingUp` | `TrendUp` | 趋势上升 |
| `Briefcase` | `ClipboardText` | 工作 |
| `Sparkles` | `Sparkle` | 闪光 |
| `AlertTriangle` | `Warning` | 警告三角 |
| `TrendingDown` | `TrendDown` | 趋势下降 |
| `FileSpreadsheet` | `FileXls` | Excel 文件 |
| `FileText` | `FileText` | 文本文件 |
| `Download` | `DownloadSimple` | 下载 |
| `Receipt` | `Receipt` | 收据 |
| `Edit` | `PencilSimple` | 编辑 |
| `Trash` | `Trash` | 删除 |
| `MessageSquare` | `ChatText` | 消息 |
| `Link2` | `Link` | 链接 |
| `Phone` | `Phone` | 电话 |
| `Mail` | `Envelope` | 邮件 |
| `Building2` | `Building` | 建筑/公司 |
| `Crown` | `Crown` | 皇冠/会员 |
| `History` | `ClockCounterClockwise` | 历史 |
| `User` | `User` | 用户 |

### 17.3 使用规范

#### 基础用法
```tsx
import { House, Plus, Trash } from "@phosphor-icons/react";

// 基础使用
<House />

// 指定大小
<House size={24} />
<House className="h-5 w-5" />

// 指定权重（粗细）
<House weight="thin" />      // 最细
<House weight="light" />     // 细
<House weight="regular" />   // 常规（默认）
<House weight="bold" />      // 粗
<House weight="fill" />      // 填充
<House weight="duotone" />   // 双色调

// 指定颜色
<House color="#ffffff" />
<House className="text-[#a1a1aa]" />
```

#### 权重使用建议
| 场景 | 推荐权重 | 说明 |
|------|----------|------|
| 侧边栏导航 | `regular` | 保持清晰可读 |
| 按钮图标 | `regular` 或 `bold` | 强调可操作性 |
| 标题装饰 | `light` | 低调不抢眼 |
| 选中状态 | `fill` | 与其他状态区分 |
| 大型展示 | `duotone` | 增强视觉层次 |
| 禁用状态 | `thin` | 降低视觉权重 |

#### 大小规范
| 场景 | 推荐大小 | CSS 类名 |
|------|----------|----------|
| 按钮内图标 | 16px | `h-4 w-4` |
| 表单图标 | 16px | `h-4 w-4` |
| 导航图标 | 20px | `h-5 w-5` |
| 卡片图标 | 24px | `h-6 w-6` |
| 空状态图标 | 48px+ | `h-12 w-12` |
| 页面图标 | 64px+ | `h-16 w-16` |

#### 深色主题下的颜色规范
```tsx
// 主文字色（白色）
<House className="text-white" />

// 次要文字色
<House className="text-[#a1a1aa]" />

// 辅助文字色
<House className="text-[#71717a]" />

// 禁用状态
<House className="text-[#52525b]" />

// 品牌渐变色（用于特殊强调）
<House className="text-blue-500" />

// 成功状态
<House className="text-green-500" />

// 警告状态
<House className="text-yellow-500" />

// 错误状态
<House className="text-red-500" />
```

### 17.4 最佳实践

#### 1. 使用语义化导入
```tsx
// ✅ 推荐：直接导入具体图标
import { House, Plus } from "@phosphor-icons/react";

// ❌ 避免：通配符导入
import * as Icons from "@phosphor-icons/react";
```

#### 2. 图标与按钮结合
```tsx
import { Button } from "@/components/ui/button";
import { Plus } from "@phosphor-icons/react";

// ✅ 正确：图标在文字前
<Button className="bg-gradient-to-r from-blue-500 to-purple-600">
  <Plus className="h-4 w-4 mr-2" />
  新建
</Button>

// ✅ 正确：纯图标按钮
<Button size="icon" variant="ghost" className="text-[#71717a] hover:text-white">
  <Plus className="h-4 w-4" />
</Button>
```

#### 3. 图标对齐
```tsx
// ✅ 使用 flex 布局确保对齐
<div className="flex items-center gap-2">
  <House className="h-4 w-4 text-[#a1a1aa]" />
  <span className="text-white">首页</span>
</div>

// ✅ 使用统一的图标容器（深色主题）
<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a1a1a]">
  <House className="h-5 w-5 text-[#a1a1aa]" />
</div>
```

#### 4. 加载状态
```tsx
import { Spinner } from "@phosphor-icons/react";

// ✅ 使用 animate-spin 实现旋转
<Spinner className="h-5 w-5 animate-spin text-blue-500" />

// ✅ 作为加载按钮
<Button disabled className="bg-gradient-to-r from-blue-500 to-purple-600 opacity-70">
  <Spinner className="h-4 w-4 mr-2 animate-spin" />
  加载中...
</Button>
```

#### 5. 图标按钮的可访问性
```tsx
// ✅ 为纯图标按钮添加 aria-label
<button aria-label="关闭" className="text-[#71717a] hover:text-white">
  <X className="h-4 w-4" />
</button>

// ✅ 使用 sr-only 文本
<button className="text-[#71717a] hover:text-white">
  <X className="h-4 w-4" />
  <span className="sr-only">关闭</span>
</button>
```

### 17.5 统一入口配置

项目使用 `src/components/icons/index.tsx` 作为图标的统一入口：

```tsx
// src/components/icons/index.tsx
export {
  // 导航图标
  House,
  Users,
  Package,
  Coins,
  ClipboardText,
  Robot,
  Gear,
  Bell,
  
  // 操作图标
  Plus,
  PencilSimple,
  Trash,
  FloppyDisk,
  X,
  Eye,
  Copy,
  DownloadSimple,
  MagnifyingGlass,
  ArrowsClockwise,
  ArrowLeft,
  CaretDown,
  
  // 状态图标
  CheckCircle,
  XCircle,
  Warning,
  WarningCircle,
  Info,
  Spinner,
  
  // 其他常用图标...
} from "@phosphor-icons/react";
```

---

## 附录

### A. 设计资源
- Figma 文件: [待创建]
- 图标库: Phosphor Icons (@phosphor-icons/react)
- 字体: Inter (Google Fonts)

### B. 参考链接
- [WCAG 2.1 指南](https://www.w3.org/WAI/WCAG21/quickref/)
- [Phosphor Icons 官网](https://phosphoricons.com/)
- [Phosphor Icons GitHub](https://github.com/phosphor-icons/react)
- [Tailwind CSS 文档](https://tailwindcss.com/)

### C. 更新日志
| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-05-13 | v1.0 | 初始版本，包含完整设计规范 |
| 2026-05-13 | v1.1 | 整合 Phosphor Icons 图标系统，统一图标管理 |
| 2026-05-13 | v1.2 | 补充遗漏组件规范：文件上传、JSON 编辑器、任务卡片、OCR 结果展示 |

---

## 18. 补充组件规范

### 18.1 文件上传组件 (File Upload)

#### 视觉规范
- **上传区域**: 
  - 背景: `bg-bg-secondary`
  - 边框: 2px dashed `border-border-primary`
  - 圆角: `radius-lg` (12px)
  - 内边距: 24px
  - 悬停: 边框变为 `accent-purple/50`，背景添加 `accent-purple/5`

- **上传图标容器**:
  - 尺寸: 48px 圆形
  - 背景: `bg-bg-tertiary`
  - 图标颜色: `text-text-tertiary`

- **提示文字**:
  - 主文字: `text-text-secondary` (14px)
  - 辅助文字: `text-text-muted` (12px)

#### 代码示例
```tsx
<div className="border-2 border-dashed border-border-primary rounded-lg p-6 text-center hover:border-accent-purple/50 hover:bg-accent-purple/5 transition-all duration-200">
  <input type="file" className="hidden" id="file-upload" />
  <label htmlFor="file-upload" className="cursor-pointer">
    <div className="flex flex-col items-center gap-2">
      <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center">
        <UploadSimple className="w-6 h-6 text-text-tertiary" />
      </div>
      <p className="text-sm text-text-secondary">点击上传或拖拽文件到此处</p>
      <p className="text-xs text-text-muted">支持 JPG、PNG 格式，最大 5MB</p>
    </div>
  </label>
</div>
```

### 18.2 JSON 编辑器/文本域 (JSON Editor)

#### 视觉规范
- **文本域**:
  - 背景: `bg-bg-tertiary`
  - 边框: 1px solid `border-primary`
  - 圆角: `radius-lg` (12px)
  - 文字: `text-text-primary`，等宽字体 (font-mono)
  - 占位符: `text-placeholder`
  - 聚焦: 边框变为 `accent-purple`，添加 `ring-2 ring-accent-purple/20`

#### 代码示例
```tsx
<textarea
  className="rounded-lg border border-border-primary bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple font-mono resize-y"
  rows={5}
  placeholder='{"description": "购买办公用品100元"}'
/>
```

### 18.3 任务状态卡片 (Task Status Card)

#### 视觉规范
- **卡片容器**:
  - 背景: `bg-bg-tertiary`
  - 边框: 1px solid `border-primary`
  - 圆角: `radius-lg` (12px)

- **状态图标容器**:
  - 尺寸: 48px 圆形
  - 背景: 根据状态变化
    - 成功: `bg-success/20`
    - 错误: `bg-error/20`
    - 处理中: `bg-accent-blue/20`
    - 等待中: `bg-warning/20`

- **状态徽章**:
  - 成功: `bg-success/20 text-success border-success/30`
  - 错误: `bg-error/20 text-error border-error/30`
  - 处理中: `bg-accent-blue/20 text-accent-blue border-accent-blue/30`
  - 等待中: `bg-warning/20 text-warning border-warning/30`

#### 代码示例
```tsx
<div className="flex items-center gap-4 p-4 bg-bg-tertiary rounded-lg border border-border-primary">
  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-success/20">
    <CheckCircle className="w-6 h-6 text-success" />
  </div>
  <div className="flex-1">
    <div className="flex items-center gap-2">
      <span className="font-medium text-text-primary">任务 #123</span>
      <Badge className="bg-success/20 text-success border-success/30">已完成</Badge>
    </div>
    <p className="text-sm text-text-secondary mt-1">发票 OCR 识别</p>
  </div>
</div>
```

### 18.4 OCR 结果展示组件 (OCR Result Display)

#### 视觉规范
- **数据卡片**:
  - 背景: `bg-bg-secondary`
  - 边框: 1px solid `border-primary`
  - 圆角: `radius-lg` (12px)
  - 内边距: 8px

- **标签文字**:
  - 颜色: `text-text-tertiary`
  - 字号: 12px

- **数值文字**:
  - 主数值: `text-text-primary`，font-medium
  - 金额(借): `text-text-brand`
  - 金额(贷): `text-text-success`

- **分组展示**:
  - 使用 `grid grid-cols-2` 或 `grid grid-cols-3` 布局
  - 间距: 8px

#### 代码示例
```tsx
<div className="grid grid-cols-2 gap-2 text-xs">
  <div className="bg-bg-secondary p-2 rounded-lg border border-border-primary">
    <span className="text-text-tertiary">发票类型</span>
    <p className="font-medium text-text-primary">增值税专用发票</p>
  </div>
  <div className="bg-bg-secondary p-2 rounded-lg border border-border-primary">
    <span className="text-text-tertiary">价税合计</span>
    <p className="font-medium text-text-success">¥10,000.00</p>
  </div>
</div>

<div className="bg-bg-secondary p-2 rounded-lg border border-border-primary text-xs">
  <p className="text-text-tertiary mb-1">购买方</p>
  <p className="font-medium text-text-primary">某某科技有限公司</p>
  <p className="text-text-secondary mt-1">税号: 91110108XXXXXXXX</p>
</div>
```

### 18.5 功能选择卡片 (Feature Selection Card)

#### 视觉规范
- **卡片**:
  - 默认: `bg-bg-secondary border-border-primary`
  - 悬停: `hover:bg-bg-tertiary hover:border-border-secondary`
  - 选中: `ring-2 ring-accent-purple bg-accent-purple/10 border-accent-purple/50`

- **图标容器**:
  - 默认: `bg-bg-tertiary text-text-secondary`
  - 选中: `bg-gradient-to-br from-accent-purple to-accent-blue text-white`
  - 尺寸: 40px 圆角 8px

- **文字**:
  - 标题: `text-text-primary` font-medium
  - 描述: `text-text-muted` text-xs

#### 代码示例
```tsx
<Card className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-glow ${
  isSelected
    ? "ring-2 ring-accent-purple bg-accent-purple/10 border-accent-purple/50"
    : "bg-bg-secondary border-border-primary hover:bg-bg-tertiary hover:border-border-secondary"
}`}>
  <div className="flex items-start gap-3">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
      isSelected 
        ? "bg-gradient-to-br from-accent-purple to-accent-blue text-white" 
        : "bg-bg-tertiary text-text-secondary"
    }`}>
      <Robot className="w-5 h-5" />
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="font-medium text-text-primary">AI 任务</h3>
      <p className="text-xs text-text-muted mt-1">发票OCR识别、会计分录建议</p>
    </div>
  </div>
</Card>
```

### 18.6 提示信息框 (Alert/Info Box)

#### 视觉规范
- **信息提示**:
  - 背景: `bg-accent-blue/10`
  - 边框: 1px solid `accent-blue/30`
  - 文字: `text-text-secondary`

- **警告提示**:
  - 背景: `bg-warning/10`
  - 边框: 1px solid `warning/30`
  - 文字: `text-warning`

- **错误提示**:
  - 背景: `bg-error/10`
  - 边框: 1px solid `error/30`
  - 文字: `text-error`

#### 代码示例
```tsx
// 信息提示
<p className="text-xs text-text-secondary bg-accent-blue/10 border border-accent-blue/30 rounded-lg px-3 py-2">
  发票 OCR 成功后，系统按<strong>采购费用</strong>预设为借「管理费用」、贷「应付账款」
</p>

// 警告提示
<p className="text-sm text-warning bg-warning/10 border border-warning/30 rounded-lg px-3 py-2">
  当前输出无法自动生成凭证草稿，请核对 OCR 结构化结果后重试
</p>

// 错误提示
<div className="p-4 bg-error/10 rounded-lg border border-error/30">
  <p className="text-sm text-error font-medium flex items-center gap-2">
    <XCircle className="w-4 h-4" />
    错误信息
  </p>
  <p className="text-sm text-error/80 mt-2">详细的错误描述...</p>
</div>
```

### 18.7 成功对话框 (Success Dialog)

#### 视觉规范
- **对话框**:
  - 背景: `bg-bg-secondary`
  - 边框: 1px solid `border-primary`

- **成功图标**:
  - 容器: 64px 圆形，`bg-success/20`
  - 图标: `text-success`，32px

- **文字**:
  - 标题: `text-text-primary`，text-lg，font-semibold
  - 描述: `text-text-secondary`，text-sm

- **按钮**:
  - 次要: `variant="secondary"`
  - 主要: 渐变背景 `from-accent-purple to-accent-blue`

#### 代码示例
```tsx
<DialogContent className="sm:max-w-md bg-bg-secondary border-border-primary">
  <div className="flex flex-col items-center py-6">
    <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
      <CheckCircle className="w-8 h-8 text-success" />
    </div>
    <h3 className="text-lg font-semibold text-text-primary mb-2">凭证写入成功</h3>
    <p className="text-sm text-text-secondary text-center">
      AI 任务结果已成功写入财务凭证库
    </p>
  </div>
  <div className="flex justify-center gap-3">
    <Button variant="secondary">继续处理</Button>
    <Button className="bg-gradient-to-r from-accent-purple to-accent-blue">
      查看凭证库
    </Button>
  </div>
</DialogContent>
```

### 18.8 进度条组件 (Progress Bar)

#### 视觉规范
- **轨道（背景）**:
  - 背景: `bg-bg-tertiary`
  - 圆角: `rounded-full`
  - 高度: 根据场景（小 8px / 中 12px / 大 24px）

- **进度条（填充）**:
  - 颜色: 根据状态变化
    - 成功: `bg-success`
    - 警告: `bg-warning`
    - 错误: `bg-error`
    - 品牌: `bg-accent-blue` 或渐变 `from-accent-blue to-accent-purple`
  - 圆角: `rounded-full`
  - 过渡: `transition-all duration-300`

- **进度文字**:
  - 位置: 进度条内部右侧（大进度条）或外部（小进度条）
  - 颜色: 白色（在进度条内）或 `text-text-secondary`

#### 代码示例
```tsx
// 基础进度条
<div className="w-full bg-bg-tertiary rounded-full h-3">
  <div
    className="h-3 rounded-full bg-accent-blue transition-all duration-300"
    style={{ width: `${progress}%` }}
  />
</div>

// 带文字的大进度条
<div className="w-full bg-bg-tertiary rounded-full h-6 relative">
  <div
    className="h-6 rounded-full bg-gradient-to-r from-accent-blue to-accent-purple flex items-center justify-end pr-2"
    style={{ width: `${progress}%` }}
  >
    <span className="text-xs text-white font-medium">{progress}%</span>
  </div>
</div>

// 状态进度条（成功/警告/错误）
<div className="w-full bg-bg-tertiary rounded-full h-3">
  <div
    className={`h-3 rounded-full transition-all duration-300 ${
      progress >= 70 ? "bg-success" :
      progress >= 40 ? "bg-warning" : "bg-error"
    }`}
    style={{ width: `${progress}%` }}
  />
</div>
```

### 18.9 原生选择器 (Native Select)

#### 视觉规范
- **选择器**:
  - 背景: `bg-bg-tertiary`
  - 边框: 1px solid `border-primary`
  - 圆角: `radius-lg` (12px)
  - 文字: `text-text-primary`
  - 内边距: 6px 12px
  - 聚焦: `ring-2 ring-accent-blue/20 border-accent-blue`

- **下拉选项**:
  - 继承系统样式（原生 select 限制）
  - 文字颜色由系统决定

#### 代码示例
```tsx
<select
  className="px-3 py-1.5 text-sm border border-border-primary bg-bg-tertiary text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
  value={value}
  onChange={(e) => setValue(e.target.value)}
>
  <option value="">全部阶段</option>
  <option value="potential">潜在客户</option>
  <option value="intention">有意向</option>
</select>
```

### 18.10 数据统计卡片 (Stat Card)

#### 视觉规范
- **卡片**:
  - 背景: `bg-bg-secondary`
  - 边框: 1px solid `border-primary`
  - 圆角: `radius-lg` (12px)
  - 内边距: 12px

- **标签文字**:
  - 颜色: `text-text-tertiary`
  - 字号: 12px

- **数值文字**:
  - 颜色: 根据语义（品牌蓝 `text-brand` / 成功绿 `text-success` / 警告黄 `text-warning`）
  - 字号: 20px (text-xl)
  - 字重: semibold

#### 代码示例
```tsx
// 品牌色数据卡片
<div className="p-3 bg-accent-blue/10 border border-accent-blue/30 rounded-lg">
  <p className="text-xs text-text-brand mb-1">预计成交总额</p>
  <p className="text-xl font-semibold text-text-brand">
    ¥128,450.00
  </p>
</div>

// 成功色数据卡片
<div className="p-3 bg-success/10 border border-success/30 rounded-lg">
  <p className="text-xs text-text-success mb-1">商机总数</p>
  <p className="text-xl font-semibold text-text-success">42</p>
</div>
```

### 18.11 风险/状态徽章配置

#### 视觉规范
统一的风险等级配色方案：

| 等级 | 背景 | 文字 | 边框 |
|------|------|------|------|
| 高风险 | `bg-error/20` | `text-error` | `border-error/30` |
| 中风险 | `bg-warning/20` | `text-warning` | `border-warning/30` |
| 低风险 | `bg-success/20` | `text-success` | `border-success/30` |
| 信息 | `bg-accent-blue/20` | `text-accent-blue` | `border-accent-blue/30` |

#### 代码示例
```tsx
const riskLevelConfig = {
  high: {
    label: "高风险",
    color: "bg-error/20 text-error border-error/30",
    icon: WarningCircle,
  },
  medium: {
    label: "中风险",
    color: "bg-warning/20 text-warning border-warning/30",
    icon: Minus,
  },
  low: {
    label: "低风险",
    color: "bg-success/20 text-success border-success/30",
    icon: CheckCircle,
  },
};

// 使用
<Badge className={riskLevelConfig[level].color}>
  {riskLevelConfig[level].label}
</Badge>
```

---

*本文档为优效营系统设计基准，所有 UI 开发应遵循此规范。如有更新，请同步修改此文档。*
