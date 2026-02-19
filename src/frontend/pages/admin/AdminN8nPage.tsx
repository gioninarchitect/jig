/**
 * JIG Craft Cannabis - Admin n8n Settings Page
 *
 * Configure n8n workflow automation: enable/disable, webhook URL,
 * API key, and toggle individual workflows.
 */

import { useState, useEffect } from 'react';
import { n8n, type N8nConfigData } from '../../api';

const WORKFLOW_LABELS: Record<string, { label: string; description: string }> = {
  orderLifecycle: {
    label: 'Order Lifecycle',
    description: 'Invoice delivery, status updates, payment follow-ups',
  },
  onboarding: {
    label: 'Client Onboarding',
    description: 'Welcome sequence, doc upload prompts, activation celebration',
  },
  paymentChase: {
    label: 'Payment Chase',
    description: 'Auto-reminders for unpaid invoices at 3, 7, and 14 days',
  },
  restockReminders: {
    label: 'Restock Reminders',
    description: 'Daily personalized restock predictions to clients',
  },
  newProducts: {
    label: 'New Product Alerts',
    description: 'Auto-broadcast when new products are added',
  },
  churnPrevention: {
    label: 'Churn Prevention',
    description: 'Weekly re-engagement for inactive clients (30+ days)',
  },
  adminDigest: {
    label: 'Admin Daily Digest',
    description: 'Daily summary of orders, revenue, and pending items',
  },
};

export default function AdminN8nPage() {
  const [config, setConfig] = useState<N8nConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const data = await n8n.config();
      setConfig(data);
      setWebhookUrl(data.webhookUrl);
      setApiKey('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(enabled: boolean) {
    setSaving(true);
    setError('');
    try {
      const data = await n8n.updateConfig({ enabled });
      setConfig(data);
      setSuccess(enabled ? 'n8n enabled' : 'n8n disabled');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveConnection() {
    setSaving(true);
    setError('');
    try {
      const update: Record<string, unknown> = { webhookUrl };
      if (apiKey) update.apiKey = apiKey;
      const data = await n8n.updateConfig(update as never);
      setConfig(data);
      setApiKey('');
      setSuccess('Connection settings saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleWorkflowToggle(key: string, enabled: boolean) {
    setSaving(true);
    setError('');
    try {
      const data = await n8n.updateConfig({ workflows: { [key]: enabled } });
      setConfig(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-jig-gray-700 border-t-jig-purple" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-jig-white">
          Workflow Automation
        </h1>
        <p className="mt-1 text-sm text-jig-gray-500">
          Configure n8n workflow automation for notifications, reminders, and business processes.
        </p>
      </div>

      {/* Status messages */}
      {error && (
        <div className="mb-6 rounded-md border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 rounded-md border border-green-500/25 bg-green-500/10 p-3 text-sm text-green-400">
          {success}
        </div>
      )}

      {/* Master Toggle */}
      <div className="mb-6 rounded-lg border border-white/[0.08] bg-jig-slate p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-jig-white">
              n8n Automation
            </h2>
            <p className="mt-0.5 text-xs text-jig-gray-500">
              {config?.enabled
                ? 'Events are being sent to n8n workflows'
                : 'No events are being sent - automation is off'}
            </p>
          </div>
          <button
            onClick={() => handleToggle(!config?.enabled)}
            disabled={saving}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
              config?.enabled ? 'bg-jig-purple' : 'bg-jig-gray-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                config?.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Connection Settings */}
      <div className="mb-6 rounded-lg border border-white/[0.08] bg-jig-slate p-5">
        <h2 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wide text-jig-white">
          Connection
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-jig-gray-400">
              n8n Webhook Base URL
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-instance.app.n8n.cloud/webhook"
              className="w-full rounded-md border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-sm text-jig-white placeholder-jig-gray-600 focus:border-jig-purple/50 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-jig-gray-600">
              Events are POSTed to: {webhookUrl || '...'}/event-type
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-jig-gray-400">
              API Key {config?.apiKeySet && <span className="text-green-500">(set)</span>}
            </label>
            <div className="flex gap-2">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={config?.apiKeySet ? 'Enter new key to change' : 'Generate or enter an API key'}
                className="flex-1 rounded-md border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-sm text-jig-white placeholder-jig-gray-600 focus:border-jig-purple/50 focus:outline-none"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="rounded-md border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-xs text-jig-gray-400 hover:bg-white/[0.08] hover:text-jig-white"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
              <button
                onClick={() => {
                  const key = `jig_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
                  setApiKey(key);
                  setShowApiKey(true);
                }}
                className="rounded-md border border-jig-purple/25 bg-jig-purple/10 px-3 py-2 text-xs text-jig-purple-light hover:bg-jig-purple/20"
              >
                Generate
              </button>
            </div>
            <p className="mt-1 text-[11px] text-jig-gray-600">
              n8n uses this key in the X-N8N-API-KEY header when calling JIG data endpoints.
            </p>
          </div>

          <button
            onClick={handleSaveConnection}
            disabled={saving}
            className="rounded-md bg-jig-purple px-4 py-2 text-sm font-medium text-white hover:bg-jig-purple-light disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Connection'}
          </button>
        </div>
      </div>

      {/* Workflow Toggles */}
      <div className="rounded-lg border border-white/[0.08] bg-jig-slate p-5">
        <h2 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wide text-jig-white">
          Workflows
        </h2>
        <p className="mb-4 text-xs text-jig-gray-500">
          Enable or disable individual automation workflows. Disabled workflows won't receive events.
        </p>

        <div className="space-y-3">
          {Object.entries(WORKFLOW_LABELS).map(([key, { label, description }]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-md border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-jig-white">{label}</p>
                <p className="text-xs text-jig-gray-500">{description}</p>
              </div>
              <button
                onClick={() =>
                  handleWorkflowToggle(
                    key,
                    !config?.workflows[key as keyof N8nConfigData['workflows']],
                  )
                }
                disabled={saving}
                className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                  config?.workflows[key as keyof N8nConfigData['workflows']]
                    ? 'bg-jig-purple'
                    : 'bg-jig-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    config?.workflows[key as keyof N8nConfigData['workflows']]
                      ? 'translate-x-5'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* n8n Cloud Link */}
      {webhookUrl && (
        <div className="mt-6 rounded-lg border border-white/[0.08] bg-jig-slate p-5">
          <h2 className="mb-2 font-heading text-sm font-semibold uppercase tracking-wide text-jig-white">
            n8n Dashboard
          </h2>
          <a
            href={webhookUrl.replace('/webhook', '')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-jig-purple hover:text-jig-purple-light"
          >
            Open n8n workflow editor
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>
      )}

      {/* Data Endpoints Reference */}
      <div className="mt-6 rounded-lg border border-white/[0.08] bg-jig-slate p-5">
        <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-jig-white">
          n8n Data Endpoints
        </h2>
        <p className="mb-3 text-xs text-jig-gray-500">
          Use these endpoints in your n8n HTTP Request nodes. Add header: X-N8N-API-KEY
        </p>
        <div className="space-y-1 font-mono text-xs text-jig-gray-400">
          <p>GET /api/v1/n8n/data/clients</p>
          <p>GET /api/v1/n8n/data/clients/:id</p>
          <p>GET /api/v1/n8n/data/orders/unpaid</p>
          <p>GET /api/v1/n8n/data/orders/recent?days=7</p>
          <p>GET /api/v1/n8n/data/restock-predictions</p>
          <p>GET /api/v1/n8n/data/products</p>
          <p>GET /api/v1/n8n/data/stats</p>
        </div>
      </div>
    </div>
  );
}
