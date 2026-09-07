/**
 * @file logger.test.ts
 * Unit tests for StructuredLogger PII masking functions
 */
import { describe, it, expect } from 'vitest';
import { StructuredLogger } from '../../src/server/observability/logger';

const logger = new StructuredLogger();

describe('StructuredLogger — sanitize', () => {
  describe('maskPhone', () => {
    it('masks Brazilian phone with DDD and 9 digits', () => {
      const result = logger.sanitize({ from: '11999998888' });
      expect(result.from).toBe('(**) *****-8888');
    });

    it('masks phone with mask characters', () => {
      const result = logger.sanitize({ from: '(11) 99999-8888' });
      expect(result.from).toBe('(**) *****-8888');
    });

    it('masks phone with spaces', () => {
      const result = logger.sanitize({ from: '11 99999 8888' });
      expect(result.from).toBe('(**) *****-8888');
    });

    it('masks contactPhone field', () => {
      const result = logger.sanitize({ contactPhone: '21987654321' });
      expect(result.contactPhone).toBe('(**) *****-4321');
    });

    it('masks senderPhone field', () => {
      const result = logger.sanitize({ senderPhone: '31912345678' });
      expect(result.senderPhone).toBe('(**) *****-5678');
    });
  });

  describe('maskEmail', () => {
    it('masks email address', () => {
      const result = logger.sanitize({ email: 'teste@example.com' });
      expect(result.email).toBe('te***@***.***');
    });

    it('masks senderEmail field', () => {
      const result = logger.sanitize({ senderEmail: 'Maria@empresa.com.br' });
      expect(result.senderEmail).toBe('Ma***@***.***');
    });

    it('handles short email prefix', () => {
      const result = logger.sanitize({ email: 'a@b.com' });
      expect(result.email).toBe('***@***.***');
    });
  });

  describe('maskPlate', () => {
    it('masks Brazilian plate with hyphen', () => {
      const result = logger.sanitize({ placa: 'ABC-1234' });
      expect(result.placa).toBe('***-****');
    });

    it('masks Brazilian plate without hyphen', () => {
      const result = logger.sanitize({ licensePlate: 'XYZ9876' });
      expect(result.licensePlate).toBe('***-****');
    });
  });

  describe('CPF still masked after phone/email additions', () => {
    it('still masks cpf field', () => {
      const result = logger.sanitize({ cpf: '123.456.789-00' });
      expect(result.cpf).toBe('***.456.***-00');
    });

    it('still masks CNH field', () => {
      const result = logger.sanitize({ cnh: '00123456789AB' });
      expect(result.cnh).toBe('***********AB');
    });
  });

  describe('sanitizeString — PII in free text', () => {
    it('masks phone numbers in free text', () => {
      const result = logger.sanitize('Call me at 11 99999 8888') as string;
      expect(result).toContain('(**) *****-8888');
    });

    it('masks email in free text', () => {
      const result = logger.sanitize('Send to joao@email.com') as string;
      expect(result).toContain('***@***.***');
    });

    it('masks plate in free text', () => {
      const result = logger.sanitize('Vehicle: ABC-1234') as string;
      expect(result).toContain('***-****');
    });

    it('masks CPF in free text', () => {
      const result = logger.sanitize('CPF: 123.456.789-00') as string;
      expect(result).toContain('***.456.***-00');
    });
  });

  describe('API keys / secrets — still protected', () => {
    it('still masks bearer tokens in strings', () => {
      const result = logger.sanitize('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9') as string;
      expect(result).toContain('••••[PROTECTED]••••');
    });

    it('still masks API keys in metadata', () => {
      const result = logger.sanitize({ api_key: 'sk-12345678' });
      expect(result.api_key).toBe('••••[PROTEGIDO]••••');
    });
  });

  describe('structured log entry sanitization', () => {
    it('sanitizes metadata object with mixed PII', () => {
      const result = logger.sanitize({
        from: '5511988887777',
        email: 'user@test.com',
        cpf: '111.222.333-44',
        placa: 'DEF-5678',
        action: 'message_sent',
      });
      expect(result.from).toBe('(**) *****-7777');
      expect(result.email).toBe('us***@***.***');
      expect(result.cpf).toBe('***.222.***-44');
      expect(result.placa).toBe('***-****');
      expect(result.action).toBe('message_sent');
    });
  });
});
