// Mock discord client
import './__mocks__/discord-client-mock';

import { Network, OrderExecution, OrderSide, OrderType } from "@dydxprotocol/v4-client-js";
import { DYDXBot  } from "../src/dydx/dydx-bot";
import { BotOrder, BrokerConfig, Input, InputSource } from "../src/bot";
import dotenv from 'dotenv';
import { BasicStrat } from '../src/strategy/strat-basic';

dotenv.config();

// Mock Mnemonics
function getBrokerConfig(): Promise<BrokerConfig> {
  return new Promise((resolve, reject) => {
      const mnemonics: BrokerConfig = { 
        TESTNET_MNEMONIC: process.env.TEST_MNEUMONIC_TESTNET as string, 
        MAINNET_MNEMONIC: "",
        DISCORD_TOKEN: process.env.TEST_DISCORD_TOKEN as string
      };
      resolve(mnemonics);
  });
}

const TIMEOUT: number = 30000; // ms

describe("dYdX", () => {

  var bot : DYDXBot;

  beforeEach(async () => {
    // jest.resetModules();
    bot = new DYDXBot(Network.testnet());
    bot.getBrokerConfig = jest.fn().mockReturnValue(getBrokerConfig());
    await bot.connect();
    bot.discord.prefix = "[🧪 dydx integration test]";
  }, TIMEOUT);

  afterEach(async () => {
    await bot.disconnect();
  }, TIMEOUT);

  it("connect client", async () => {
    const address: string = bot.subaccount?.address as string;
    expect(bot.client).toBeDefined();
    expect(bot.subaccount).toBeDefined();
    expect(bot.wallet).toBeDefined();
    expect(address).toBe(process.env.TEST_ADDRESS_TESTNET)
  }, TIMEOUT);

  it("testnet place order", async () => {
    const order = new BotOrder();
    order.type = OrderType.LIMIT
    order.execution = OrderExecution.FOK // the order will be cancelled
    order.market = "BTC-USD";
    order.size = 0.0005;
    order.price = 10;
    order.side = OrderSide.BUY;
    await bot.placeOrder(order).then(console.log).catch(console.error);
  }, TIMEOUT);

  xit("testnet close position", async () => {
    const market = "BTC-USD";

    // Create position
    const order = new BotOrder();
    order.type = OrderType.MARKET
    order.execution = OrderExecution.DEFAULT
    order.execution = OrderExecution.FOK
    order.market = market;
    order.size = 0.0005;
    order.price = 100000;
    order.side = OrderSide.BUY;
    await bot.placeOrder(order).then(async (response) => {
      // CLose
      await bot.closePosition(market).catch(console.error);
    }).catch(console.error);

  }, TIMEOUT);

  it("dryrun", async () => {
    const input : Input = {roundingFactor:1000, dryrun:true, emitKey:"", market:"BTC-USD",price:10000,source: InputSource.Mock ,details:{action:"SELL",limit:50000}};
    let response = await bot.process(input, new BasicStrat(), undefined);
    expect(response.response_error).not.toBe(null);
    expect(response.response_success).toBe(null);
  });

});