import { OrderExecution, OrderSide, OrderTimeInForce, OrderType } from "@dydxprotocol/v4-client-js";
import { BotOrder, Input, InputSource, SMCDetails, SuperTrendDetails } from "../bot";
import { Strat } from "./strat";

export class BasicStrat extends Strat {
    
    // Order size in USD
    public R  = Number(process.env.R_USD)

    /**
     * @see Strat
     */
    public getStatelessOrderBasedOnInput(input: Input): BotOrder {

        const order = new BotOrder();
        order.market = input.market;
        order.price = input.price;
        order.type = OrderType.LIMIT;
        order.timeInForce = OrderTimeInForce.GTT;
        order.execution = OrderExecution.DEFAULT;
        order.clientId = Date.now();

        // Order size (in target currency)
        if(this.R === undefined) throw new Error("R not defined");
        order.size = (this.R / input.price);

        switch(input.source) { 
            case InputSource.SuperTrend: {
                const details = input.details as SuperTrendDetails;
                order.price = details.limit;
                if(details.action.toUpperCase() === "BUY") {
                    order.side = OrderSide.BUY;
                }
                else if(details.action.toUpperCase() === "SELL") {
                    order.side = OrderSide.SELL;
                }
                else {
                    throw new Error("Unknown SuperTrend action " + details.action);
                }
                break;
            }
            case InputSource.SMC: {
                const details = input.details as SMCDetails;
                if(details.type.toUpperCase() === "BULLISH BOS") {
                    order.side = OrderSide.BUY;
                }
                else if(details.type.toUpperCase() === "BEARISH BOS") {
                    order.side = OrderSide.SELL;
                }
                else {
                    throw new Error("Unknown SMC type " + details.type);
                }
                break;
            }
            default: {
                throw new Error("Unknown source " + input.source);
            }
        }

        return order;
    }

}
