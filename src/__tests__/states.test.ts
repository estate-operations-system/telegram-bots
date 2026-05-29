import { describe, expect, it } from '@jest/globals';
import { STATES } from '../states';

describe('STATES enum', () => {
  it('contains expected states', () => {
    expect(STATES.NONE).toBe('NONE');
    expect(STATES.CATEGORY).toBe('CATEGORY');
    expect(STATES.DESCRIPTION).toBe('DESCRIPTION');
    expect(STATES.PHOTO).toBe('PHOTO');
    expect(STATES.ADMIN_UPDATE_STATUS).toBe('ADMIN_UPDATE_STATUS');
  });
});
