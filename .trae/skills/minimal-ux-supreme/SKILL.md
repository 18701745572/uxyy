---
name: "minimal-ux-supreme"
description: "Applies minimal luxury UI design system with world-class interaction patterns to enterprise SaaS applications. Invoke when designing or refactoring UI components, creating new pages, or establishing design patterns for B2B management systems requiring premium user experience."
---

# Minimal UX Supreme - 极简高定风设计系统

> 融合世界顶级 UI/UX 设计精髓，为企业管理系统打造极致用户体验

## 核心理念

### 设计哲学
- **少即是多 (Less is More)** - 每个像素都应有其存在的理由，删除一切非必要元素
- **内容优先 (Content First)** - 设计隐形化，让用户专注于信息和任务
- **精致克制 (Refined Restraint)** - 高品质感通过毫米级细节体现，而非视觉堆砌
- **直觉交互 (Intuitive Interaction)** - 用户无需思考即可完成操作
- **即时反馈 (Instant Feedback)** - 每次交互都给予明确、即时的系统响应

### 设计原则（源自世界顶级设计团队实践）

#### 1. 视觉层次法则
```
F型阅读模式 → 重要信息置于左上
Z型视觉流 → 引导用户视线自然流动
三分法则 → 关键元素位于黄金分割点
```

#### 2. 交互设计黄金法则
- **3秒法则**：页面核心内容必须在3秒内呈现
- **2点击则**：任何功能不超过2次点击可达
- **1秒反馈**：操作反馈必须在1秒内呈现
- **0思考**：核心操作无需用户思考即可完成

#### 3. 认知负荷管理
- **组块化 (Chunking)**：将信息分组，每组不超过7±2个元素
- **渐进披露 (Progressive Disclosure)**：复杂功能分步展示
- **视觉锚点**：使用一致的视觉元素建立空间记忆

### 适用场景
- B2B SaaS 企业管理系统（CRM、ERP、财务、OA）
- 数据密集型仪表盘与分析平台
- 专业工具与生产力应用
- 需要高频操作的核心业务系统

### 反模式警示（Anti-Patterns）
❌ **避免这些常见错误：**
- 使用 Emoji 作为 UI 图标
- 悬停状态导致布局偏移（Layout Shift）
- 透明度过低导致可读性问题
- 忽略键盘导航和焦点状态
- 过度动画干扰用户操作
- 不一致的图标尺寸和风格

---

## 1. 色彩系统

### 主色调
```css
/* 背景层级 */
--bg-primary: #ffffff;      /* 主背景 - 纯白 */
--bg-secondary: #fafafa;    /* 次级背景 - 极浅灰 */
--bg-tertiary: #f5f5f5;     /* 三级背景 - 卡片、hover */

/* 文字层级 */
--text-primary: #171717;    /* 主文字 - 近黑 */
--text-secondary: #525252;  /* 次级文字 - 深灰 */
--text-tertiary: #737373;   /* 辅助文字 - 中灰 */
--text-muted: #a3a3a3;      /* 禁用/占位符 - 浅灰 */

/* 边框层级 */
--border-primary: #e5e5e5;   /* 主边框 */
--border-secondary: #f0f0f0; /* 次级边框 */
--border-focus: #d4d4d4;     /* 聚焦边框 */
```

### 强调色
```css
/* 品牌色 */
--brand-50: #eff6ff;
--brand-100: #dbeafe;
--brand-500: #3b82f6;
--brand-600: #2563eb;
--brand-700: #1d4ed8;

/* 功能色 */
--success: #10b981;   /* 成功 - 翠绿 */
--warning: #f59e0b;   /* 警告 - 琥珀 */
--error: #ef4444;     /* 错误 - 玫瑰红 */
--info: #3b82f6;      /* 信息 - 天蓝 */
```

### 使用原则
- **80% 中性色** - 白、灰、黑构成主体
- **15% 品牌色** - 用于主按钮、链接、选中状态
- **5% 功能色** - 仅用于状态指示

### 色彩对比度规范（WCAG 2.1 AA 标准）
| 场景 | 对比度要求 | 示例组合 |
|-----|-----------|---------|
| 正文文字 | ≥ 4.5:1 | `#171717` on `#ffffff` = 15.3:1 ✅ |
| 大文字 (18px+) | ≥ 3:1 | `#525252` on `#ffffff` = 7.4:1 ✅ |
| UI 组件 | ≥ 3:1 | `#2563eb` on `#ffffff` = 4.6:1 ✅ |
| 禁用状态 | ≥ 2:1 | `#a3a3a3` on `#ffffff` = 2.4:1 ✅ |

### 色彩心理学应用
- **蓝色系** - 信任、专业、稳定（品牌主色）
- **绿色系** - 成功、增长、确认（正向操作）
- **橙色系** - 警告、注意、提醒（需谨慎）
- **红色系** - 错误、危险、删除（负向操作）
- **灰色系** - 中性、辅助、禁用（信息层级）

---

## 2. 排版系统

### 字体栈
```css
/* 中文优先 */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;

/* 英文 */
font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
```

### 字号规范
| 层级 | 大小 | 字重 | 行高 | 用途 |
|-----|------|------|------|------|
| Display | 32px | 600 | 1.2 | 页面大标题 |
| H1 | 24px | 600 | 1.3 | 页面标题 |
| H2 | 20px | 600 | 1.4 | 区块标题 |
| H3 | 16px | 600 | 1.5 | 卡片标题 |
| Body | 14px | 400 | 1.6 | 正文内容 |
| Small | 13px | 400 | 1.5 | 辅助文字 |
| Caption | 12px | 400 | 1.4 | 标签、备注 |

### 排版原则
- **字重克制**：正文 400，标题 600，不使用 700+
- **行高舒适**：正文 1.6，标题 1.2-1.4
- **字间距**：默认，不额外调整

---

## 3. 间距系统

### 基础单位
```css
--space-unit: 4px;

/* 间距层级 */
--space-1: 4px;    /* xs */
--space-2: 8px;    /* sm */
--space-3: 12px;   /* md */
--space-4: 16px;   /* lg */
--space-5: 20px;   /* xl */
--space-6: 24px;   /* 2xl */
--space-8: 32px;   /* 3xl */
--space-10: 40px;  /* 4xl */
--space-12: 48px;  /* 5xl */
```

### 使用场景
| 场景 | 间距 | 示例 |
|-----|------|------|
| 图标与文字 | 8px | 按钮、列表项 |
| 表单元素 | 16px | 输入框之间 |
| 卡片内边距 | 20-24px | 内容卡片 |
| 区块间距 | 32px | 页面区块 |
| 页面边距 | 24-32px | 容器内边距 |

### 原则
- **8px 网格**：所有间距应为 4px 的倍数
- **呼吸感**：大区块之间使用 32px+ 间距
- **紧凑性**：相关元素之间使用 8-12px

---

## 4. 圆角系统

```css
--radius-none: 0;       /* 直角 - 表格、分割线 */
--radius-sm: 4px;       /* 小圆角 - 标签、小按钮 */
--radius-md: 6px;       /* 中圆角 - 按钮、输入框 */
--radius-lg: 8px;       /* 大圆角 - 卡片、弹窗 */
--radius-xl: 12px;      /* 超大圆角 - 特殊卡片 */
--radius-full: 9999px;  /* 全圆 - 头像、徽章 */
```

### 原则
- **保守使用**：企业系统以 4-6px 为主
- **一致性**：同层级元素使用相同圆角
- **功能区分**：
  - 按钮：6px
  - 输入框：6px
  - 卡片：8px
  - 弹窗：8-12px

---

## 5. 阴影系统

```css
/* 极简阴影 - 仅用于层级区分 */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);

/* 特殊阴影 */
--shadow-focus: 0 0 0 3px rgba(59, 130, 246, 0.15);
--shadow-card: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
```

### 原则
- **克制使用**：阴影用于层级，而非装饰
- **柔和边缘**：阴影模糊值大于扩散值
- **低透明度**：保持 5-10% 透明度

---

## 6. 组件设计模式

### 按钮 (Button)

#### 样式规范
```tsx
// 主按钮
const primaryButton = "bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-950 px-4 py-2 rounded-md text-sm font-medium transition-colors";

// 次级按钮
const secondaryButton = "bg-white text-text-primary border border-border-primary hover:bg-bg-secondary active:bg-bg-tertiary px-4 py-2 rounded-md text-sm font-medium transition-colors";

// 幽灵按钮
const ghostButton = "bg-transparent text-text-secondary hover:bg-bg-tertiary hover:text-text-primary px-4 py-2 rounded-md text-sm font-medium transition-colors";

// 危险按钮
const dangerButton = "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 px-4 py-2 rounded-md text-sm font-medium transition-colors";
```

#### 尺寸规范
| 尺寸 | 高度 | 内边距 | 字号 | 用途 |
|-----|------|--------|------|------|
| sm | 32px | px-3 py-1.5 | 13px | 表格操作、紧凑布局 |
| md | 36px | px-4 py-2 | 14px | 默认按钮 |
| lg | 44px | px-6 py-2.5 | 14px | 主要操作、弹窗确认 |

### 输入框 (Input)

```tsx
const input = `
  w-full h-9 px-3 py-2
  bg-white border border-border-primary rounded-md
  text-sm text-text-primary placeholder:text-text-muted
  focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400
  disabled:bg-bg-secondary disabled:text-text-muted
  transition-colors
`;
```

### 卡片 (Card)

```tsx
const card = "bg-white rounded-lg border border-border-primary shadow-sm";
const cardHeader = "px-5 py-4 border-b border-border-secondary";
const cardBody = "p-5";
const cardFooter = "px-5 py-4 border-t border-border-secondary bg-bg-secondary/50";
```

### 表格 (Table)

```tsx
const table = "w-full text-sm";
const tableHeader = "bg-bg-secondary border-b border-border-primary";
const tableHeaderCell = "px-4 py-3 text-left font-medium text-text-secondary";
const tableRow = "border-b border-border-secondary hover:bg-bg-secondary/50 transition-colors";
const tableCell = "px-4 py-3 text-text-primary";
```

### 标签/徽章 (Badge)

```tsx
const badge = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium";
const badgeDefault = "bg-bg-tertiary text-text-secondary";
const badgeSuccess = "bg-emerald-50 text-emerald-700";
const badgeWarning = "bg-amber-50 text-amber-700";
const badgeError = "bg-red-50 text-red-700";
const badgeInfo = "bg-blue-50 text-blue-700";
```

---

## 7. 图标规范

### 图标库
- **首选**：Phosphor Icons
- **权重**：Regular（默认），Bold（激活/强调）
- **尺寸**：与文字对齐，使用 16px（sm）、20px（md）

### 使用规范
```tsx
// 按钮图标
<Plus size={16} weight="regular" className="mr-2" />

// 导航图标
<House size={20} weight={isActive ? "bold" : "regular"} />

// 状态图标
<CheckCircle size={16} weight="fill" className="text-emerald-600" />
```

---

## 8. 布局原则

### 容器宽度
```css
/* 响应式容器 */
.container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 24px;
}

/* 内容区域 */
.content {
  max-width: 1200px;
}
```

### 网格系统
```css
/* 12列网格 */
.grid-12 { display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px; }
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
```

### 侧边栏
```css
.sidebar {
  width: 240px;
  background: #ffffff;
  border-right: 1px solid #e5e5e5;
}
```

---

## 9. 动效规范

### 过渡时间
```css
--duration-fast: 150ms;    /* 微交互 */
--duration-normal: 200ms;  /* 默认 */
--duration-slow: 300ms;    /* 页面切换 */
```

### 缓动函数
```css
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
```

### 使用场景
| 场景 | 时长 | 缓动 |
|-----|------|------|
| Hover 效果 | 150ms | ease-out |
| 按钮点击 | 100ms | ease-in |
| 弹窗出现 | 200ms | ease-out |
| 页面切换 | 300ms | ease-default |
| 加载动画 | 800ms | linear |

### 原则
- **克制使用**：企业系统以功能性动效为主
- **快速响应**：交互反馈在 200ms 内完成
- **一致性**：同类动效保持一致

---

## 10. 数据可视化

### 图表色彩
```css
/* 数据序列色 */
--chart-1: #3b82f6;  /* 蓝 */
--chart-2: #10b981;  /* 绿 */
--chart-3: #f59e0b;  /* 琥珀 */
--chart-4: #ef4444;  /* 红 */
--chart-5: #8b5cf6;  /* 紫 */
--chart-6: #06b6d4;  /* 青 */
```

### 图表原则
- **清晰优先**：数据可读性 > 视觉效果
- **色彩克制**：最多 6 种颜色
- **辅助元素**：网格线使用极浅灰 (#f0f0f0)

---

## 11. 响应式断点

```css
/* 移动端优先 */
--breakpoint-sm: 640px;   /* 手机横屏 */
--breakpoint-md: 768px;   /* 平板 */
--breakpoint-lg: 1024px;  /* 小桌面 */
--breakpoint-xl: 1280px;  /* 桌面 */
--breakpoint-2xl: 1536px; /* 大桌面 */
```

---

## 12. 无障碍规范

### 对比度
- 正文文字与背景对比度 ≥ 4.5:1
- 大文字（18px+）对比度 ≥ 3:1
- 交互元素对比度 ≥ 3:1

### 焦点状态
```css
.focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

### 语义化
- 使用正确的 HTML 标签
- 表单元素关联 label
- 图片添加 alt 文本
- 支持键盘导航

---

## 13. Tailwind 配置

```javascript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        // 扩展品牌色
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        'display': ['32px', { lineHeight: '1.2', fontWeight: '600' }],
        'h1': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'h2': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'h3': ['16px', { lineHeight: '1.5', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '1.6', fontWeight: '400' }],
        'small': ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      spacing: {
        '18': '4.5rem',  // 72px
        '22': '5.5rem',  // 88px
      },
      borderRadius: {
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'focus': '0 0 0 3px rgba(59, 130, 246, 0.15)',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
    },
  },
};
```

---

## 14. 设计检查清单

### 创建新组件时检查
- [ ] 色彩使用符合规范
- [ ] 字号、字重正确
- [ ] 间距为 4px 倍数
- [ ] 圆角符合层级
- [ ] 有 Hover/Focus 状态
- [ ] 支持禁用状态
- [ ] 动效时长 ≤ 300ms
- [ ] 对比度符合无障碍标准

### 页面设计检查
- [ ] 信息层次清晰
- [ ] 留白充足（呼吸感）
- [ ] 视觉焦点明确
- [ ] 操作路径简洁
- [ ] 响应式适配
- [ ] 加载状态处理
- [ ] 空状态设计
- [ ] 错误状态设计

---

## 15. 示例代码

### 完整按钮组件
```tsx
import { Plus } from "@phosphor-icons/react";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ComponentType<{ size?: number; weight?: string }>;
  disabled?: boolean;
  onClick?: () => void;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  disabled,
  onClick,
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variantStyles = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800 focus:ring-zinc-900",
    secondary: "bg-white text-text-primary border border-border-primary hover:bg-bg-secondary focus:ring-zinc-400",
    ghost: "bg-transparent text-text-secondary hover:bg-bg-tertiary hover:text-text-primary focus:ring-zinc-400",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600",
  };
  
  const sizeStyles = {
    sm: "h-8 px-3 text-[13px] rounded",
    md: "h-9 px-4 text-sm rounded-md",
    lg: "h-11 px-6 text-sm rounded-md",
  };
  
  const disabledStyles = disabled ? "opacity-50 cursor-not-allowed" : "";
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles}`}
      disabled={disabled}
      onClick={onClick}
    >
      {Icon && <Icon size={size === "sm" ? 14 : 16} weight="regular" className="mr-2" />}
      {children}
    </button>
  );
}

// 使用
<Button variant="primary" size="md" icon={Plus}>
  新建订单
</Button>
```

### 完整卡片组件
```tsx
interface CardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Card({ title, description, children, footer, className = "" }: CardProps) {
  return (
    <div className={`bg-white rounded-lg border border-border-primary shadow-card ${className}`}>
      {(title || description) && (
        <div className="px-5 py-4 border-b border-border-secondary">
          {title && <h3 className="text-base font-semibold text-text-primary">{title}</h3>}
          {description && <p className="mt-1 text-sm text-text-tertiary">{description}</p>}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && <div className="px-5 py-4 border-t border-border-secondary bg-bg-secondary/50">{footer}</div>}
    </div>
  );
}
```

---

## 16. 交互设计系统（新增 - 源自世界顶级 UX 实践）

### 微交互设计（Micro-interactions）

#### 悬停状态（Hover States）
```tsx
// ✅ 正确做法 - 颜色/透明度变化，不引起布局偏移
const hoverStyles = {
  button: "hover:bg-zinc-800 hover:text-white transition-colors duration-150",
  link: "hover:text-text-primary hover:underline underline-offset-4 transition-all duration-150",
  card: "hover:border-border-primary hover:shadow-md transition-all duration-200",
  tableRow: "hover:bg-bg-secondary/50 transition-colors duration-150",
};

// ❌ 错误做法 - 引起布局偏移
const badHoverStyles = {
  button: "hover:scale-105", // 导致周围元素移动
  card: "hover:p-6", // 尺寸变化
};
```

#### 点击反馈（Click Feedback）
```tsx
// 激活状态 - 即时视觉反馈
const activeStyles = {
  button: "active:bg-zinc-950 active:scale-[0.98] transition-transform duration-100",
  link: "active:text-text-secondary",
};

// 涟漪效果（可选）
const rippleEffect = `
  relative overflow-hidden
  after:content-[''] after:absolute after:inset-0
  after:bg-white/20 after:opacity-0
  active:after:opacity-100 active:after:scale-0 active:after:animate-ripple
`;
```

#### 焦点状态（Focus States）
```tsx
// 键盘导航焦点 - 清晰可见
const focusStyles = {
  default: "focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2",
  brand: "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
  error: "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
};

// 焦点可见性（仅键盘导航时显示）
const focusVisibleStyles = "focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2";
```

### 状态转换设计

#### 加载状态（Loading States）
```tsx
// 骨架屏 - 内容加载前的占位
const Skeleton = () => (
  <div className="animate-pulse space-y-3">
    <div className="h-4 bg-zinc-200 rounded w-3/4"></div>
    <div className="h-4 bg-zinc-200 rounded w-1/2"></div>
  </div>
);

// 加载按钮
const LoadingButton = ({ isLoading, children }: { isLoading: boolean; children: React.ReactNode }) => (
  <button disabled={isLoading} className="relative">
    {isLoading && (
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Spinner className="animate-spin" size={16} />
      </span>
    )}
    <span className={isLoading ? "opacity-0" : ""}>{children}</span>
  </button>
);

// 进度指示器
const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="h-1 bg-zinc-200 rounded-full overflow-hidden">
    <div 
      className="h-full bg-blue-600 transition-all duration-300 ease-out"
      style={{ width: `${progress}%` }}
    />
  </div>
);
```

#### 空状态（Empty States）
```tsx
const EmptyState = ({ 
  icon, 
  title, 
  description, 
  action 
}: { 
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
      {icon}
    </div>
    <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
    <p className="text-sm text-text-tertiary mb-4 max-w-sm">{description}</p>
    {action}
  </div>
);

// 使用示例
<EmptyState
  icon={<Package size={24} className="text-text-muted" />}
  title="暂无订单"
  description="您还没有创建任何销售订单，点击下方按钮开始创建。"
  action={<Button variant="primary" icon={Plus}>新建订单</Button>}
/>
```

#### 错误状态（Error States）
```tsx
// 表单错误提示
const FormError = ({ message }: { message: string }) => (
  <div className="flex items-center gap-1.5 text-sm text-red-600 mt-1.5">
    <WarningCircle size={14} weight="fill" />
    <span>{message}</span>
  </div>
);

// 全局错误提示
const ToastError = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
    <XCircle size={20} weight="fill" className="text-red-600 flex-shrink-0" />
    <p className="text-sm text-red-800 flex-1">{message}</p>
    <button onClick={onClose} className="text-red-400 hover:text-red-600">
      <X size={16} />
    </button>
  </div>
);
```

### 手势与操作

#### 拖放交互（Drag & Drop）
```tsx
// 拖放视觉反馈
const dragStyles = {
  idle: "border-2 border-dashed border-border-primary rounded-lg p-8",
  dragOver: "border-blue-500 bg-blue-50/50",
  dragging: "opacity-50 cursor-grabbing",
};

// 拖动手柄
const DragHandle = () => (
  <div className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary">
    <DotsSixVertical size={16} weight="bold" />
  </div>
);
```

#### 滑动操作（Swipe Actions）
```tsx
// 移动端滑动删除/编辑
const SwipeableItem = ({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) => {
  const [offset, setOffset] = useState(0);
  
  return (
    <div className="relative overflow-hidden">
      {/* 背景操作按钮 */}
      <div 
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-red-500"
        style={{ width: Math.max(0, -offset) }}
      >
        <Trash size={20} className="text-white" />
      </div>
      
      {/* 内容 */}
      <div 
        className="relative bg-white transition-transform duration-200"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          // 计算滑动距离...
        }}
      >
        {children}
      </div>
    </div>
  );
};
```

### 导航与信息架构

#### 面包屑导航（Breadcrumbs）
```tsx
const Breadcrumbs = ({ items }: { items: { label: string; href?: string }[] }) => (
  <nav className="flex items-center gap-1 text-sm">
    {items.map((item, index) => (
      <React.Fragment key={index}>
        {index > 0 && <CaretRight size={14} className="text-text-muted mx-1" />}
        {item.href ? (
          <Link href={item.href} className="text-text-tertiary hover:text-text-primary transition-colors">
            {item.label}
          </Link>
        ) : (
          <span className="text-text-primary font-medium">{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </nav>
);
```

#### 步骤指示器（Step Indicator）
```tsx
const StepIndicator = ({ 
  steps, 
  currentStep 
}: { 
  steps: string[]; 
  currentStep: number;
}) => (
  <div className="flex items-center">
    {steps.map((step, index) => (
      <React.Fragment key={index}>
        {/* 步骤圆点 */}
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
          ${index < currentStep ? "bg-emerald-500 text-white" : ""}
          ${index === currentStep ? "bg-blue-600 text-white ring-4 ring-blue-100" : ""}
          ${index > currentStep ? "bg-zinc-200 text-text-tertiary" : ""}
        `}>
          {index < currentStep ? <Check size={16} weight="bold" /> : index + 1}
        </div>
        
        {/* 步骤标签 */}
        <span className={`
          ml-2 text-sm hidden sm:block
          ${index <= currentStep ? "text-text-primary font-medium" : "text-text-tertiary"}
        `}>
          {step}
        </span>
        
        {/* 连接线 */}
        {index < steps.length - 1 && (
          <div className={`
            w-12 h-0.5 mx-2
            ${index < currentStep ? "bg-emerald-500" : "bg-zinc-200"}
          `} />
        )}
      </React.Fragment>
    ))}
  </div>
);
```

### 数据表格交互

#### 行操作（Row Actions）
```tsx
// 表格行悬停显示操作
const TableRowWithActions = ({ 
  children, 
  actions 
}: { 
  children: React.ReactNode;
  actions: React.ReactNode;
}) => (
  <tr className="group border-b border-border-secondary hover:bg-bg-secondary/50 transition-colors">
    <td className="px-4 py-3">{children}</td>
    <td className="px-4 py-3">
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {actions}
      </div>
    </td>
  </tr>
);

// 批量操作栏
const BulkActions = ({ 
  selectedCount, 
  actions 
}: { 
  selectedCount: number;
  actions: React.ReactNode;
}) => (
  <div className={`
    fixed bottom-4 left-1/2 -translate-x-1/2 
    bg-zinc-900 text-white rounded-full shadow-lg
    px-4 py-2 flex items-center gap-4
    transition-all duration-300
    ${selectedCount > 0 ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0"}
  `}>
    <span className="text-sm font-medium">已选择 {selectedCount} 项</span>
    <div className="flex items-center gap-1">{actions}</div>
  </div>
);
```

### 表单交互优化

#### 智能输入框
```tsx
// 带图标的输入框
const InputWithIcon = ({ 
  icon: Icon, 
  ...props 
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: PhosphorIcon }) => (
  <div className="relative">
    <Icon 
      size={16} 
      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" 
    />
    <input 
      className="w-full h-9 pl-9 pr-3 py-2 bg-white border border-border-primary rounded-md
                 text-sm text-text-primary placeholder:text-text-muted
                 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400
                 transition-all duration-150"
      {...props}
    />
  </div>
);

// 清除按钮输入框
const InputWithClear = ({ 
  value, 
  onChange, 
  onClear, 
  ...props 
}: React.InputHTMLAttributes<HTMLInputElement> & { onClear: () => void }) => (
  <div className="relative">
    <input 
      value={value}
      onChange={onChange}
      className="w-full h-9 px-3 py-2 pr-8 bg-white border border-border-primary rounded-md
                 text-sm text-text-primary placeholder:text-text-muted
                 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
      {...props}
    />
    {value && (
      <button 
        onClick={onClear}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
      >
        <XCircle size={16} weight="fill" />
      </button>
    )}
  </div>
);
```

---

## 17. 动效设计系统

### 动效原则
- **目的性**：每个动效都应有明确目的（引导、反馈、过渡）
- **一致性**：同类动效保持统一的时间和缓动
- **性能优先**：使用 transform 和 opacity，避免触发重排
- **尊重用户**：支持 `prefers-reduced-motion` 媒体查询

### 时间规范
```css
--duration-instant: 100ms;   /* 微交互：按钮点击 */
--duration-fast: 150ms;      /* 快速反馈：悬停、聚焦 */
--duration-normal: 200ms;    /* 标准过渡：状态变化 */
--duration-slow: 300ms;      /* 慢速过渡：页面切换 */
--duration-complex: 500ms;   /* 复杂动画：模态框 */
```

### 缓动函数
```css
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);           /* 加速 - 元素离开 */
--ease-out: cubic-bezier(0, 0, 0.2, 1);          /* 减速 - 元素进入 */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);     /* 标准 - 状态变化 */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* 弹性 - 活泼效果 */
```

### 常用动效模式

#### 淡入淡出
```tsx
const fadeTransition = "opacity-0 transition-opacity duration-200";
const fadeIn = "opacity-100";
```

#### 滑入滑出
```tsx
const slideUpTransition = "translate-y-4 opacity-0 transition-all duration-300 ease-out";
const slideUpIn = "translate-y-0 opacity-100";
```

#### 缩放弹出
```tsx
const scaleTransition = "scale-95 opacity-0 transition-all duration-200 ease-out";
const scaleIn = "scale-100 opacity-100";
```

---

## 18. 响应式设计策略

### 断点定义
```css
/* 移动优先 */
--breakpoint-sm: 640px;   /* 手机横屏 */
--breakpoint-md: 768px;   /* 平板竖屏 */
--breakpoint-lg: 1024px;  /* 平板横屏/小桌面 */
--breakpoint-xl: 1280px;  /* 标准桌面 */
--breakpoint-2xl: 1536px; /* 大桌面 */
```

### 布局适配策略
| 组件 | 移动端 (<768px) | 平板 (768-1024px) | 桌面 (>1024px) |
|-----|----------------|------------------|---------------|
| 侧边栏 | 抽屉式/隐藏 | 可折叠 | 固定展开 |
| 表格 | 卡片式/横向滚动 | 简化列 | 完整表格 |
| 表单 | 单列堆叠 | 双列 | 多列网格 |
| 导航 | 底部标签栏 | 侧边栏 | 顶部导航 |
| 操作按钮 | 底部固定 | 内联显示 | 内联显示 |

### 触摸优化
- 点击目标最小 44x44px
- 按钮间距至少 8px
- 支持手势操作（滑动、捏合）
- 避免 hover-only 交互

---

## 19. 无障碍设计（A11y）

### 键盘导航
```tsx
// Tab 顺序管理
tabIndex={0}  // 可聚焦
tabIndex={-1} // 可脚本聚焦，但不在 Tab 序列中

// 快捷键支持
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      switch(e.key) {
        case 'k': // Cmd/Ctrl + K 打开搜索
          e.preventDefault();
          openSearch();
          break;
        case 'n': // Cmd/Ctrl + N 新建
          e.preventDefault();
          handleCreate();
          break;
      }
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

### 屏幕阅读器支持
```tsx
// ARIA 标签
<button aria-label="关闭对话框" onClick={onClose}>
  <X size={16} />
</button>

// 状态通知
<div role="status" aria-live="polite" className="sr-only">
  订单创建成功
</div>

// 模态框
<dialog 
  role="dialog" 
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">确认删除</h2>
  <p id="dialog-description">此操作不可撤销</p>
</dialog>
```

### 减少动效偏好
```tsx
const prefersReducedMotion = 
  typeof window !== 'undefined' && 
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const transitionStyles = prefersReducedMotion 
  ? "transition-none" 
  : "transition-all duration-200";
```

---

## 20. 设计交付检查清单

### 视觉质量
- [ ] 无 Emoji 图标，使用 SVG 图标库
- [ ] 图标尺寸一致（推荐 24x24 viewBox）
- [ ] 品牌 Logo 正确（使用 Simple Icons 官方 SVG）
- [ ] 悬停状态不引起布局偏移
- [ ] 颜色对比度符合 WCAG AA 标准

### 交互质量
- [ ] 所有可点击元素有 `cursor-pointer`
- [ ] 悬停状态提供清晰视觉反馈
- [ ] 焦点状态可见（键盘导航）
- [ ] 过渡动画时长在 100-300ms 之间
- [ ] 加载状态有骨架屏或进度指示

### 响应式
- [ ] 移动端布局适配（375px）
- [ ] 平板布局适配（768px）
- [ ] 桌面布局适配（1280px+）
- [ ] 无水平滚动条
- [ ] 触摸目标最小 44x44px

### 无障碍
- [ ] 图片有 alt 文本
- [ ] 表单有关联 label
- [ ] 颜色不是唯一信息载体
- [ ] 支持键盘导航
- [ ] 尊重 `prefers-reduced-motion`

### 性能
- [ ] 使用 transform 和 opacity 动画
- [ ] 图片懒加载
- [ ] 组件按需加载
- [ ] 无内存泄漏

---

## 总结

Minimal UX Supreme 设计系统的核心理念：

1. **极简** - 每个像素都有存在的理由
2. **高定** - 毫米级细节打磨
3. **专业** - 为企业级应用打造
4. **直觉** - 用户无需思考即可操作
5. **一致** - 全系统统一的视觉与交互语言
6. **包容** - 无障碍设计，服务所有用户

> "好的设计是尽可能少的设计。" —— Dieter Rams
> 
> "设计不仅仅是外观和感觉，设计是它如何工作。" —— Steve Jobs
