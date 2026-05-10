'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Download,
  Trash2,
  Clock,
  FileCheck,
  Shield,
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface BackupRecord {
  id: number;
  enterpriseId: number;
  backupType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  status: string;
  checksum?: string;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: Date;
}

interface BackupConfig {
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupTime: string;
  retentionDays: number;
  includeFiles: boolean;
  encryptionEnabled: boolean;
}

interface BackupStats {
  totalBackups: number;
  successfulBackups: number;
  failedBackups: number;
  totalSize: number;
  latestBackup?: Date;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-700">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          已完成
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-700">
          <AlertCircle className="w-3 h-3 mr-1" />
          失败
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
          <Clock className="w-3 h-3 mr-1" />
          {status}
        </Badge>
      );
  }
}

function getBackupTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    full: '全量备份',
    enterprise: '企业备份',
    export_json: '数据导出',
  };
  return typeMap[type] || type;
}

export default function BackupPanel() {
  const [activeTab, setActiveTab] = useState<'list' | 'config'>('list');
  const [configForm, setConfigForm] = useState<BackupConfig | null>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);

  const queryClient = useQueryClient();

  const backupsQuery = useQuery({
    queryKey: ['backups'],
    queryFn: async (): Promise<BackupRecord[]> => {
      const raw = await api.get<unknown>('/system/backup/list');
      if (Array.isArray(raw)) return raw as BackupRecord[];
      return [];
    },
  });

  const configQuery = useQuery({
    queryKey: ['backup-config'],
    queryFn: () => api.get<BackupConfig>('/system/backup/config'),
  });

  const statsQuery = useQuery({
    queryKey: ['backup-stats'],
    queryFn: () => api.get<BackupStats>('/system/backup/stats'),
  });

  const backups = backupsQuery.data;
  const backupsLoading = backupsQuery.isLoading;
  const backupsError = backupsQuery.error;

  const config = configQuery.data;
  const configLoading = configQuery.isLoading;

  const stats = statsQuery.data;
  const statsLoading = statsQuery.isLoading;

  useEffect(() => {
    if (configQuery.data) {
      setConfigForm(configQuery.data);
    }
  }, [configQuery.data]);

  const createBackupMutation = useMutation({
    mutationFn: () => api.post<unknown>('/system/backup/create'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      queryClient.invalidateQueries({ queryKey: ['backup-stats'] });
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: (recordId: number) =>
      api.delete<unknown>(`/system/backup/${recordId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      queryClient.invalidateQueries({ queryKey: ['backup-stats'] });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: (newConfig: Partial<BackupConfig>) =>
      api.put<unknown>('/system/backup/config', newConfig),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-config'] });
    },
  });

  const handleDownload = useCallback((fileName: string) => {
    window.open(`/api/system/backup/download/${fileName}`, '_blank');
  }, []);

  const handleVerify = useCallback(async (fileName: string) => {
    setShowVerifyDialog(fileName);
    try {
      const data = await api.get<{ valid: boolean; message: string }>(
        `/system/backup/verify/${encodeURIComponent(fileName)}`,
      );
      setVerifyResult(data);
    } catch (e) {
      setVerifyResult({
        valid: false,
        message:
          e instanceof Error ? e.message : "验证请求失败，请稍后重试",
      });
    }
  }, []);

  const handleExport = useCallback(() => {
    window.open('/api/system/backup/export', '_blank');
  }, []);

  const handleConfigSave = useCallback(() => {
    if (configForm) {
      updateConfigMutation.mutate(configForm);
    }
  }, [configForm, updateConfigMutation]);

  const handleConfigChange = useCallback(
    (key: keyof BackupConfig, value: BackupConfig[keyof BackupConfig]) => {
      if (configForm) {
        setConfigForm(prev => ({ ...prev!, [key]: value }));
      }
    },
    [configForm],
  );

  const backupList = backups ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">数据备份</h1>
          <p className="text-sm text-zinc-500 mt-1">管理企业数据备份，确保数据安全</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            导出数据
          </Button>
          <Button
            onClick={() => createBackupMutation.mutate()}
            disabled={createBackupMutation.isPending}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${createBackupMutation.isPending ? 'animate-spin' : ''}`} />
            创建备份
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">总备份数</p>
                <p className="text-2xl font-bold mt-1">
                  {statsLoading ? '...' : stats?.totalBackups || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <FileCheck className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">成功备份</p>
                <p className="text-2xl font-bold mt-1">
                  {statsLoading ? '...' : stats?.successfulBackups || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">备份大小</p>
                <p className="text-2xl font-bold mt-1">
                  {statsLoading ? '...' : formatFileSize(stats?.totalSize || 0)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">最近备份</p>
                <p className="text-sm font-medium mt-1">
                  {statsLoading ? '...' : stats?.latestBackup ? formatDate(stats.latestBackup) : '暂无'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 p-1 bg-zinc-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'list'
              ? 'bg-white shadow text-zinc-900'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          备份列表
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'config'
              ? 'bg-white shadow text-zinc-900'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Settings className="w-4 h-4 inline mr-1" />
          备份设置
        </button>
      </div>

      {activeTab === 'list' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>备份记录</CardTitle>
              <CardDescription>管理所有备份文件</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {backupsLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-zinc-400 animate-spin" />
              </div>
            ) : backupsError ? (
              <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
                <p className="font-medium">无法加载备份列表</p>
                <p className="mt-1 whitespace-pre-wrap">
                  {backupsError instanceof Error
                    ? backupsError.message
                    : String(backupsError)}
                </p>
                <p className="mt-2 text-xs text-red-700/90">
                  若接口返回 500，多为后端尚未实现或配置异常，请查看 API 日志；修复后可点击页面其它操作触发刷新。
                </p>
              </div>
            ) : backupList.length === 0 ? (
              <div className="text-center py-12">
                <FileCheck className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-500">暂无备份记录</p>
                <p className="text-sm text-zinc-400 mt-1">点击上方按钮创建第一个备份</p>
              </div>
            ) : (
              <div className="space-y-4">
                {backupList.map(backup => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-zinc-200 flex items-center justify-center">
                        <FileCheck className="w-6 h-6 text-zinc-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-900">
                            {backup.fileName}
                          </span>
                          {getStatusBadge(backup.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-zinc-500 mt-1">
                          <span>{getBackupTypeLabel(backup.backupType)}</span>
                          <span>{formatFileSize(backup.fileSize)}</span>
                          <span>{formatDate(backup.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => handleVerify(backup.fileName)}>
                            <FileCheck className="w-4 h-4 mr-1" />
                            验证
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>备份验证结果</DialogTitle>
                          </DialogHeader>
                          <DialogDescription className="flex items-center gap-2">
                            {verifyResult?.valid ? (
                              <>
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span className="text-green-700">{verifyResult.message}</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-5 h-5 text-red-500" />
                                <span className="text-red-700">{verifyResult?.message || '验证中...'}</span>
                              </>
                            )}
                          </DialogDescription>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(backup.fileName)}
                        disabled={backup.status !== 'completed'}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        下载
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            更多
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deleteBackupMutation.mutate(backup.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除备份
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleVerify(backup.fileName)}>
                            <FileCheck className="w-4 h-4 mr-2" />
                            验证完整性
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'config' && (
        <Card>
          <CardHeader>
            <CardTitle>备份设置</CardTitle>
            <CardDescription>配置自动备份和保留策略</CardDescription>
          </CardHeader>
          <CardContent>
            {configLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-zinc-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-6 max-w-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">自动备份</Label>
                    <p className="text-sm text-zinc-500 mt-1">启用后系统将自动定期备份数据</p>
                  </div>
                  <Switch
                    checked={configForm?.autoBackup || false}
                    onCheckedChange={(checked) => handleConfigChange('autoBackup', checked)}
                  />
                </div>

                <div>
                  <Label className="text-base font-medium">备份频率</Label>
                  <p className="text-sm text-zinc-500 mt-1">设置自动备份的时间间隔</p>
                  <div className="flex items-center gap-3 mt-3">
                    {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                      <button
                        key={freq}
                        onClick={() => handleConfigChange('backupFrequency', freq)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          configForm?.backupFrequency === freq
                            ? 'bg-purple-500 text-white'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        }`}
                      >
                        {freq === 'daily' ? '每天' : freq === 'weekly' ? '每周' : '每月'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">备份时间</Label>
                  <p className="text-sm text-zinc-500 mt-1">设置自动备份的执行时间（24小时制）</p>
                  <Input
                    type="time"
                    value={configForm?.backupTime || '02:00'}
                    onChange={(e) => handleConfigChange('backupTime', e.target.value)}
                    className="mt-3"
                  />
                </div>

                <div>
                  <Label className="text-base font-medium">备份保留天数</Label>
                  <p className="text-sm text-zinc-500 mt-1">超过此天数的备份将自动删除</p>
                  <div className="flex items-center gap-3 mt-3">
                    <Input
                      type="number"
                      min="7"
                      max="365"
                      value={configForm?.retentionDays || 30}
                      onChange={(e) => handleConfigChange('retentionDays', parseInt(e.target.value) || 30)}
                      className="w-32"
                    />
                    <span className="text-zinc-500">天</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">包含附件文件</Label>
                    <p className="text-sm text-zinc-500 mt-1">备份时同时包含上传的文件附件</p>
                  </div>
                  <Switch
                    checked={configForm?.includeFiles || false}
                    onCheckedChange={(checked) => handleConfigChange('includeFiles', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">加密备份</Label>
                    <p className="text-sm text-zinc-500 mt-1">使用加密方式存储备份文件（需要配置加密密钥）</p>
                  </div>
                  <Switch
                    checked={configForm?.encryptionEnabled || false}
                    onCheckedChange={(checked) => handleConfigChange('encryptionEnabled', checked)}
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <p className="text-sm text-blue-700">
                    建议定期创建手动备份并下载保存到安全位置，以防数据丢失。
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleConfigSave}
                    disabled={updateConfigMutation.isPending}
                  >
                    {updateConfigMutation.isPending ? '保存中...' : '保存设置'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}