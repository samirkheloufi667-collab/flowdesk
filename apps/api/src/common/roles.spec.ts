import { hasRole } from './roles';

describe('hiérarchie des rôles', () => {
  it('un rôle supérieur hérite des droits inférieurs', () => {
    expect(hasRole('OWNER', 'ADMIN')).toBe(true);
    expect(hasRole('ADMIN', 'MEMBER')).toBe(true);
    expect(hasRole('MEMBER', 'VIEWER')).toBe(true);
  });

  it('un rôle inférieur n’accède pas aux actions supérieures', () => {
    expect(hasRole('VIEWER', 'MEMBER')).toBe(false);
    expect(hasRole('MEMBER', 'ADMIN')).toBe(false);
    expect(hasRole('ADMIN', 'OWNER')).toBe(false);
  });

  it('un rôle satisfait sa propre exigence', () => {
    expect(hasRole('ADMIN', 'ADMIN')).toBe(true);
  });
});
