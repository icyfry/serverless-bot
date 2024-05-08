// Mock discord client
import './__mocks__/discord-client-mock';

// Mock DYDX
import './__mocks__/dydx-mock';

import { FaucetApiHost, FaucetClient, Network, OrderExecution, OrderSide, OrderTimeInForce, OrderType } from "@dydxprotocol/v4-client-js";
import { DYDXBot} from "../src/dydx/dydx-bot";
import { BotOrder, BrokerConfig, Input, InputSource } from "../src/bot";
import dotenv from 'dotenv';
import { BasicStrat } from '../src/strategy/strat-basic';

dotenv.config();

// Mock config
function getBrokerConfig(): Promise<BrokerConfig> {
  return new Promise((resolve, reject) => {
      const config: BrokerConfig = { 
        TESTNET_MNEMONIC: process.env.BOT_TESTNET_MNEUMONIC as string, 
        MAINNET_MNEMONIC: "",
        DISCORD_TOKEN: process.env.BOT_TEST_DISCORD_TOKEN as string
      };
      resolve(config);
  });
}

const TIMEOUT: number = 25000; // ms

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
    expect(address).toBe(process.env.BOT_TESTNET_ADDRESS)
  }, TIMEOUT);

  it("dydx dryrun", async () => {
    const input : Input = {roundingFactorPrice:1000, roundingFactorSize:1000, interval:60, dryrun:true, emitKey:"", market:"DOGE-USD", price:10000, source: InputSource.Mock ,details:{}};
    try {
      await bot.process(input, new BasicStrat(), undefined);
    } 
    catch(e: unknown){
      expect((e as Error).message).toBe("dryrun : process not executed");
    }
  });

  it("[testnet] place order not executed", async () => {
    const order = new BotOrder();
    order.type = OrderType.LIMIT;
    order.execution = OrderExecution.FOK;
    order.market = "DOGE-USD";
    order.size = 100;
    order.price = 0.01;
    order.side = OrderSide.BUY;
    await bot.placeOrder(order);
  }, TIMEOUT);

  xit("[testnet] open and close position", async () => {
    const market = "DOGE-USD";

    // open long DOGE-USD position
    const order = new BotOrder();
    order.type = OrderType.MARKET;
    order.execution = OrderExecution.FOK;
    order.timeInForce = OrderTimeInForce.FOK;
    order.market = market;
    order.size = 100;
    order.price = 1;
    order.side = OrderSide.BUY;
    await bot.placeOrder(order);

    try {
      await bot.closePosition('ETH-USD', 1, 100000);
    }
    catch(e: unknown){
      // should return error
      expect((e as Error).message).toBe("Trying to close a positon that does not exist on ETH-USD");
    }

    await bot.closePosition(market, 1, 100000);

  }, TIMEOUT);

  // Add faucet (testnet)
  xit("[testnet] add faucet", async () => {
    
    const faucetClient = new FaucetClient(FaucetApiHost.TESTNET);
    if(bot.subaccount !== undefined) await faucetClient?.fill(bot.subaccount.address, 0, 1000).catch(console.error).then(console.log);
  });

});
