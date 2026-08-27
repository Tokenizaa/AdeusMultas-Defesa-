/**
 * @file hardware-detector.ts
 * Auditoria e classificação automática de hardware no ambiente do servidor.
 */

import os from 'os';
import { execSync } from 'child_process';
import { HardwareClassification, HardwareInfo } from './types';

export class HardwareDetector {
  private static cachedInfo: HardwareInfo | null = null;

  public static getHardwareInfo(): HardwareInfo {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    const platform = os.platform();
    const arch = os.arch();
    const cpus = os.cpus() || [];
    const cpuCount = cpus.length;
    const cpuModel = cpus[0]?.model || 'Generic CPU';
    const totalMemoryBytes = os.totalmem();
    const freeMemoryBytes = os.freemem();

    let hasGpu = false;
    let gpuName: string | undefined;
    let vramBytes: number | undefined;
    let hasCuda = false;
    let hasRocm = false;
    let hasDocker = false;
    let pythonVersion: string | undefined;

    // Checar Python
    try {
      pythonVersion = execSync('python3 --version', { timeout: 1500, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
    } catch {
      pythonVersion = undefined;
    }

    // Checar Docker
    try {
      const dockerOut = execSync('docker --version', { timeout: 1500, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
      if (dockerOut) hasDocker = true;
    } catch {
      hasDocker = false;
    }

    // Checar NVIDIA / CUDA
    try {
      const nvidiaOut = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits', {
        timeout: 2000,
        stdio: ['pipe', 'pipe', 'ignore'],
      }).toString().trim();

      if (nvidiaOut) {
        hasGpu = true;
        const [name, memoryMb] = nvidiaOut.split(',').map((s) => s.trim());
        gpuName = name;
        if (memoryMb && !isNaN(Number(memoryMb))) {
          vramBytes = Number(memoryMb) * 1024 * 1024;
        }
      }
    } catch {
      hasGpu = false;
    }

    try {
      execSync('which nvcc', { timeout: 1000, stdio: ['pipe', 'pipe', 'ignore'] });
      hasCuda = true;
    } catch {
      hasCuda = false;
    }

    // Checar ROCm
    try {
      execSync('which rocm-smi', { timeout: 1000, stdio: ['pipe', 'pipe', 'ignore'] });
      hasRocm = true;
    } catch {
      hasRocm = false;
    }

    // Classificação
    let classification: HardwareClassification = 'REMOTE_REQUIRED';
    const ramGb = totalMemoryBytes / (1024 * 1024 * 1024);
    const vramGb = (vramBytes || 0) / (1024 * 1024 * 1024);

    if (hasGpu && vramGb >= 16 && ramGb >= 24) {
      classification = 'LOCAL_GPU_READY';
    } else if (hasGpu && vramGb >= 6) {
      classification = 'LOCAL_GPU_LIMITED';
    } else if (ramGb >= 16) {
      classification = 'LOCAL_CPU_ONLY';
    } else {
      classification = 'REMOTE_REQUIRED';
    }

    this.cachedInfo = {
      os: `${platform} (${os.release()})`,
      arch,
      cpuCount,
      cpuModel,
      totalMemoryBytes,
      freeMemoryBytes,
      hasGpu,
      gpuName,
      vramBytes,
      hasCuda,
      hasRocm,
      hasDocker,
      pythonVersion,
      nodeVersion: process.version,
      classification,
    };

    return this.cachedInfo;
  }
}
