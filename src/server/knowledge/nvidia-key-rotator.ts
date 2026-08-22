/**
 * @file nvidia-key-rotator.ts
 * NVIDIA API Key Rotator for distributing requests across multiple keys
 * 
 * Implements round-robin selection of NVIDIA_API_KEY* environment variables
 * to increase rate limits and reduce risk of blocking.
 */

import { configService } from '../config/config-service';

/**
 * Rotates through multiple NVIDIA API keys to distribute API load
 */
export class NvidiaKeyRotator {
  private keys: string[] = [];
  private currentIndex = 0;

  constructor() {
    this.loadKeys();
  }

  /**
   * Loads all NVIDIA_API_KEY* environment variables
   */
  private loadKeys(): void {
    // Collect all NVIDIA_API_KEY* variables from environment
    const allKeys: string[] = [];
    
    // Check for NVIDIA_API_KEY (primary)
    const key1 = configService.get('NVIDIA_API_KEY');
    if (key1 && key1.length > 5) {
      allKeys.push(key1);
    }

    // Check for NVIDIA_API_KEY_2
    const key2 = configService.get('NVIDIA_API_KEY_2');
    if (key2 && key2.length > 5) {
      allKeys.push(key2);
    }

    // Check for NVIDIA_API_KEY_3
    const key3 = configService.get('NVIDIA_API_KEY_3');
    if (key3 && key3.length > 5) {
      allKeys.push(key3);
    }

    this.keys = allKeys;
    
    // Log how many keys we found
    if (this.keys.length === 0) {
      console.warn('[NVIDIA Key Rotator] No valid NVIDIA API keys found');
    } else if (this.keys.length === 1) {
      console.log('[NVIDIA Key Rotator] Using single NVIDIA API key');
    } else {
      console.log(`[NVIDIA Key Rotator] Loaded ${this.keys.length} NVIDIA API keys for rotation`);
    }
  }

  /**
   * Gets the next NVIDIA API key in rotation
   * @returns The next API key to use, or null if no keys available
   */
  getNextKey(): string | null {
    if (this.keys.length === 0) {
      return null;
    }

    const key = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return key;
  }

  /**
   * Gets the current key without advancing the rotation
   * @returns The current API key, or null if no keys available
   */
  getCurrentKey(): string | null {
    if (this.keys.length === 0) {
      return null;
    }
    return this.keys[this.currentIndex];
  }

  /**
   * Gets the number of available keys
   */
  getKeyCount(): number {
    return this.keys.length;
  }

  /**
   * Forces reload of keys from environment (useful for testing)
   */
  reloadKeys(): void {
    this.loadKeys();
    // Reset index to start from beginning when reloading
    this.currentIndex = 0;
  }
}

// Export a singleton instance
export const nvidiaKeyRotator = new NvidiaKeyRotator();
