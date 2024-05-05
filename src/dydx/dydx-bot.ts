import { BECH32_PREFIX,CompositeClient, LocalWallet, Network, OrderFlags, OrderSide, OrderTimeInForce, OrderType, SubaccountClient } from "@dydxprotocol/v4-client-js";
import { BotOrder, Bot, BrokerConfig, Warning, TxResponse, Position } from "../bot";

/**
 * Bot implementation for dYdX
 */
export class DYDXBot extends Bot {

    public client?: CompositeClient;
    private network: Network;

    public subaccount?: SubaccountClient;
    public wallet?: LocalWallet;

    private SUBACCOUNT_NUMBER = 0;

    constructor(network: Network) {
        super();
        this.network = network;
    }

    /**
     * @see Bot
     */
    async connect(): Promise<string> {

        // Broker config
        const brokerConfig: BrokerConfig = await this.getBrokerConfig("BOT_DYDX");

        // DYDX Client
        this.client = await CompositeClient.connect(this.network);

        // Wallet
        let walletMnemonic: string;
        if(this.network.getString() === Bot.NETWORK_MAINNET) {
            walletMnemonic = brokerConfig.MAINNET_MNEMONIC;
        } else if(this.network.getString() === Bot.NETWORK_TESTNET) {
            walletMnemonic = brokerConfig.TESTNET_MNEMONIC;
        } else  { 
            throw new Error("Network not defined");
        }
        this.wallet = await LocalWallet.fromMnemonic(walletMnemonic, BECH32_PREFIX);
        this.subaccount = new SubaccountClient(this.wallet, this.SUBACCOUNT_NUMBER);
        
        // Connect to discord
        await this.discord.login(brokerConfig.DISCORD_TOKEN,this.subaccount.address,this.SUBACCOUNT_NUMBER);

        return this.subaccount.address;

    }

    /**
     * @see Bot
     */
    async disconnect(): Promise<void> {
        await this.discord.logout();
    }

    /**
     * @see Bot
     */
    async closePosition(market: string, hasToBeSide?: OrderSide, refPrice?: number, refPriceRoundingFactor?: number): Promise<{tx: TxResponse,position: Position}> {

        if(this.client === undefined) throw new Error("Client not initialized");
        if(this.subaccount === undefined) throw new Error("Subaccount not initialized");

        // Check if position is open
        const position: Position | undefined = await this.client.indexerClient.account.getSubaccountPerpetualPositions(this.subaccount.address, this.SUBACCOUNT_NUMBER).then((result) => {
            return result.positions.find((position: Position) => position.market === market && position.status === "OPEN");
        });
        if(position === undefined) throw new Warning(`Trying to close a positon that does not exist on ${market}`);

        // Check if position side is correct
        if(hasToBeSide !== undefined && position.side !== (hasToBeSide === OrderSide.BUY ? Bot.SIDE_LONG : Bot.SIDE_SHORT)) throw new Error(`Trying to close a positon on ${market} but the position is already on the target side (${position.side})`);

        // Closing order
        const closingOrder: BotOrder = new BotOrder();
        closingOrder.market = market;
        closingOrder.clientId = Date.now();
        
        if(position.side === Bot.SIDE_LONG){
            closingOrder.size = position.size;
            closingOrder.side = OrderSide.SELL;
        } 
        else if(position.side === Bot.SIDE_SHORT) {
            closingOrder.size = -position.size; // for short position, size is negative
            closingOrder.side = OrderSide.BUY;
        }

        // Use a limit order to close the position if a reference price is provided
        if(refPrice !== undefined) {
            closingOrder.type = OrderType.LIMIT;

            // Limit closing price
            let closingPrice = (closingOrder.side === OrderSide.BUY ? refPrice*1.5 : refPrice*0.75);
            if(refPriceRoundingFactor !== undefined) closingPrice = Math.round(closingPrice*refPriceRoundingFactor)/refPriceRoundingFactor;

            closingOrder.price = closingPrice;
            closingOrder.goodTillTime = 3600;
            closingOrder.timeInForce = OrderTimeInForce.GTT;
        }
        // Use a market order to close the position if no reference price is provided
        else {
            closingOrder.type = OrderType.MARKET;
            closingOrder.timeInForce = OrderTimeInForce.FOK;
            closingOrder.reduceOnly = true;
        }

        // Send closing order
        const tx: TxResponse = await this.placeOrder(closingOrder);

        return {tx,position};
    }

    /**
     * @see Bot
     */
    async placeOrder(order: BotOrder): Promise<TxResponse> {

        if(this.client === undefined) throw new Error("Client not initialized");
        if(this.subaccount === undefined) throw new Error("Subaccount not initialized");

        const tx = this.client.placeOrder(
          this.subaccount,
          order.market,
          order.type,
          order.side,
          order.price,
          order.size,
          order.clientId,
          order.timeInForce,
          order.goodTillTime,
          order.execution,
          order.postOnly,
          order.reduceOnly,
          order.triggerPrice
        );

        return tx;

    }

    /**
     * @see Bot
     */
    async cancelOrdersForMarket(market: string, clientId: number): Promise<TxResponse> {

        if(this.client === undefined) throw new Error("Client not initialized");
        if(this.subaccount === undefined) throw new Error("Subaccount not initialized");

        const tx = this.client.cancelOrder(
            this.subaccount,
            clientId,
            OrderFlags.LONG_TERM,
            market,
            0,
            3600
        );

        return tx;

    }

}
