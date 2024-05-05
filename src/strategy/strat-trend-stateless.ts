import { OrderExecution, OrderSide, OrderTimeInForce, OrderType } from "@dydxprotocol/v4-client-js";
import { BotOrder, Input, InputSource, TrendSignalDetails } from "../bot";
import { Strat } from "./strat";

/**
 * TREND STATELESS STRATEGY
 */
export class StatelessTrendStrat extends Strat {
    
    // Fine-tuning parameters
    private FO_TIME_FACTOR = 1;
    private ORDER_BUY_FACTOR = 1.2;
    private ORDER_SELL_FACTOR = 0.35;
    private FO_ORDER_BUY_FACTOR = 1.015;
    private FO_ORDER_SELL_FACTOR = 0.985;
    private OPTIMISTIC_TIMEFRAME_ACTIVATION = 300; // 5min

    /**
     * Commons elements of all orders
     */
    private commonsOrder(side: OrderSide, size:number, input: Input): BotOrder {
        const order = new BotOrder();
        order.clientId = this.getNextOrderId();
        order.reduceOnly = false;
        order.market = input.market;
        order.timeInForce = OrderTimeInForce.IOC;
        order.execution = OrderExecution.IOC;
        order.size = size;
        order.side = side;
        return order;
    }

    /**
     * Create the main order of trend reversal
     */
    private createMainOrder(price: number, side: OrderSide, size:number, input: Input): BotOrder {
        const order = this.commonsOrder(side,size,input);
        order.type = OrderType.LIMIT;
        order.timeInForce = OrderTimeInForce.GTT;
        order.execution = OrderExecution.DEFAULT;
        order.price = Math.round(Number(price)*input.roundingFactorPrice)/input.roundingFactorPrice;
        return order
    }

    /**
     * Create a fake-out protection order
     */
    private createFakeOutOrder(price: number, side: OrderSide, size:number,input: Input): BotOrder {
        const order = this.commonsOrder(side,size,input);
        order.type = OrderType.STOP_MARKET;
        order.goodTillTime = Math.round(Number(input.interval) * this.FO_TIME_FACTOR);
        order.triggerPrice = price;
        if(side === OrderSide.BUY) {
            order.triggerPrice = Number(order.triggerPrice) * this.FO_ORDER_BUY_FACTOR;
        }else if(side === OrderSide.SELL) {
            order.triggerPrice = Number(order.triggerPrice) * this.FO_ORDER_SELL_FACTOR;
        }
        if(side === OrderSide.BUY) {
            order.price = Number(price) * this.ORDER_BUY_FACTOR;
        }else if(side === OrderSide.SELL) {
            order.price = Number(price) * this.ORDER_SELL_FACTOR;
        }
        order.triggerPrice = Math.round(Number(order.triggerPrice)*input.roundingFactorPrice)/input.roundingFactorPrice;
        order.price = Math.round(Number(order.price)*input.roundingFactorPrice)/input.roundingFactorPrice;
        return order
    }

    /**
     * Split an order into multiple orders
     */
    private splitOrder(order: BotOrder) : BotOrder[] {
        // TO BE IMPLEMENTED FOR LIMIT ORDERS
        return new Array(order);
    }

    /**
     * @see Strat
     */
    public getStatelessOrdersBasedOnInput(input: Input): BotOrder[] {

        const orders = new Array<BotOrder>();

        let sideMainOrder: OrderSide;
        let sideFakeOutOrder: OrderSide;

        switch(input.source) {

            case InputSource.TrendSignal: {

                // Order size (in target currency)
                if(this.R === undefined) throw new Error("R not defined");
                const size = Math.round((this.R / input.price)*input.roundingFactorSize)/input.roundingFactorSize;

                // Trend signal
                const details = input.details as TrendSignalDetails;

                // From SELL to BUY
                if(details.trend.toUpperCase() === "BUY") {
                    sideMainOrder = OrderSide.BUY;
                    sideFakeOutOrder = OrderSide.SELL;
                }
                // From BUY to SELL
                else if(details.trend.toUpperCase() === "SELL") {
                    sideMainOrder = OrderSide.SELL;
                    sideFakeOutOrder = OrderSide.BUY;
                }
                else {
                    throw new Error("Unknown trend " + details.trend);
                }

                // Fake-out protection order, invert position
                const fakeOutOrder = this.createFakeOutOrder(Number(details.cancel), sideFakeOutOrder, Number(size)*2, input);
                orders.push(fakeOutOrder);

                // Main order
                let entryPrice = Number(details.entry);

                // Market entry for interval > OPTIMISTIC_TIMEFRAME_ACTIVATION
                if(Number(input.interval) > this.OPTIMISTIC_TIMEFRAME_ACTIVATION) {
                    if(sideMainOrder === OrderSide.BUY) {
                        entryPrice = Number(entryPrice) * this.ORDER_BUY_FACTOR;
                    }else if(sideMainOrder === OrderSide.SELL) {
                        entryPrice = Number(entryPrice) * this.ORDER_SELL_FACTOR;
                    }
                }

                const mainOrder = this.createMainOrder(entryPrice, sideMainOrder, size, input);
                orders.push(...this.splitOrder(mainOrder));
                
                break;
                
            }
            case InputSource.Mock: {
                break;
            }
            default: {
                throw new Error("Strategy does not handle " + input.source);
            }
        }

        return orders;
    }

    /**
     * @see Strat
     */
    public getName(): string {
        return "TREND STATELESS STRATEGY"
    }

}
