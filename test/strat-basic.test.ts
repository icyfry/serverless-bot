import { OrderSide} from "@dydxprotocol/v4-client-js";
import { BotOrder, InputSource } from "../src/bot";
import { BasicStrat } from "../src/strategy/strat-basic";
import dotenv from 'dotenv';

dotenv.config();

describe("basic strat", () => {
  
  var strat : BasicStrat = new BasicStrat();

  beforeEach(() => {
    strat = new BasicStrat();
    strat.R = 1000;
  });
  
  it("superTrend BUY", () => {
    const order: BotOrder = strat.getStatelessOrderBasedOnInput({rawData:"{}", dryrun:false, emitKey:"", market:"BTC-USD",price:10000,source: InputSource.SuperTrend ,details:{action:"BUY",limit:50000}});
    expect(order.size).toBe(0.1);
    expect(order.side).toBe(OrderSide.BUY);
    expect(order.price).toBe(50000);
  });

  it("superTrend SELL", () => {
    const order: BotOrder = strat.getStatelessOrderBasedOnInput({rawData:"{}", dryrun:false, emitKey:"", market:"BTC-USD",price:10000,source: InputSource.SuperTrend ,details:{action:"SELL",limit:50000}});
    expect(order.size).toBe(0.1);
    expect(order.side).toBe(OrderSide.SELL);
    expect(order.price).toBe(50000);
  });

  it("superTrend error", () => {
    expect(() => {
    const order: BotOrder = strat.getStatelessOrderBasedOnInput({rawData:"{}", dryrun:false, emitKey:"", market:"BTC-USD",price:10000,source: InputSource.SuperTrend ,details:{action:"ERR"}});
    }).toThrow();
  });

});