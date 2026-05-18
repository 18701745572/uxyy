import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface WeComConfig {
  corpId: string;
  agentId: string;
  secret: string;
}

export interface WeComMessage {
  touser?: string;
  toparty?: string;
  totag?: string;
  msgtype: string;
  agentid: string;
  safe?: number;
}

export interface TextMessage extends WeComMessage {
  text: {
    content: string;
  };
}

export interface TextCardMessage extends WeComMessage {
  textcard: {
    title: string;
    description: string;
    url: string;
    btntxt?: string;
  };
}

@Injectable()
export class WeComService {
  private readonly logger = new Logger(WeComService.name);
  private accessToken: string = '';
  private tokenExpireTime: number = 0;
  private readonly config: WeComConfig;

  constructor() {
    this.config = {
      corpId: process.env.WECOM_CORP_ID || '',
      agentId: process.env.WECOM_AGENT_ID || '',
      secret: process.env.WECOM_SECRET || '',
    };
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();

    if (this.accessToken && now < this.tokenExpireTime) {
      return this.accessToken;
    }

    if (!this.config.corpId || !this.config.secret) {
      this.logger.warn('企业微信配置未完成，无法获取access_token');
      return '';
    }

    try {
      const response = await axios.get(
        'https://qyapi.weixin.qq.com/cgi-bin/gettoken',
        {
          params: {
            corpid: this.config.corpId,
            corpsecret: this.config.secret,
          },
        },
      );

      if (response.data.errcode === 0) {
        this.accessToken = response.data.access_token;
        this.tokenExpireTime = now + (response.data.expires_in - 120) * 1000;
        return this.accessToken;
      } else {
        this.logger.error(
          `获取企业微信access_token失败: ${response.data.errmsg}`,
        );
        throw new Error(response.data.errmsg);
      }
    } catch (error) {
      this.logger.error(`获取企业微信access_token异常: ${error.message}`);
      throw error;
    }
  }

  async sendTextMessage(
    toUser: string,
    content: string,
  ): Promise<{ errcode: number; errmsg: string }> {
    const token = await this.getAccessToken();
    if (!token) {
      return { errcode: -1, errmsg: '企业微信未配置' };
    }

    const message: TextMessage = {
      touser: toUser,
      msgtype: 'text',
      agentid: this.config.agentId,
      text: { content },
    };

    try {
      const response = await axios.post(
        'https://qyapi.weixin.qq.com/cgi-bin/message/send',
        message,
        {
          params: { access_token: token },
        },
      );
      return response.data;
    } catch (error) {
      this.logger.error(`发送企业微信消息失败: ${error.message}`);
      throw error;
    }
  }

  async sendTextCardMessage(
    toUser: string,
    title: string,
    description: string,
    url: string,
    btnText: string = '查看详情',
  ): Promise<{ errcode: number; errmsg: string }> {
    const token = await this.getAccessToken();
    if (!token) {
      return { errcode: -1, errmsg: '企业微信未配置' };
    }

    const message: TextCardMessage = {
      touser: toUser,
      msgtype: 'textcard',
      agentid: this.config.agentId,
      textcard: {
        title,
        description,
        url,
        btntxt: btnText,
      },
    };

    try {
      const response = await axios.post(
        'https://qyapi.weixin.qq.com/cgi-bin/message/send',
        message,
        {
          params: { access_token: token },
        },
      );
      return response.data;
    } catch (error) {
      this.logger.error(`发送企业微信卡片消息失败: ${error.message}`);
      throw error;
    }
  }

  async sendApprovalNotification(
    toUser: string,
    title: string,
    content: string,
    approveUrl: string,
  ): Promise<{ errcode: number; errmsg: string }> {
    const description = `
<div class="gray">${new Date().toLocaleString()}</div>
<div class="normal">${content}</div>
<div class="highlight">请及时处理审批</div>
    `.trim();

    return this.sendTextCardMessage(toUser, title, description, approveUrl);
  }

  async sendStockAlert(
    toUser: string,
    productName: string,
    stock: number,
    minStock: number,
  ): Promise<{ errcode: number; errmsg: string }> {
    const content = `【库存预警】\n商品: ${productName}\n当前库存: ${stock}\n最低库存: ${minStock}`;
    return this.sendTextMessage(toUser, content);
  }

  async sendPriceAnomalyAlert(
    toUser: string,
    productName: string,
    orderType: string,
    price: number,
    normalPrice: number,
  ): Promise<{ errcode: number; errmsg: string }> {
    const content = `【价格异常检测】\n商品: ${productName}\n订单类型: ${orderType}\n异常价格: ¥${price}\n正常价格: ¥${normalPrice}`;
    return this.sendTextMessage(toUser, content);
  }

  async getDepartmentList(): Promise<any> {
    const token = await this.getAccessToken();
    if (!token) {
      return [];
    }

    try {
      const response = await axios.get(
        'https://qyapi.weixin.qq.com/cgi-bin/department/list',
        {
          params: { access_token: token },
        },
      );
      return response.data;
    } catch (error) {
      this.logger.error(`获取部门列表失败: ${error.message}`);
      throw error;
    }
  }

  async getUserList(departmentId?: number): Promise<any> {
    const token = await this.getAccessToken();
    if (!token) {
      return [];
    }

    try {
      const response = await axios.get(
        'https://qyapi.weixin.qq.com/cgi-bin/user/simplelist',
        {
          params: {
            access_token: token,
            department_id: departmentId || 1,
            fetch_child: 1,
          },
        },
      );
      return response.data;
    } catch (error) {
      this.logger.error(`获取用户列表失败: ${error.message}`);
      throw error;
    }
  }

  async getUserInfo(userId: string): Promise<any> {
    const token = await this.getAccessToken();
    if (!token) {
      return null;
    }

    try {
      const response = await axios.get(
        'https://qyapi.weixin.qq.com/cgi-bin/user/get',
        {
          params: {
            access_token: token,
            userid: userId,
          },
        },
      );
      return response.data;
    } catch (error) {
      this.logger.error(`获取用户信息失败: ${error.message}`);
      throw error;
    }
  }

  getOAuthUrl(redirectUri: string, state?: string): string {
    const encodedUri = encodeURIComponent(redirectUri);
    return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${this.config.corpId}&redirect_uri=${encodedUri}&response_type=code&scope=snsapi_base&state=${state || 'STATE'}#wechat_redirect`;
  }

  async getUserIdByCode(code: string): Promise<string | null> {
    const token = await this.getAccessToken();
    if (!token) {
      return null;
    }

    try {
      const response = await axios.get(
        'https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo',
        {
          params: {
            access_token: token,
            code,
          },
        },
      );

      if (response.data.errcode === 0) {
        return response.data.UserId;
      } else {
        this.logger.error(`获取用户ID失败: ${response.data.errmsg}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`通过code获取用户ID失败: ${error.message}`);
      return null;
    }
  }
}
