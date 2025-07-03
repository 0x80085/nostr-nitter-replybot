import { AppTokenGuard } from './app-token.guard';

describe('AppTokenGuard', () => {
  it('should be defined', () => {
    expect(new AppTokenGuard()).toBeDefined();
  });
});
