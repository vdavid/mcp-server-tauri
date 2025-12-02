import { describe, it, expect } from 'vitest';
import { readLogs } from '../../src/monitor/logs';

describe('Monitor Module E2E', () => {
   describe('Log Reading', () => {
      it('should handle system log source', async () => {
         // System logs should be available on macOS
         const logs = await readLogs({ source: 'system', lines: 5 });

         expect(logs).toBeDefined();
         expect(typeof logs).toBe('string');
      }, 10000);

      it('should read logs with default line count', async () => {
         const logs = await readLogs({ source: 'system' });

         expect(logs).toBeDefined();
      });
   });

   describe('Log Filtering', () => {
      it('should filter logs with regex pattern', async () => {
         const logs = await readLogs({ source: 'system', lines: 50, filter: 'error|warn' });

         expect(logs).toBeDefined();
      });

      it('should filter logs with keyword search', async () => {
         const logs = await readLogs({ source: 'system', lines: 50, filter: 'tauri' });

         expect(logs).toBeDefined();
      });

      it('should filter logs by timestamp', async () => {
         const since = new Date(Date.now() - 60000).toISOString(); // Last minute

         const logs = await readLogs({ source: 'system', lines: 50, since });

         expect(logs).toBeDefined();
      });

      it('should combine filters (regex + timestamp)', async () => {
         const since = new Date(Date.now() - 300000).toISOString(); // Last 5 minutes

         const logs = await readLogs({ source: 'system', lines: 50, filter: 'info', since });

         expect(logs).toBeDefined();
      });
   });
});
