/**
 * PureGro Premium Cannabis Care - Admin Chat Bot Page
 *
 * Manage Telegram bot settings, view linked users, setup webhook.
 */

import { useState, useEffect, useCallback } from 'react';
import { chat as chatApi, type ChatSettings, type ChatLinkedUser } from '../../api';

const STATE_COLORS: Record<string, string> = {
  linked: 'bg-puregro-green/15 text-green-400 border border-puregro-green/25',
  pending_email: 'bg-pg-gold/15 text-amber-400 border border-pg-gold/25',
  pending_otp: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
};

export default function AdminChatPage() {
  const [settings, setSettings] = useState<ChatSettings | null>(null);
  const [users, setUsers] = useState<ChatLinkedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, u] = await Promise.all([chatApi.settings(), chatApi.linkedUsers()]);
      setSettings(s);
      setUsers(u.users);
    } catch {
      // Settings will fail if not configured - that's OK
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSetupWebhook = async () => {
    setWebhookStatus(null);
    try {
      const result = await chatApi.setupWebhook(webhookUrl || undefined);
      setWebhookStatus(result.ok ? `Webhook set: ${result.webhookUrl}` : `Failed: ${result.description}`);
      load();
    } catch (err) {
      setWebhookStatus(`Error: ${(err as Error).message}`);
    }
  };

  const handleUnlink = async (id: string) => {
    setUnlinking(id);
    try {
      await chatApi.unlinkUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch {
      // ignore
    } finally {
      setUnlinking(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pg-gray-700 border-t-pg-green" />
      </div>
    );
  }

  const botUsername = settings?.bot?.username;

  return (
    <div className="p-6">
      <h1 className="mb-6 font-heading text-2xl font-bold uppercase tracking-wide text-pg-white">
        Chat Bot
      </h1>

      {/* Bot Status Card */}
      <div className="mb-6 rounded-lg border border-white/[0.08] bg-pg-dark p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`h-3 w-3 rounded-full ${settings?.configured ? 'bg-puregro-green' : 'bg-red-500'}`} />
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-pg-white">
            {settings?.configured ? 'Bot Active' : 'Not Configured'}
          </h2>
        </div>

        {settings?.configured ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
                Bot Username
              </p>
              <p className="mt-1 text-sm text-pg-white">@{botUsername || 'Unknown'}</p>
            </div>
            <div>
              <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
                Webhook
              </p>
              <p className="mt-1 truncate text-sm text-pg-white">
                {settings.webhook.url || 'Not set'}
              </p>
            </div>
            <div>
              <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
                Linked Users
              </p>
              <p className="mt-1 text-sm text-pg-white">{settings.stats.linkedUsers}</p>
            </div>
            <div>
              <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
                Total Messages
              </p>
              <p className="mt-1 text-sm text-pg-white">{settings.stats.totalMessages}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-pg-gray-500">
            Set TELEGRAM_BOT_TOKEN in your .env file to enable the Telegram bot.
          </p>
        )}
      </div>

      {/* Telegram Deep Link */}
      {botUsername && (
        <div className="mb-6 rounded-lg border border-pg-green/25 bg-pg-green/[0.06] p-5">
          <h3 className="mb-2 font-heading text-xs font-semibold uppercase tracking-wider text-pg-green-light">
            Share with Clients
          </h3>
          <div className="flex items-center gap-3">
            <code className="flex-1 rounded bg-pg-black/50 px-3 py-2 text-sm text-pg-white">
              t.me/{botUsername}?start=connect
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(`https://t.me/${botUsername}?start=connect`)}
              className="shrink-0 rounded border border-pg-green/30 bg-pg-green/15 px-4 py-2 font-heading text-[11px] font-medium uppercase tracking-wider text-pg-green-light transition-all hover:bg-pg-green/25"
            >
              Copy Link
            </button>
          </div>
        </div>
      )}

      {/* Webhook Setup */}
      {settings?.configured && (
        <div className="mb-6 rounded-lg border border-white/[0.08] bg-pg-dark p-5">
          <h3 className="mb-3 font-heading text-xs font-semibold uppercase tracking-wider text-pg-white">
            Webhook Setup
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://jig.cleva-ai.co.za/api/v1/chat/webhook/telegram"
              className="flex-1 rounded border border-white/[0.12] bg-pg-black/50 px-3 py-2 text-sm text-pg-white placeholder-puregro-gray-600 focus:border-pg-green/50 focus:outline-none"
            />
            <button
              onClick={handleSetupWebhook}
              className="shrink-0 rounded bg-pg-green px-4 py-2 font-heading text-[11px] font-medium uppercase tracking-wider text-pg-white transition-all hover:bg-pg-green-light"
            >
              Set Webhook
            </button>
          </div>
          {webhookStatus && (
            <p className={`mt-2 text-xs ${webhookStatus.startsWith('Error') || webhookStatus.startsWith('Failed') ? 'text-red-400' : 'text-green-400'}`}>
              {webhookStatus}
            </p>
          )}
        </div>
      )}

      {/* Connected Users Table */}
      <div className="rounded-lg border border-white/[0.08] bg-pg-dark">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-pg-white">
            Connected Users ({users.length})
          </h3>
        </div>

        {users.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-pg-gray-500">
            No users connected yet. Share the bot link with your clients.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Platform', 'Username', 'Client', 'State', 'Messages', 'Last Active', ''].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <span className="font-heading text-[11px] font-medium uppercase tracking-wider text-puregro-gray-400">
                        {u.platform}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-pg-white">
                      {u.platformUsername ? `@${u.platformUsername}` : u.platformDisplayName || u.platformUserId}
                    </td>
                    <td className="px-5 py-3 text-sm text-pg-white">
                      {u.clientName || (u.clientId ? u.clientId.slice(0, 8) : '-')}
                      {u.clientEmail && (
                        <span className="ml-2 text-xs text-pg-gray-500">{u.clientEmail}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wider ${
                          STATE_COLORS[u.linkState] || 'bg-white/[0.06] text-pg-gray-500'
                        }`}
                      >
                        {u.linkState.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-puregro-gray-400">{u.messageCount}</td>
                    <td className="px-5 py-3 text-sm text-pg-gray-500">
                      {u.lastMessageAt
                        ? new Date(u.lastMessageAt).toLocaleDateString('en-ZA')
                        : '-'}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleUnlink(u.id)}
                        disabled={unlinking === u.id}
                        className="rounded border border-red-500/25 bg-red-500/10 px-3 py-1 font-heading text-[10px] font-medium uppercase tracking-wider text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {unlinking === u.id ? '...' : 'Unlink'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
