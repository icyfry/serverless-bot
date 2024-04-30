import { OrderSide} from "@dydxprotocol/v4-client-js";
import { BotOrder, Input, InputSource } from "../src/bot";
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
    const order: BotOrder = strat.getStatelessOrderBasedOnInput({rawData:"{}", roundingFactor:1000, dryrun:false, emitKey:"", market:"BTC-USD",price:10000,source: InputSource.SuperTrend ,details:{action:"BUY",limit:50000}});
    expect(order.size).toBe(0.1);
    expect(order.side).toBe(OrderSide.BUY);
    expect(order.price).toBe(50000);
  });

  it("superTrend SELL", () => {
    const order: BotOrder = strat.getStatelessOrderBasedOnInput({rawData:"{}", roundingFactor:1000, dryrun:false, emitKey:"", market:"BTC-USD",price:10000,source: InputSource.SuperTrend ,details:{action:"SELL",limit:50000}});
    expect(order.size).toBe(0.1);
    expect(order.side).toBe(OrderSide.SELL);
    expect(order.price).toBe(50000);
  });

  it("superTrend error", () => {
    expect(() => {
    const order: BotOrder = strat.getStatelessOrderBasedOnInput({rawData:"{}", roundingFactor:1000, dryrun:false, emitKey:"", market:"BTC-USD",price:10000,source: InputSource.SuperTrend ,details:{action:"ERR"}});
    }).toThrow();
  });

  it("rounding", async () => {
    const input : Input = {rawData:"{}", roundingFactor:0, dryrun:true, emitKey:"", market:"BTC-USD",price:0,source: InputSource.Mock ,details:{action:"BUY",limit:0}};
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


});