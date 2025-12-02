import { z } from 'zod';
import { execa } from 'execa';

export const ListDevicesSchema = z.object({});

async function getAndroidDevices(): Promise<string[]> {
   try {
      const { stdout } = await execa('adb', [ 'devices', '-l' ]);

      return stdout
         .split('\n')
         .slice(1)
         .filter((line) => { return line.trim().length > 0; })
         .map((line) => { return line.trim(); });
   } catch(_) {
      // Android SDK not available or adb command failed
      return [];
   }
}

async function getIOSSimulators(): Promise<string[]> {
   if (process.platform !== 'darwin') {
      return [];
   }

   try {
      const { stdout } = await execa('xcrun', [ 'simctl', 'list', 'devices', 'booted' ]);

      return stdout
         .split('\n')
         .filter((line) => { return line.trim().length > 0 && !line.includes('== Devices =='); });
   } catch(_) {
      // Xcode not installed or xcrun command failed
      return [];
   }
}

export async function listDevices(): Promise<{ android: string[]; ios: string[] }> {
   const [ android, ios ] = await Promise.all([
      getAndroidDevices(),
      getIOSSimulators(),
   ]);

   return { android, ios };
}
