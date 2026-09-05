/**
 * Demo users fixture — ONLY for tests and local development.
 * NOT included in production bundle.
 */
import type { AuthUser } from '../../src/types/auth';

function generateE2EUsers(): Record<string, { user: AuthUser; passwordHash: string }> {
  const map: Record<string, { user: AuthUser; passwordHash: string }> = {};
  for (let i = 1; i <= 36; i++) {
    const numStr = i.toString().padStart(3, '0');
    const email = `teste${numStr}@e2e.local`;
    map[email] = {
      user: {
        id: `usr_e2e_teste_${numStr}`,
        name: `Teste ${numStr}`,
        email,
        role: 'citizen',
        cpf: `000.000.0${numStr.slice(-2)}-00`,
        phone: `(11) 98000-${numStr}0`,
        cnh: `00000000${numStr}`,
        cityState: 'São Paulo/SP',
        createdAt: '2026-08-30T10:00:00.000Z',
      },
      passwordHash: 'E2E@2026Teste',
    };
  }
  return map;
}

export const DEMO_USERS: Record<string, { user: AuthUser; passwordHash: string }> = {
  'admin@defesai.com.br': {
    user: {
      id: 'usr_admin_defesai',
      name: 'Administrador DefesAi',
      email: 'admin@defesai.com.br',
      role: 'admin',
      cpf: '000.111.222-33',
      phone: '(11) 99999-0000',
      cityState: 'Brasília/DF',
      createdAt: '2026-01-01T08:00:00.000Z',
    },
    passwordHash: 'admin123',
  },
  'admin@www.defesai.shop': {
    user: {
      id: 'usr_admin_defesai',
      name: 'Administrador DefesAi',
      email: 'admin@www.defesai.shop',
      role: 'admin',
      cpf: '000.111.222-33',
      phone: '(11) 99999-0000',
      cityState: 'Brasília/DF',
      createdAt: '2026-01-01T08:00:00.000Z',
    },
    passwordHash: 'admin123',
  },
  'admin@defesai.shop': {
    user: {
      id: 'usr_admin_defesai',
      name: 'Administrador DefesAi',
      email: 'admin@defesai.shop',
      role: 'admin',
      cpf: '000.111.222-33',
      phone: '(11) 99999-0000',
      cityState: 'Brasília/DF',
      createdAt: '2026-01-01T08:00:00.000Z',
    },
    passwordHash: 'admin123',
  },
  'olfnetto@gmail.com': {
    user: {
      id: 'usr_admin_olfnetto',
      name: 'Netto (Administrador)',
      email: 'olfnetto@gmail.com',
      role: 'admin',
      cpf: '000.111.222-99',
      phone: '(11) 98888-7777',
      cityState: 'São Paulo/SP',
      createdAt: '2026-01-01T08:00:00.000Z',
    },
    passwordHash: 'admin123',
  },
  'motorista@defesai.com.br': {
    user: {
      id: 'usr_motorista_carlos',
      name: 'Carlos Eduardo Silveira',
      email: 'motorista@defesai.com.br',
      role: 'citizen',
      cpf: '123.456.789-00',
      phone: '(11) 98765-4321',
      cnh: '05492817492',
      cityState: 'São Paulo/SP',
      createdAt: '2026-06-10T10:00:00.000Z',
    },
    passwordHash: '123456',
  },
  'motorista@www.defesai.shop': {
    user: {
      id: 'usr_motorista_carlos',
      name: 'Carlos Eduardo Silveira',
      email: 'motorista@www.defesai.shop',
      role: 'citizen',
      cpf: '123.456.789-00',
      phone: '(11) 98765-4321',
      cnh: '05492817492',
      cityState: 'São Paulo/SP',
      createdAt: '2026-06-10T10:00:00.000Z',
    },
    passwordHash: '123456',
  },
  ...generateE2EUsers(),
};