import { OrderSide} from "@dydxprotocol/v4-client-js";
import { BotOrder, Input, InputSource, TrendSignalDetails } from "../src/bot";
import { BasicStrat } from "../src/strategy/strat-basic";
import { replayAlerts } from "./data/alerts-replay";
import dotenv from 'dotenv';

dotenv.config();

describe("strat-basic", () => {
  
  let strat : BasicStrat;

  beforeEach(() => {
    strat = new BasicStrat();
    strat.R = 1000;
  });

  it("replay alerts", async () => {
    await replayAlerts(strat);
  });
  
  it("check orders creation", async () => {

    let order: BotOrder;

    // Mock
    //////////////////////////////////////////////////////

    const input : Input = {interval:60, roundingFactorSize:1, roundingFactorPrice:1, dryrun:true, emitKey:"", market:"BTC-USD",price:0,source: InputSource.Mock ,details:{}};

    // no rounding size = 0.0999594977723775
    strat.R = 1234;
    input.roundingFactorSize = 100000;
    input.price = 12345;
    
    order = strat.getStatelessOrdersBasedOnInput(input)[0];
    expect(order.size).toBe(0.09996);

    // no rounding size = 16.02597402597403
    strat.R = 1234;
    input.roundingFactorSize = 100000;
    input.price = 77;
    
    order = strat.getStatelessOrdersBasedOnInput(input)[0];
    expect(order.size).toBe(16.02597);

    // no rounding price = 12.345678
    strat.R = 1234;
    input.roundingFactorPrice = 10000;
    input.price = 12.345678;
    
    order = strat.getStatelessOrdersBasedOnInput(input)[0];
    expect(order.price).toBe(12.3457);

    // no rounding price = 77.7777
    strat.R = 1234;
    input.roundingFactorPrice = 1;
    input.price = 77.7777;
    
    order = strat.getStatelessOrdersBasedOnInput(input)[0];
    expect(order.price).toBe(78);

    // TrendSignal
    //////////////////////////////////////////////////////

    const InputBuy : Input = {interval:60, roundingFactorSize:10, roundingFactorPrice:100, dryrun:true, emitKey:"", market:"BTC-USD",price:10000,source: InputSource.TrendSignal ,details:({trend:"BUY",entry:12345.6789} as TrendSignalDetails)};
    const InputSell : Input = {interval:60, roundingFactorSize:10, roundingFactorPrice:100, dryrun:false, emitKey:"", market:"BTC-USD",price:10000,source: InputSource.TrendSignal ,details:({trend:"SELL",entry:12345.6789} as TrendSignalDetails)};
  
    order = strat.getStatelessOrdersBasedOnInput(InputBuy)[0];
    expect(order.size).toBe(0.1);
    expect(order.side).toBe(OrderSide.BUY);
    expect(order.price).toBe(12345.68);

    order = strat.getStatelessOrdersBasedOnInput(InputSell)[0];
    expect(order.size).toBe(0.1);
    expect(order.side).toBe(OrderSide.SELL);
    expect(order.price).toBe(12345.68);

    expect(() => {
      strat.getStatelessOrdersBasedOnInput(
        {interval:60, roundingFactorSize:10, roundingFactorPrice:100, dryrun:false, emitKey:"", market:"BTC-USD",price:10000,source: InputSource.TrendSignal ,details:({trend:"ERR"} as TrendSignalDetails)
      });
    }).toThrow();

  });

  it("get name", async () => {
    expect(strat.getName()).toBe("SIMPLE STATELESS STRATEGY");
  });

});
