import { OrderSide, OrderType } from "@dydxprotocol/v4-client-js";
import { Bot, BotOrder, Input, Position } from "../../src/bot";
import { Strat } from "../../src/strategy/strat";
import { Context } from "aws-lambda";
import { CallbackResponseParams } from "../../src/main";

/**
 * Mock Bot for testing strategies
 */
export class MockBot extends Bot {

    // For stats
    private statsPreviousBalanceLastClose: number;
    private statsHeatMap: string = "";

    public balance: number;
    public openPositonsLongs: Map<string,number> = new Map();
    public openPositonsShorts: Map<string,number> = new Map();
    public prices: Map<string,number> = new Map();

    constructor(initialBalance: number) {
        super();
        this.statsPreviousBalanceLastClose = initialBalance;
        this.balance = initialBalance;
    }

    /**
     * 
     * @returns Return visual statistics
     */
    public getHeatMap() : string {
        return this.statsHeatMap;
    }

    /**
     * Return balance + last known value of open orders
     */
    public getFullBalance() : number {
        return this.balance + this.getLongBalance() - this.getShortBalance();
    }

    public getLongBalance() : number {
        let openOrdersValue: number = 0;
        this.openPositonsLongs.forEach((value: number,key: string) => {
            openOrdersValue += (this.prices.get(key) ?? 0) * value;
        });
        return openOrdersValue;
    }

    public getShortBalance() : number {
        let openOrdersValue: number = 0;
        this.openPositonsShorts.forEach((value: number,key: string) => {
            openOrdersValue += (this.prices.get(key) ?? 0) * value;
        });
        return openOrdersValue;
    }

    /**
     * Validate a order at a specified price
     */
    private async placeOrderOverridePrice(order: BotOrder, price: number): Promise<any> {
        order.price = price;
        return this.placeOrder(order);
    }

    /**
     * @see Bot
     */
    public closePosition(market: string): Promise<{tx: any, position: any}> {
        // Longs
        if(this.openPositonsLongs.has(market)) {
            // Add order value to balance
            this.balance += (this.prices.get(market) ?? 0) * (this.openPositonsLongs.get(market) ?? 0);
            // Close order
            this.openPositonsLongs.delete(market);
        }
        // Shorts
        if(this.openPositonsShorts.has(market)) {
            // Add order value to balance
            this.balance -= (this.prices.get(market) ?? 0) * (this.openPositonsShorts.get(market) ?? 0);
            // Close order
            this.openPositonsShorts.delete(market);
        }

        // Stats
        if(this.getFullBalance() < this.statsPreviousBalanceLastClose) {
            this.statsHeatMap += "🟥";
        }else{
            this.statsHeatMap += "🟩";
        }
        this.statsPreviousBalanceLastClose = this.getFullBalance();
        
        return Promise.resolve({tx: {},  position: {}});
    }

    /**
     * @see Bot
     */
    async connect(): Promise<string> {
        return "0x123";
    }

    /**
     * @see Bot
     */
    public async process(input: Input, strategy: Strat, context?: Context): Promise<CallbackResponseParams> {

        const orders: BotOrder[] = strategy.getStatelessOrdersBasedOnInput(input);

            if(orders.length == 0) throw new Error("No orders to process");
       
            // Last known price
            this.prices.set(input.market, input.price);

            // Close previous position
            this.closePosition(input.market);

            // Open positions for orders
            for (const order of orders) {
                if(order.type === OrderType.LIMIT || order.type === OrderType.MARKET) {
                    let price = input.price;
                    // Take optimistic price for limit orders
                    if((order.type === OrderType.LIMIT && order.side === OrderSide.BUY && order.price < input.price)
                    || (order.type === OrderType.LIMIT && order.side === OrderSide.SELL && order.price > input.price)) {
                        price = order.price;

                    }
                    this.placeOrderOverridePrice(order, price);
                }
            }

        return Promise.resolve({response_error:undefined, response_success:undefined});

    }

    /**
     * @see Bot
     */
    async placeOrder(order: BotOrder): Promise<any> {
        const value = order.size * order.price;
        // Open new position
        if (order.side == OrderSide.BUY) {
            this.openPositonsLongs.set(order.market, (this.openPositonsLongs.get(order.market) ?? 0) + order.size);
            this.balance -= value;
        } else if (order.side == OrderSide.SELL) {
            this.openPositonsShorts.set(order.market, (this.openPositonsShorts.get(order.market) ?? 0) + order.size);
            this.balance += value;
        }
    }

    /**
     * @see Bot
     */
    async disconnect(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    /**
     * @see Bot
     */
    async cancelOrdersForMarket(market: string, clientId: number): Promise<any> {
        throw new Error("Method not implemented.");
    }

    /**
     * @see Bot
     */
    public createClosePositionOrder(market: string, refPrice: number, refPriceRoundingFactor: number): Promise<{ order: BotOrder; position: Position; }> {
        throw new Error("Method not implemented.");
    }

}
