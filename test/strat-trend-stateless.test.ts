import { OrderSide, OrderType} from "@dydxprotocol/v4-client-js";
import { Input, InputSource, TrendSignalDetails } from "../src/bot";
import { StatelessTrendStrat } from "../src/strategy/strat-trend-stateless";
import { replayAlerts } from "./data/alerts-replay";
import dotenv from 'dotenv';

dotenv.config();

describe("strat-trend-stateless", () => {
  
  let strat : StatelessTrendStrat;

  beforeEach(() => {
    strat = new StatelessTrendStrat();
    strat.R = 1000;
  });

  it("replay alerts", async () => {
    await replayAlerts(strat);
  });
  
  it("check orders", async () => {

    // TrendSignal
    //////////////////////////////////////////////////////

    const trendSignalDetailsInputBtc: TrendSignalDetails = {trend:"BUY",entry:90,cancel:80}
    const inputBtc : Input = {interval:60, roundingFactorSize:10000, roundingFactorPrice:100, dryrun:true, emitKey:"", market:"BTC-USD",price:100,source: InputSource.TrendSignal ,details: trendSignalDetailsInputBtc};
    
    // Get order trend BTC
    let orders = strat.getStatelessOrdersBasedOnInput(inputBtc);
    expect(orders.length).toBe(2);

    // Check fake-out order
    let foOrder = orders[0];
    expect(foOrder.type).toBe(OrderType.STOP_MARKET);
    expect(foOrder.price).toBe(56);
    expect(foOrder.triggerPrice).toBe(78.8);
    expect(foOrder.side).toBe(OrderSide.SELL);
    
    // Check main order
    let mainOrder = orders[1];
    expect(mainOrder.type).toBe(OrderType.LIMIT);
    expect(mainOrder.price).toBe(90);
    expect(mainOrder.side).toBe(OrderSide.BUY);
    expect(mainOrder.clientId).toBe(foOrder.clientId+1);

    const trendSignalDetailsInputEth: TrendSignalDetails = {trend:"BUY",entry:3089.0775000000003,cancel:3059.7393494264807}
    const inputEth : Input = {interval:60, roundingFactorSize:1000, roundingFactorPrice:10, dryrun:true, emitKey:"", market:"ETH-USD",price:3091.57,source: InputSource.TrendSignal ,details: trendSignalDetailsInputEth};
  
    // Get order trend ETH
    orders = strat.getStatelessOrdersBasedOnInput(inputEth);
    expect(orders.length).toBe(2);

    // Check fake-out order
    foOrder = orders[0];
    expect(foOrder.type).toBe(OrderType.STOP_MARKET);
    expect(foOrder.price).toBe(2141.8);
    expect(foOrder.triggerPrice).toBe(3013.8);
    expect(foOrder.size).toBe(0.646);
    expect(foOrder.side).toBe(OrderSide.SELL);
    
    // Check main order
    mainOrder = orders[1];
    expect(mainOrder.type).toBe(OrderType.LIMIT);
    expect(mainOrder.price).toBe(3089.1);
    expect(mainOrder.size).toBe(0.323);
    expect(mainOrder.side).toBe(OrderSide.BUY);
    expect(mainOrder.clientId).toBe(foOrder.clientId+1);
    
    expect(() => {
      strat.getStatelessOrdersBasedOnInput(
        {interval:60, roundingFactorSize:10, roundingFactorPrice:100, dryrun:true, emitKey:"", market:"BTC-USD",price:10000,source: InputSource.TrendSignal ,details:({trend:"ERR"} as TrendSignalDetails)
      });
    }).toThrow();

  });

  it("get name", async () => {
    expect(strat.getName()).toBe("TREND STATELESS STRATEGY");
  });

});