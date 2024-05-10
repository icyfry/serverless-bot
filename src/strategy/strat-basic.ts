import { OrderExecution, OrderSide, OrderTimeInForce, OrderType } from "@dydxprotocol/v4-client-js";
import { BotOrder, Input, InputSource, TrendSignalDetails } from "../bot";
import { Strat } from "./strat";

/**
 * SIMPLE STATELESS STRATEGY (mainly for testing)
 */
export class BasicStrat extends Strat {
    
    /**
     * @see Strat
     */
    public getStatelessOrdersBasedOnInput(input: Input): BotOrder[] {

        // Limit Order
        const order = new BotOrder();
        order.clientId = this.getNextOrderId();
        order.market = input.market;
        order.price = Math.round(input.price*input.roundingFactorPrice)/input.roundingFactorPrice;
        order.type = OrderType.LIMIT;
        order.timeInForce = OrderTimeInForce.GTT;
        order.execution = OrderExecution.DEFAULT;
        order.goodTillTime = input.interval;
        
        // Order size (in target currency)
        if(this.R === undefined) throw new Error("R not defined");
        order.size = Math.round((this.R / input.price)*input.roundingFactorSize)/input.roundingFactorSize;

        switch(input.source) { 
            
            // Open a new limit position for a trend signal
            case InputSource.TrendSignal: {
                const details = input.details as TrendSignalDetails;
                order.price = Math.round(details.entry*input.roundingFactorPrice)/input.roundingFactorPrice;
                if(details.trend.toUpperCase() === "BUY") { order.side = OrderSide.BUY; } else if(details.trend.toUpperCase() === "SELL") { order.side = OrderSide.SELL; }
                else {throw new Error("Unknown trend " + details.trend);}
                break;
            }
            case InputSource.Mock: {
                break;
            }
            default: {
                throw new Error("Strategy does not handle " + input.source);
            }
        }

        return new Array(order);
    }

    /**
     * @see Strat
     */
    public getName(): string {
        return "SIMPLE STATELESS STRATEGY"
    }

}
