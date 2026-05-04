'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/api/auth';

interface UserProfile {
  id: number;
  phone: string;
  nickname?: string;
  enterprises: Array<{
    id: number;
    name: string;
    role: string;
    isDefault: boolean;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    authApi.getProfile()
      .then((res) => {
        setProfile(res.data);
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        router.push('/login');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航 */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">优信云业</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{profile?.nickname || profile?.phone}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-500"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 企业信息 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">我的企业</h2>
            {profile?.enterprises && profile.enterprises.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profile.enterprises.map((enterprise) => (
                  <div
                    key={enterprise.id}
                    className={`border rounded-lg p-4 ${
                      enterprise.isDefault ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{enterprise.name}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      角色: {enterprise.role === 'owner' ? '所有者' : '成员'}
                      {enterprise.isDefault && (
                        <span className="ml-2 text-blue-600">(默认)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500">暂无企业，请先创建企业</div>
            )}
          </div>

          {/* 功能模块 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/customers">
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-2xl mb-2">👥</div>
                <h3 className="text-lg font-medium text-gray-900">客户管理</h3>
                <p className="text-sm text-gray-500 mt-1">管理客户信息和跟进记录</p>
              </div>
            </Link>

            <Link href="/products">
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-2xl mb-2">📦</div>
                <h3 className="text-lg font-medium text-gray-900">商品管理</h3>
                <p className="text-sm text-gray-500 mt-1">管理商品和库存</p>
              </div>
            </Link>

            <Link href="/orders">
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-2xl mb-2">📋</div>
                <h3 className="text-lg font-medium text-gray-900">订单管理</h3>
                <p className="text-sm text-gray-500 mt-1">采购和销售订单</p>
              </div>
            </Link>

            <Link href="/finance">
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-2xl mb-2">💰</div>
                <h3 className="text-lg font-medium text-gray-900">财务管理</h3>
                <p className="text-sm text-gray-500 mt-1">发票、凭证和报表</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
