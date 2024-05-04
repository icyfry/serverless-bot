// Mock Bot
import { MockBot } from "./__mocks__/bot-mock";

import { OrderSide} from "@dydxprotocol/v4-client-js";
import { BotOrder, Input, InputSource } from "../src/bot";
import { BasicStrat } from "../src/strategy/strat-basic";
import dotenv from 'dotenv';
import fs from 'fs';
import csvParser from 'csv-parser';

dotenv.config();

// Historical alerts interface
interface Alert {
  "Nom" : string;
  "Description" : string;
}

describe("basic strat", () => {
  
  let strat : BasicStrat;

  beforeEach(() => {
    strat = new BasicStrat();
    strat.R = 1000;
  });
  
  it("supertrend BUY", () => {
    const order: BotOrder = strat.getStatelessOrderBasedOnInput({interval:60, roundingFactor:1000, dryrun:false, emitKey:"", market:"BTC-USD",price:10000,source: InputSource.SuperTrend ,details:{action:"BUY",limit:50000}});
    expect(order.size).toBe(0.1);
    expect(order.side).toBe(OrderSide.BUY);
    expect(order.price).toBe(50000);
  });

  it("supertrend SELL", () => {
    const order: BotOrder = strat.getStatelessOrderBasedOnInput({interval:60, roundingFactor:1000, dryrun:false, emitKey:"", market:"BTC-USD",price:10000,source: InputSource.SuperTrend ,details:{action:"SELL",limit:50000}});
    expect(order.size).toBe(0.1);
    expect(order.side).toBe(OrderSide.SELL);
    expect(order.price).toBe(50000);
  });

  it("supertrend error", () => {
    expect(() => {
    const order: BotOrder = strat.getStatelessOrderBasedOnInput({interval:60, roundingFactor:1000, dryrun:false, emitKey:"", market:"BTC-USD",price:10000,source: InputSource.SuperTrend ,details:{action:"ERR"}});
    }).toThrow();
  });

  it("rounding", async () => {
    const input : Input = {interval:60, roundingFactor:0, dryrun:true, emitKey:"", market:"BTC-USD",price:0,source: InputSource.Mock ,details:{action:"BUY",limit:0}};
    let order: BotOrder;

    // no rounding size = 0,0999594977723775
    strat.R = 1234;
    input.roundingFactor = 100000;
    input.price = 12345;
    
    order = strat.getStatelessOrderBasedOnInput(input);
    expect(order.size).toBe(0.09996);

    // no rounding size = 16,02597402597403
    strat.R = 1234;
    input.roundingFactor = 100000;
    input.price = 77;
    
    order = strat.getStatelessOrderBasedOnInput(input);
    expect(order.size).toBe(16.02597);
  });

  it("replay alerts", async () => {

    const INITIAL_BALANCE = 1000;
    const bot: MockBot = new MockBot(INITIAL_BALANCE);

    const alerts: Alert[] = [];

    // Read alerts from csv
    await new Promise((resolve, reject) => {
      fs.createReadStream('./test/data/alerts-history.csv')
        .pipe(csvParser())
        .on('data', (data: Alert) => {
          alerts.push(data);
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    // Process alerts
    for (const alert of alerts) {
      const input: Input = new Input(alert.Description);
      await bot.process(input, strat, undefined);
    }

    // Successful strategy
    expect(bot.getFullBalance()).toBeGreaterThan(INITIAL_BALANCE)

    console.log("performance : " + ((bot.getFullBalance()/INITIAL_BALANCE)-1)*100 + "%");

  });


});