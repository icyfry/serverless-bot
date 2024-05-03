import { BECH32_PREFIX,CompositeClient, LocalWallet, Network, OrderFlags, OrderSide, OrderTimeInForce, OrderType, SubaccountClient } from "@dydxprotocol/v4-client-js";
import { BotOrder, Bot, BrokerConfig } from "../bot";
import { BroadcastTxAsyncResponse, BroadcastTxSyncResponse } from '@cosmjs/tendermint-rpc/build/tendermint37';
import { IndexedTx} from '@cosmjs/stargate';

export interface Position {
    market: string,
    status: string,
    side: string,
    size: number,
    maxSize: number,
    entryPrice: number,
    exitPrice: number,
    realizedPnl: number,
    unrealizedPnl: number,
    createdAt: Date,
    createdAtHeight: number,
    closedAt: Date,
    sumOpen: number,
    sumClose: number,
    netFunding: number
}

export type TxResponse = BroadcastTxAsyncResponse | BroadcastTxSyncResponse | IndexedTx;

export class DYDXBot extends Bot {

    public client?: CompositeClient;
    private network: Network;

    public subaccount?: SubaccountClient;
    public wallet?: LocalWallet;

    private SUBACCOUNT_NUMBER: number = 0;

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

        // Connect to discord
        await this.discord.login(brokerConfig.DISCORD_TOKEN);

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
    async closePosition(market: string, hasToBeSide?: OrderSide, refPrice?: number): Promise<{tx: TxResponse,position: Position}> {

        if(this.client === undefined) throw new Error("Client not initialized");
        if(this.subaccount === undefined) throw new Error("Subaccount not initialized");

        // Check if position is open and on the right side
        const position: Position | undefined = await this.client.indexerClient.account.getSubaccountPerpetualPositions(this.subaccount.address, this.SUBACCOUNT_NUMBER).then((result) => {
            return result.positions.find((position: Position) => position.market === market && position.status === "OPEN");
        });
        if(position === undefined) throw new Error(`did not close : no position on ${market}`);

        // Check hasToBeSide
        if(hasToBeSide !== undefined && position.side !== (hasToBeSide === OrderSide.BUY ? Bot.SIDE_LONG : Bot.SIDE_SHORT)) throw new Error(`did not close : position is not ${hasToBeSide}`);

        // Market close order
        const closingOrder: BotOrder = new BotOrder();
        closingOrder.market = market;
        if(position.side === Bot.SIDE_LONG) closingOrder.side = OrderSide.SELL;
        else if(position.side === Bot.SIDE_SHORT) closingOrder.side = OrderSide.BUY;
        closingOrder.size = position.size;
        if(refPrice !== undefined) {
            closingOrder.type = OrderType.LIMIT;
            closingOrder.price = (closingOrder.side === OrderSide.BUY ? refPrice*1.5 : refPrice*0.75);
            closingOrder.goodTillTime = 120;
            closingOrder.timeInForce = OrderTimeInForce.IOC;
        }
        else {
            closingOrder.type = OrderType.MARKET;
            closingOrder.timeInForce = OrderTimeInForce.FOK;
        }
        closingOrder.clientId = Date.now();
        closingOrder.reduceOnly = true;

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
