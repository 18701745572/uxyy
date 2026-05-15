"use client";

/**
 * 语义化图标映射
 * 提供更具业务语义的图标命名
 */

import {
  // 基础
  Plus,
  PencilSimple,
  Trash,
  Check,
  X,
  XCircle,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowsClockwise,
  MagnifyingGlass,
  DotsThree,
  DotsThreeVertical,
  
  // 导航
  House,
  List,
  Bell,
  Gear,
  
  // 用户
  User,
  Users,
  UserCircle,
  Crown,
  
  // 业务
  Building,
  Package,
  Archive,
  Truck,
  Storefront,
  Barcode,
  Tag,
  
  // 财务
  Coins,
  CurrencyDollar,
  Receipt,
  Invoice,
  CreditCard,
  Wallet,
  Bank,
  PiggyBank,
  ChartLineUp,
  ChartPie,
  ChartBar,
  TrendUp,
  TrendDown,
  
  // 文档
  FileText,
  Files,
  Folder,
  FolderOpen,
  ClipboardText,
  BookOpen,
  FileCsv,
  FilePdf,
  FileXls,
  DownloadSimple,
  UploadSimple,
  Export,
  
  // 时间
  Calendar,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  Clock,
  ClockCounterClockwise,
  Timer,
  Hourglass,
  
  // 状态
  Info,
  Warning,
  WarningCircle,
  WarningOctagon,
  Question,
  Prohibit,
  Shield,
  ShieldCheck,
  
  // 操作
  Eye,
  EyeSlash,
  Lock,
  LockOpen,
  Copy,
  Clipboard,
  Link,
  LinkBreak,
  Funnel,
  SortAscending,
  SortDescending,
  CaretUpDown,
  ArrowsVertical,
  ArrowLineUp,
  ArrowLineDown,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  
  // 通讯
  Envelope,
  Phone,
  ChatText,
  PaperPlane,
  ShareNetwork,
  
  // AI
  Robot,
  Brain,
  Sparkle,
  MagicWand,
  Scan,
  
  // 系统
  Desktop,
  DeviceMobile,
  HardDrives,
  Database,
  Cloud,
  CloudArrowUp,
  CloudArrowDown,
  WifiHigh,
  Printer,
  
  // 加载
  Spinner,
  SpinnerGap,
} from "@phosphor-icons/react";

// ==================== 操作图标 ====================
export const ActionIcons = {
  /** 创建/新增 */
  create: Plus,
  /** 编辑/修改 */
  edit: PencilSimple,
  /** 删除/移除 */
  delete: Trash,
  /** 保存 */
  save: Check,
  /** 取消 */
  cancel: X,
  /** 确认 */
  confirm: CheckCircle,
  /** 关闭 */
  close: X,
  /** 返回 */
  back: ArrowLeft,
  /** 前进 */
  forward: ArrowRight,
  /** 向上 */
  up: ArrowUp,
  /** 向下 */
  down: ArrowDown,
  /** 刷新 */
  refresh: ArrowsClockwise,
  /** 搜索 */
  search: MagnifyingGlass,
  /** 更多 */
  more: DotsThree,
  /** 更多（垂直） */
  moreVertical: DotsThreeVertical,
  /** 查看 */
  view: Eye,
  /** 隐藏 */
  hide: EyeSlash,
  /** 复制 */
  copy: Copy,
  /** 粘贴 */
  paste: Clipboard,
  /** 链接 */
  link: Link,
  /** 取消链接 */
  unlink: LinkBreak,
  /** 锁定 */
  lock: Lock,
  /** 解锁 */
  unlock: LockOpen,
  /** 筛选 */
  filter: Funnel,
  /** 升序 */
  sortAsc: SortAscending,
  /** 降序 */
  sortDesc: SortDescending,
  /** 排序（默认状态） */
  sort: CaretUpDown,
  /** 上下移动/拖拽排序 */
  moveVertical: ArrowsVertical,
  /** 置顶 */
  moveToTop: ArrowLineUp,
  /** 置底 */
  moveToBottom: ArrowLineDown,
  /** 放大 */
  zoomIn: MagnifyingGlassPlus,
  /** 缩小 */
  zoomOut: MagnifyingGlassMinus,
  /** 下载 */
  download: DownloadSimple,
  /** 上传 */
  upload: UploadSimple,
  /** 导出 */
  export: Export,
} as const;

// ==================== 导航图标 ====================
export const NavIcons = {
  /** 首页 */
  home: House,
  /** 菜单 */
  menu: List,
  /** 消息/通知 */
  notifications: Bell,
  /** 设置 */
  settings: Gear,
  /** 返回 */
  back: ArrowLeft,
  /** 前进 */
  forward: ArrowRight,
} as const;

// ==================== 用户图标 ====================
export const UserIcons = {
  /** 用户 */
  user: User,
  /** 用户（圆形） */
  userCircle: UserCircle,
  /** 用户组 */
  users: Users,
  /** 会员/VIP */
  vip: Crown,
} as const;

// ==================== CRM图标 ====================
export const CRMIcons = {
  /** 客户 */
  customer: Building,
  /** 联系人 */
  contact: User,
  /** 商机 */
  opportunity: TrendUp,
  /** 跟进 */
  followUp: ChatText,
  /** 分类 */
  category: Tag,
} as const;

// ==================== 库存图标 ====================
export const InventoryIcons = {
  /** 产品/商品 */
  product: Package,
  /** 库存 */
  stock: Archive,
  /** 入库 */
  inbound: ArrowDown,
  /** 出库 */
  outbound: ArrowUp,
  /** 运输 */
  shipping: Truck,
  /** 仓库/店铺 */
  warehouse: Storefront,
  /** 条码 */
  barcode: Barcode,
  /** 标签 */
  tag: Tag,
} as const;

// ==================== 财务图标 ====================
export const FinanceIcons = {
  /** 货币/金额 */
  money: Coins,
  /** 美元 */
  dollar: CurrencyDollar,
  /** 收据/回款 */
  receipt: Receipt,
  /** 发票 */
  invoice: Invoice,
  /** 信用卡 */
  creditCard: CreditCard,
  /** 钱包 */
  wallet: Wallet,
  /** 银行 */
  bank: Bank,
  /** 储蓄 */
  savings: PiggyBank,
  /** 折线图 */
  chartLine: ChartLineUp,
  /** 饼图 */
  chartPie: ChartPie,
  /** 柱状图 */
  chartBar: ChartBar,
  /** 上升 */
  trendUp: TrendUp,
  /** 下降 */
  trendDown: TrendDown,
} as const;

// ==================== 文档图标 ====================
export const DocumentIcons = {
  /** 文档 */
  document: FileText,
  /** 多文档 */
  documents: Files,
  /** 文件夹 */
  folder: Folder,
  /** 打开文件夹 */
  folderOpen: FolderOpen,
  /** 剪贴板 */
  clipboard: ClipboardText,
  /** 账本 */
  ledger: BookOpen,
  /** CSV文件 */
  csv: FileCsv,
  /** PDF文件 */
  pdf: FilePdf,
  /** Excel文件 */
  excel: FileXls,
} as const;

// ==================== 时间图标 ====================
export const TimeIcons = {
  /** 日历 */
  calendar: Calendar,
  /** 日历（勾选） */
  calendarCheck: CalendarCheck,
  /** 日历（添加） */
  calendarAdd: CalendarPlus,
  /** 日历（删除） */
  calendarRemove: CalendarX,
  /** 时钟 */
  clock: Clock,
  /** 历史 */
  history: ClockCounterClockwise,
  /** 计时器 */
  timer: Timer,
  /** 沙漏 */
  hourglass: Hourglass,
} as const;

// ==================== 状态图标 ====================
export const StatusIcons = {
  /** 信息 */
  info: Info,
  /** 警告 */
  warning: Warning,
  /** 警告（圆形） */
  warningCircle: WarningCircle,
  /** 错误 */
  error: WarningOctagon,
  /** 问题 */
  question: Question,
  /** 禁止 */
  blocked: Prohibit,
  /** 盾牌 */
  shield: Shield,
  /** 盾牌（勾选） */
  shieldCheck: ShieldCheck,
  /** 成功 */
  success: CheckCircle,
  /** 失败 */
  failure: XCircle,
} as const;

// ==================== 通讯图标 ====================
export const CommunicationIcons = {
  /** 邮件 */
  email: Envelope,
  /** 电话 */
  phone: Phone,
  /** 聊天 */
  chat: ChatText,
  /** 发送 */
  send: PaperPlane,
  /** 分享 */
  share: ShareNetwork,
} as const;

// ==================== AI图标 ====================
export const AIIcons = {
  /** AI机器人 */
  robot: Robot,
  /** 大脑 */
  brain: Brain,
  /** 闪光/智能 */
  sparkle: Sparkle,
  /** 魔棒 */
  magic: MagicWand,
  /** 扫描 */
  scan: Scan,
} as const;

// ==================== 系统图标 ====================
export const SystemIcons = {
  /** 桌面 */
  desktop: Desktop,
  /** 手机 */
  mobile: DeviceMobile,
  /** 存储 */
  storage: HardDrives,
  /** 数据库 */
  database: Database,
  /** 云 */
  cloud: Cloud,
  /** 云上传 */
  cloudUpload: CloudArrowUp,
  /** 云下载 */
  cloudDownload: CloudArrowDown,
  /** WiFi */
  wifi: WifiHigh,
  /** 打印机 */
  printer: Printer,
} as const;

// ==================== 加载图标 ====================
export const LoadingIcons = {
  /** 加载中 */
  spinner: Spinner,
  /** 加载中（间隙） */
  spinnerGap: SpinnerGap,
} as const;

// ==================== 统一导出 ====================
export const Icons = {
  action: ActionIcons,
  nav: NavIcons,
  user: UserIcons,
  crm: CRMIcons,
  inventory: InventoryIcons,
  finance: FinanceIcons,
  document: DocumentIcons,
  time: TimeIcons,
  status: StatusIcons,
  communication: CommunicationIcons,
  ai: AIIcons,
  system: SystemIcons,
  loading: LoadingIcons,
} as const;
