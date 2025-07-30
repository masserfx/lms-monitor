import fetch from 'node-fetch';
import { CheckResult } from './monitor';

export interface AlertConfig {
  channels: ('email' | 'slack' | 'discord')[];
  targetName: string;
  result: CheckResult;
}

export class AlertService {
  async sendAlert(config: AlertConfig): Promise<void> {
    const promises = config.channels.map(channel => {
      switch (channel) {
        case 'email':
          return this.sendEmailAlert(config);
        case 'slack':
          return this.sendSlackAlert(config);
        case 'discord':
          return this.sendDiscordAlert(config);
      }
    });

    await Promise.allSettled(promises);
  }

  private async sendEmailAlert(config: AlertConfig): Promise<void> {
    if (!process.env.SENDGRID_API_KEY) return;

    const subject = config.result.status === 'healthy' 
      ? `✅ ${config.targetName} is back online`
      : `🚨 ${config.targetName} is down`;

    const body = this.formatAlertMessage(config);

    try {
      await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: process.env.EMAIL_TO }],
          }],
          from: { email: process.env.EMAIL_FROM },
          subject,
          content: [{
            type: 'text/plain',
            value: body,
          }],
        }),
      });
    } catch (error) {
      console.error('Failed to send email alert:', error);
    }
  }

  private async sendSlackAlert(config: AlertConfig): Promise<void> {
    if (!process.env.SLACK_WEBHOOK_URL) return;

    const emoji = config.result.status === 'healthy' ? ':white_check_mark:' : ':rotating_light:';
    const color = config.result.status === 'healthy' ? 'good' : 'danger';

    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `${emoji} Monitoring Alert: ${config.targetName}`,
          attachments: [{
            color,
            fields: [
              {
                title: 'Status',
                value: config.result.status.toUpperCase(),
                short: true,
              },
              {
                title: 'Response Time',
                value: `${config.result.responseTime}ms`,
                short: true,
              },
              {
                title: 'Status Code',
                value: config.result.statusCode.toString(),
                short: true,
              },
              {
                title: 'Timestamp',
                value: config.result.timestamp.toISOString(),
                short: true,
              },
              ...(config.result.error ? [{
                title: 'Error',
                value: config.result.error,
                short: false,
              }] : []),
            ],
          }],
        }),
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  private async sendDiscordAlert(config: AlertConfig): Promise<void> {
    if (!process.env.DISCORD_WEBHOOK_URL) return;

    const color = config.result.status === 'healthy' ? 0x00ff00 : 0xff0000;

    try {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `Monitoring Alert: ${config.targetName}`,
            color,
            fields: [
              {
                name: 'Status',
                value: config.result.status.toUpperCase(),
                inline: true,
              },
              {
                name: 'Response Time',
                value: `${config.result.responseTime}ms`,
                inline: true,
              },
              {
                name: 'Status Code',
                value: config.result.statusCode.toString(),
                inline: true,
              },
              ...(config.result.error ? [{
                name: 'Error',
                value: config.result.error,
                inline: false,
              }] : []),
            ],
            timestamp: config.result.timestamp.toISOString(),
          }],
        }),
      });
    } catch (error) {
      console.error('Failed to send Discord alert:', error);
    }
  }

  private formatAlertMessage(config: AlertConfig): string {
    const { result, targetName } = config;
    
    return `
Monitoring Alert: ${targetName}
Status: ${result.status.toUpperCase()}
Response Time: ${result.responseTime}ms
Status Code: ${result.statusCode}
Timestamp: ${result.timestamp.toISOString()}
${result.error ? `\nError: ${result.error}` : ''}
    `.trim();
  }
}