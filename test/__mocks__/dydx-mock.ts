import { Bot } from "../../src/bot";
import dotenv from 'dotenv';

dotenv.config();

jest.mock('@dydxprotocol/v4-client-js', () => {
  
  const mockConnect = jest.fn().mockImplementation(() => new CompositeClient());
  const mockDisconnect = jest.fn().mockResolvedValue({});
  const mockPlaceOrder = jest.fn();

  const CompositeClient = jest.fn().mockImplementation(() => {
    return { connect: mockConnect, disconnect: mockDisconnect, placeOrder: mockPlaceOrder };
  }) as any;

  CompositeClient.connect = mockConnect;
  CompositeClient.disconnect = mockDisconnect;
  
  return {
    BECH32_PREFIX: 'mock-bech32-prefix',
    CompositeClient,
    LocalWallet: {
      fromMnemonic: jest.fn()
    },
    Network: {
      testnet: jest.fn().mockReturnValue({
        getString: jest.fn().mockImplementation((): string => { return Bot.NETWORK_TESTNET; })
      }),
    },
    OrderExecution: jest.fn(),
    OrderFlags: jest.fn(),
    OrderSide: jest.fn(),
    OrderTimeInForce: jest.fn(),
    OrderType: jest.fn(),
    SubaccountClient: jest.fn().mockImplementation(() => {
      return { address: process.env.BOT_TESTNET_ADDRESS ?? "" }
    })
  };
});
