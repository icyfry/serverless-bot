// Mock discord client
import './__mocks__/discord-client-mock';

import dotenv from 'dotenv';
import { BotOrder, Input, InputSource, Output } from '../src/bot';
import { Discord } from '../src/communication/discord';
import { OrderSide } from '@dydxprotocol/v4-client-js';
import { BasicStrat } from '../src/strategy/strat-basic';

dotenv.config();

describe("discord", () => {
  
  const TIMEOUT: number = 29000; // ms
  const DISCORD_PREFIX = "[🧪 discord integration test]";
  var d: Discord;

  beforeEach(async () => {
    d = new Discord(DISCORD_PREFIX);
    await d.login(process.env.TEST_DISCORD_TOKEN as string);
  }, TIMEOUT);

  afterEach(async () => {
    await d.logout();
  }, TIMEOUT);

  it("text message to discord", async () => {
    d.sendMessage("test message");
  }, TIMEOUT);

  it("order message to discord", async () => {
    const order = new BotOrder();
    order.price = 1000;
    order.size = 0.1;
    order.side = OrderSide.SELL;
    d.sendMessageOrder(order, new Input("{}"), new BasicStrat(), {hash: "0x1234"});
  }, TIMEOUT);

  it("output message to discord", async () => {
    const output = new Output(new BotOrder());
    d.sendMessageOutput(output);
  }, TIMEOUT);

  it("error message to discord", async () => {
    d.sendError("error message");
  }, TIMEOUT);

  it("close position message to discord", async () => {
    d.sendMessageClosePosition("BTC-USD",{
      realizedPnl: 10, 
      unrealizedPnl: 100,
      market: '',
      status: '',
      side: '',
      size: 0,
      maxSize: 0,
      entryPrice: 0,
      exitPrice: 0,
      createdAt: new Date(),
      createdAtHeight: 0,
      closedAt: new Date(),
      sumOpen: 0,
      sumClose: 0,
      netFunding: 0
    },{hash: "0x1234"})
  }, TIMEOUT);

});