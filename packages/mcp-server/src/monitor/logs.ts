import { z } from 'zod';
import { execa } from 'execa';
import { getConsoleLogs } from '../driver/webview-interactions.js';

export const ReadLogsSchema = z.object({
   source: z.enum([ 'console', 'android', 'ios', 'system' ])
      .describe('Log source: "console" for webview JS logs, "android" for logcat, "ios" for simulator, "system" for desktop'),
   lines: z.number().default(50),
   filter: z.string().optional().describe('Regex or keyword to filter logs'),
   since: z.string().optional().describe('ISO timestamp to filter logs since (e.g. 2023-10-27T10:00:00Z)'),
   windowId: z.string().optional().describe('Window label for console logs (defaults to "main")'),
});

export interface ReadLogsOptions {
   source: 'console' | 'android' | 'ios' | 'system';
   lines?: number;
   filter?: string;
   since?: string;
   windowId?: string;
}

export async function readLogs(options: ReadLogsOptions): Promise<string> {
   const { source, lines = 50, filter, since, windowId } = options;

   try {
      let output = '';

      // Handle console logs (webview JS logs)
      if (source === 'console') {
         return await getConsoleLogs({ filter, since, windowId });
      }

      if (source === 'android') {
         // Find adb - check ANDROID_HOME first, then fall back to PATH
         // eslint-disable-next-line no-process-env
         const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;

         const adbPath = androidHome ? `${androidHome}/platform-tools/adb` : 'adb';

         const args = [ 'logcat', '-d' ];

         if (since) {
            // adb logcat -T expects "MM-DD HH:MM:SS.mmm"
            const date = new Date(since);

            const month = (date.getMonth() + 1).toString().padStart(2, '0');

            const day = date.getDate().toString().padStart(2, '0');

            const hours = date.getHours().toString().padStart(2, '0');

            const minutes = date.getMinutes().toString().padStart(2, '0');

            const seconds = date.getSeconds().toString().padStart(2, '0');

            const ms = date.getMilliseconds().toString().padStart(3, '0');

            const adbTime = `${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;

            args.push('-T', adbTime);
         } else {
            args.push('-t', lines.toString());
         }

         const { stdout } = await execa(adbPath, args, { timeout: 10000 });

         output = stdout;
      } else if (source === 'ios') {
      // iOS / macOS
         const args = [ 'log', 'show', '--style', 'syslog' ];

         if (source === 'ios') {
            args.unshift('xcrun', 'simctl', 'spawn', 'booted');
         }

         if (since) {
            // log show --start "YYYY-MM-DD HH:MM:SS"
            // It accepts ISO-like formats too usually, but let's be safe with
            // local time format if possible
            // Actually 'log show' on macOS is picky. ISO 8601 works in recent versions.
            args.push('--start', since);
         } else {
            // Default to last 1m if no since provided, as 'lines' isn't
            // directly supported by log show time window
            args.push('--last', '1m');
         }

         try {
            const { stdout } = await execa(args[0], args.slice(1));

            // We still apply line limit manually if we didn't use -t (adb)
            let outLines = stdout.split('\n');

            if (!since) {
               outLines = outLines.slice(-lines);
            }
            output = outLines.join('\n');
         } catch(e) {
            return `Error reading logs: ${e}`;
         }
      } else {
         // System (same as iOS essentially but local)
         const args = [ 'log', 'show', '--style', 'syslog' ];

         if (since) {
            args.push('--start', since);
         } else {
            args.push('--last', '1m');
         }

         try {
            const { stdout } = await execa('log', args.slice(1)); // 'log' is the command

            let outLines = stdout.split('\n');

            if (!since) {
               outLines = outLines.slice(-lines);
            }
            output = outLines.join('\n');
         } catch(e) {
            return `Error reading system logs: ${e}`;
         }
      }

      if (filter) {
         try {
            const regex = new RegExp(filter, 'i');

            return output.split('\n').filter((line) => { return regex.test(line); }).join('\n');
         } catch(e) {
            return `Invalid filter regex: ${e}`;
         }
      }
      return output;
   } catch(error) {
      return `Error reading logs: ${error}`;
   }
}
