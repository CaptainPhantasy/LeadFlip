export default class Anthropic {
  messages: {
    create: jest.Mock;
  };

  constructor(config?: any) {
    this.messages = {
      create: jest.fn(),
    };
  }
}
