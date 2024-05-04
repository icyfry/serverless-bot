// Mock discord client
import './__mocks__/discord-client-mock';

import { FaucetApiHost, FaucetClient, Network, OrderExecution, OrderSide, OrderType } from "@dydxprotocol/v4-client-js";
import { DYDXBot} from "../src/dydx/dydx-bot";
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

const TIMEOUT: number = 20000; // ms

describe("dYdX", () => {

  let bot : DYDXBot;

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

  it("testnet place order not executed", async () => {
    const order = new BotOrder();
    order.type = OrderType.LIMIT;
    order.execution = OrderExecution.FOK; // Will fail
    order.market = "BTC-USD";
    order.size = 0.0001;
    order.price = 10;
    order.side = OrderSide.BUY;
    await bot.placeOrder(order);
  }, TIMEOUT);

  xit("testnet open and close position", async () => {
    const market = "BTC-USD";

    // Require OPEN BTC-US position

    // CLose (error on side)
    try {
      await bot.closePosition(market,OrderSide.SELL);
    }
    catch(e: unknown){
      // should return error
      expect((e as Error).message).toBe("did not close : position is not SELL");
    }

    // CLose (error on side)
    try {
      await bot.closePosition('ETH-USD');
    }
    catch(e: unknown){
      // should return error
      expect((e as Error).message).toBe("did not close : no position on ETH-USD");
    }

    // CLose Position
    await bot.closePosition(market, OrderSide.BUY ,10);
    
  }, TIMEOUT);

  it("dryrun", async () => {
    const input : Input = {roundingFactor:1000, interval:60, dryrun:true, emitKey:"", market:"BTC-USD", price:10000, source: InputSource.Mock ,details:{action:"SELL",limit:50000}};
    try {
      await bot.process(input, new BasicStrat(), undefined);
    } 
    catch(e: unknown){
      expect((e as Error).message).toBe("dryrun : process not executed");
    }
  });

  xit("testnet add faucet", async () => {
    // add faucet to testnet
    const faucetClient = new FaucetClient(FaucetApiHost.TESTNET);
    if(bot.subaccount !== undefined) await faucetClient?.fill(bot.subaccount.address, 0, 100).catch(console.error).then(console.log);
  });

});