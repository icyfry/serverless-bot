// Mock discord client
import './__mocks__/discord-client-mock';

import dotenv from 'dotenv';
import { BotOrder, Input, Output, Position, Warning } from '../src/bot';
import { Discord } from '../src/communication/discord';
import { OrderSide, OrderType } from '@dydxprotocol/v4-client-js';
import { BasicStrat } from '../src/strategy/strat-basic';
import { IndexedTx } from '@cosmjs/stargate';

dotenv.config();

describe("discord", () => {
  
  const TIMEOUT: number = 29000; // ms
  const DISCORD_PREFIX = "[🧪 discord integration test]";
  let d: Discord;

  beforeEach(async () => {
    d = new Discord(DISCORD_PREFIX);
    await d.login(process.env.BOT_TEST_DISCORD_TOKEN as string);
    d.address = process.env.BOT_TESTNET_ADDRESS as string;
    d.subAccount = 0;
  }, TIMEOUT);

  afterEach(async () => {
    await d.logout();
  }, TIMEOUT);

  it("text message to discord", async () => {
    d.sendMessage("test message");
  }, TIMEOUT);

  it("order message to discord", async () => {
    let order = new BotOrder();

    order.price = 1000;
    order.size = 0.1;
    order.side = OrderSide.SELL;
    d.sendMessageOrder(order, new Input("{}"), new BasicStrat(), undefined);

    order = new BotOrder();
    order.type = OrderType.STOP_MARKET;
    order.price = 1000;
    order.size = 0.1;
    order.side = OrderSide.BUY;
    d.sendMessageOrder(order, new Input("{}"), new BasicStrat(), undefined);

  }, TIMEOUT);

  it("output message to discord", async () => {
    const output = new Output(new Array(new BotOrder()));
    d.sendMessageOutput(output);
  }, TIMEOUT);

  it("error message to discord", async () => {
    d.sendError(new Error("error message"));
  }, TIMEOUT);

  it("warning message to discord", async () => {
    d.sendError(new Warning("warning message"));
  }, TIMEOUT);

  it("debug message to discord", async () => {
    d.sendDebug("debug message");
  }, TIMEOUT);

  it("close position message to discord", async () => {
    
    let tx: IndexedTx = {
      height: 0,
      txIndex: 0,
      hash: '0x1234567890abcdef',
      code: 0,
      events: [],
      rawLog: '',
      tx: new Uint8Array(),
      msgResponses: [],
      gasUsed: 0n,
      gasWanted: 0n
    }
    
    let position:Position = {
      realizedPnl: 20, 
      unrealizedPnl: 40,
      market: '"BTC-USD"',
      status: '',
      side: 'LONG',
      size: 0,
      maxSize: 0,
      entryPrice: 500,
      exitPrice: 1100,
      createdAt: new Date(),
      createdAtHeight: 0,
      closedAt: new Date(),
      sumOpen: 0.1,
      sumClose: 0.1,
      netFunding: 0
    }   
    
    d.sendMessageClosePosition("BTC-USD",position,tx);

    position = {
      realizedPnl: 20, 
      unrealizedPnl: 40,
      market: '"BTC-USD"',
      status: '',
      side: 'SHORT',
      size: 0,
      maxSize: 0,
      entryPrice: 1100,
      exitPrice: 1100,
      createdAt: new Date(),
      createdAtHeight: 0,
      closedAt: new Date(),
      sumOpen: 0.1,
      sumClose: 0.1,
      netFunding: 0
    }   
    
    d.sendMessageClosePosition("BTC-USD",position,tx);


  }, TIMEOUT);

});