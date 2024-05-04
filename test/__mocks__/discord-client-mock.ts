jest.mock('discord.js', () => {
    return {
      Client: jest.fn().mockImplementation(() => {
        return {
          login: jest.fn(),
          on: jest.fn(),
          removeEventListener: jest.fn(),
          removeAllListeners: jest.fn(),
          once: jest.fn(),
          isReady: true,
          destroy: jest.fn(),
          channels: {
            fetch: jest.fn().mockResolvedValue({
              id: '1234',
              name: 'channel-name',
              send: jest.fn().mockImplementation((message) => {})
            })
          },
      }}),
      EmbedBuilder: jest.fn().mockImplementation(() => {
        return {
          setTitle: jest.fn().mockReturnThis(),
          setColor: jest.fn().mockReturnThis(),
          setDescription: jest.fn().mockReturnThis(),
          setTimestamp: jest.fn().mockReturnThis(),
          addFields: jest.fn().mockReturnThis(),
          setURL: jest.fn().mockReturnThis()
        };
      }),
      Events: { ClientReady : "ready" },
      GatewayIntentBits: jest.fn().mockImplementation(() => {
        return {
          Guilds: 1
        };
      })
    };
  });
