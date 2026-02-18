/**
 * MCP Client Manager
 *
 * Manages connections to external MCP servers:
 * - jjlabs: DART + KRX stock data (korea-stock-mcp)
 * - analyzer: Technical analysis, DCF, news sentiment, etc. (korea-stock-analyzer-mcp)
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { logger } from '../shared/logger/index.js';
import { fileURLToPath } from 'url';
import path from 'path';

const log = logger.child('McpClientManager');

// Resolve project root from this file's location
const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(__filename), '..', '..');

type ServerName = 'jjlabs' | 'analyzer';

interface ServerConfig {
  name: ServerName;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface ServerConnection {
  client: Client;
  transport: StdioClientTransport;
  connected: boolean;
  lastError: string | null;
  connectedAt: string | null;
}

const connections = new Map<ServerName, ServerConnection>();

function getServerConfigs(): ServerConfig[] {
  return [
    {
      name: 'jjlabs',
      command: 'node',
      args: [
        '--max-old-space-size=4096',
        path.join(PROJECT_ROOT, 'node_modules', 'korea-stock-mcp', 'dist', 'index.js'),
      ],
      env: {
        ...(process.env.DART_API_KEY ? { DART_API_KEY: process.env.DART_API_KEY } : {}),
        ...(process.env.KRX_API_KEY ? { KRX_API_KEY: process.env.KRX_API_KEY } : {}),
      },
    },
    {
      name: 'analyzer',
      command: 'node',
      args: [
        '--max-old-space-size=4096',
        path.join(PROJECT_ROOT, 'node_modules', '@mrbaeksang', 'korea-stock-analyzer-mcp', 'dist', 'index.js'),
      ],
    },
  ];
}

const CONNECT_TIMEOUT_MS = 30_000; // 30 second timeout for MCP connection
const HEALTH_CHECK_INTERVAL_MS = 10_000; // 10 second health check interval
let healthCheckTimer: ReturnType<typeof setInterval> | null = null;

async function connectServer(config: ServerConfig): Promise<void> {
  const { name, command, args, env } = config;

  log.info(`Connecting to MCP server: ${name}`, { command, args });

  try {
    const transport = new StdioClientTransport({
      command,
      args,
      env: {
        ...process.env as Record<string, string>,
        // Ensure ~/.local/bin is in PATH for python symlink
        PATH: `${path.join(process.env.HOME ?? '', '.local', 'bin')}:${process.env.PATH ?? ''}`,
        ...env,
      },
    });

    const client = new Client(
      { name: `investment-dashboard-${name}`, version: '1.0.0' },
      { capabilities: {} }
    );

    // Add timeout to prevent hanging indefinitely
    await Promise.race([
      client.connect(transport),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Connection timeout after ${CONNECT_TIMEOUT_MS}ms`)), CONNECT_TIMEOUT_MS)
      ),
    ]);

    connections.set(name, {
      client,
      transport,
      connected: true,
      lastError: null,
      connectedAt: new Date().toISOString(),
    });

    log.info(`MCP server connected: ${name}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error(`Failed to connect MCP server: ${name}`, error as Error);

    connections.set(name, {
      client: null as unknown as Client,
      transport: null as unknown as StdioClientTransport,
      connected: false,
      lastError: errorMsg,
      connectedAt: null,
    });
  }
}

/**
 * Reconnect a single disconnected MCP server
 */
async function reconnectServer(name: ServerName): Promise<boolean> {
  const conn = connections.get(name);

  // Clean up old connection if exists
  if (conn) {
    try {
      if (conn.client && conn.transport) {
        await conn.client.close();
      }
    } catch {
      // ignore cleanup errors
    }
    connections.delete(name);
  }

  const config = getServerConfigs().find(c => c.name === name);
  if (!config) return false;

  log.info(`Attempting to reconnect MCP server: ${name}`);
  await connectServer(config);

  const newConn = connections.get(name);
  return newConn?.connected ?? false;
}

/**
 * Manually reconnect all MCP servers
 */
export async function reconnectAll(): Promise<Record<string, boolean>> {
  log.info('Manual reconnect requested for all MCP servers');

  const configs = getServerConfigs();
  const results: Record<string, boolean> = {};

  for (const config of configs) {
    results[config.name] = await reconnectServer(config.name);
  }

  log.info('Manual reconnect results', results);
  return results;
}

/**
 * Health check: verify connections and auto-reconnect offline servers
 */
async function healthCheck(): Promise<void> {
  const configs = getServerConfigs();
  const reconnectTargets: ServerName[] = [];

  for (const config of configs) {
    const conn = connections.get(config.name);

    if (!conn || !conn.connected) {
      reconnectTargets.push(config.name);
      continue;
    }

    // Ping test: try listing tools to verify the connection is alive
    try {
      await Promise.race([
        conn.client.listTools(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('ping timeout')), 5000)
        ),
      ]);
    } catch {
      log.warn(`MCP server health check failed: ${config.name}, marking for reconnect`);
      conn.connected = false;
      conn.lastError = 'Health check failed';
      reconnectTargets.push(config.name);
    }
  }

  if (reconnectTargets.length === 0) return;

  log.info(`Auto-reconnecting MCP servers: ${reconnectTargets.join(', ')}`);

  const results = await Promise.allSettled(
    reconnectTargets.map(async (name) => {
      const success = await reconnectServer(name);
      if (success) {
        log.info(`MCP server reconnected successfully: ${name}`);
      } else {
        log.warn(`MCP server reconnect failed: ${name}`);
      }
      return { name, success };
    })
  );

  const summary = results.map(r =>
    r.status === 'fulfilled' ? r.value : { name: 'unknown', success: false }
  );
  log.info('Auto-reconnect results', summary);
}

/**
 * Start periodic health check (every 1 minute)
 */
function startHealthCheck(): void {
  if (healthCheckTimer) return;

  healthCheckTimer = setInterval(() => {
    healthCheck().catch(err =>
      log.error('Health check error', err as Error)
    );
  }, HEALTH_CHECK_INTERVAL_MS);

  log.info(`MCP health check started (interval: ${HEALTH_CHECK_INTERVAL_MS / 1000}s)`);
}

/**
 * Stop periodic health check
 */
function stopHealthCheck(): void {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
    log.info('MCP health check stopped');
  }
}

/**
 * Initialize all MCP server connections and start health check
 */
export async function initializeAll(): Promise<void> {
  const configs = getServerConfigs();

  log.info('Initializing all MCP server connections...');

  await Promise.allSettled(configs.map(connectServer));

  const statuses = getStatus();
  log.info('MCP server initialization complete', statuses);

  // Start periodic health check for auto-reconnect
  startHealthCheck();
}

/**
 * Call a tool on a specific MCP server
 */
export async function callTool(
  server: ServerName,
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  const conn = connections.get(server);

  if (!conn || !conn.connected) {
    throw new Error(`MCP server '${server}' is not connected`);
  }

  log.debug(`Calling MCP tool: ${server}/${toolName}`, { args });

  try {
    const result = await conn.client.callTool({ name: toolName, arguments: args });

    if (result.isError) {
      throw new Error(`MCP tool error: ${JSON.stringify(result.content)}`);
    }

    // Extract text content from the result
    const textContent = result.content?.find(
      (c: { type: string }) => c.type === 'text'
    );

    if (textContent && 'text' in textContent) {
      try {
        return JSON.parse(textContent.text as string);
      } catch {
        return textContent.text;
      }
    }

    return result.content;
  } catch (error) {
    log.error(`MCP tool call failed: ${server}/${toolName}`, error as Error);

    // Mark as disconnected on communication errors and trigger reconnect
    if (conn.connected && error instanceof Error &&
        (error.message.includes('transport') || error.message.includes('closed') || error.message.includes('EPIPE'))) {
      conn.connected = false;
      conn.lastError = error.message;
      log.warn(`MCP server ${server} marked offline, will auto-reconnect on next health check`);
    }

    throw error;
  }
}

/**
 * List available tools on a specific MCP server
 */
export async function listTools(server: ServerName): Promise<string[]> {
  const conn = connections.get(server);
  if (!conn || !conn.connected) {
    return [];
  }

  try {
    const result = await conn.client.listTools();
    return result.tools.map((t) => t.name);
  } catch (error) {
    log.error(`Failed to list tools for ${server}`, error as Error);
    return [];
  }
}

/**
 * Get connection status of all servers
 */
export function getStatus(): Record<ServerName, { connected: boolean; lastError: string | null; connectedAt: string | null }> {
  const jjlabs = connections.get('jjlabs');
  const analyzer = connections.get('analyzer');

  return {
    jjlabs: {
      connected: jjlabs?.connected ?? false,
      lastError: jjlabs?.lastError ?? null,
      connectedAt: jjlabs?.connectedAt ?? null,
    },
    analyzer: {
      connected: analyzer?.connected ?? false,
      lastError: analyzer?.lastError ?? null,
      connectedAt: analyzer?.connectedAt ?? null,
    },
  };
}

/**
 * Check if a specific server is connected
 */
export function isConnected(server: ServerName): boolean {
  return connections.get(server)?.connected ?? false;
}

/**
 * Shutdown all MCP server connections and stop health check
 */
export async function shutdown(): Promise<void> {
  stopHealthCheck();
  log.info('Shutting down all MCP server connections...');

  const shutdownPromises = Array.from(connections.entries()).map(
    async ([name, conn]) => {
      try {
        if (conn.connected && conn.client) {
          await conn.client.close();
          log.info(`MCP server disconnected: ${name}`);
        }
      } catch (error) {
        log.error(`Error disconnecting MCP server: ${name}`, error as Error);
      }
    }
  );

  await Promise.allSettled(shutdownPromises);
  connections.clear();
  log.info('All MCP server connections closed');
}
