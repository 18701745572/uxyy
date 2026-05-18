import { Module, Global } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

/**
 * 结构化日志模块
 * 使用 Pino 提供高性能的 JSON 格式日志
 */
@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('NODE_ENV') === 'production';
        const logLevel =
          config.get('LOG_LEVEL') || (isProduction ? 'info' : 'debug');

        return {
          pinoHttp: {
            level: logLevel,
            // 生产环境使用 JSON 格式，开发环境使用可读格式
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    levelFirst: true,
                    translateTime: 'yyyy-mm-dd HH:MM:ss.l',
                    ignore: 'pid,hostname',
                  },
                },
            // 自定义序列化器
            serializers: {
              req: (req) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                headers: {
                  'user-agent': req.headers['user-agent'],
                  'x-request-id': req.headers['x-request-id'],
                },
              }),
              res: (res) => ({
                statusCode: res.statusCode,
              }),
            },
            // 自定义日志属性
            customProps: (req) => ({
              context: 'HTTP',
              requestId: req.id,
            }),
            // 自动记录请求日志
            autoLogging: {
              ignore: (req) => {
                // 忽略健康检查端点的日志
                return req.url === '/health' || req.url === '/api/v1/health';
              },
            },
            // 格式化日志
            formatters: {
              level: (label) => ({ level: label.toUpperCase() }),
              bindings: (bindings) => ({
                pid: bindings.pid,
                env: config.get('NODE_ENV') || 'development',
              }),
            },
            // 生产环境启用日志轮转（通过外部工具如 logrotate）
            // 这里配置日志文件路径
            ...(isProduction && {
              destination:
                config.get('LOG_FILE_PATH') || '/var/log/uxyy/app.log',
            }),
          },
        };
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
