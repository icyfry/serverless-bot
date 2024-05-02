// Mock discord client
//import './__mocks__/discord-client-mock';

import dotenv from 'dotenv';
import { BotOrder, Output } from '../src/bot';
import { Discord } from '../src/communication/discord';
import { OrderSide } from '@dydxprotocol/v4-client-js';

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
    d.sendMessageOrder(order,{hash: "0x1234"});
  }, TIMEOUT);

  it("output message to discord", async () => {
    const output = new Output(new BotOrder());
    d.sendMessageOutput(output);
  }, TIMEOUT);

  it("error message to discord", async () => {
    d.sendError("error message");
  }, TIMEOUT);

  it("close position message to discord", async () => {
    d.sendMessageClosePosition("BTC-USD",{hash: "0x1234"})
  }, TIMEOUT);

});