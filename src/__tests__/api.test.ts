import { getUserByTelegramId } from '../api';

describe('API', () => {
  it('should be defined', () => {
    expect(getUserByTelegramId).toBeDefined();
  });
});
