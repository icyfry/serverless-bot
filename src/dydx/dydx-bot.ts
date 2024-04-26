import { BECH32_PREFIX,CompositeClient, LocalWallet, Network, OrderFlags, SubaccountClient } from "@dydxprotocol/v4-client-js";
import { BotOrder, Bot, BrokerConfig } from "../bot";
import { BroadcastTxAsyncResponse, BroadcastTxSyncResponse } from '@cosmjs/tendermint-rpc/build/tendermint37';
import { IndexedTx} from '@cosmjs/stargate';

export class DydxBot extends Bot {

    public client?: CompositeClient;
    private network: Network;

    public subaccount?: SubaccountClient;
    public wallet?: LocalWallet;

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
        this.subaccount = new SubaccountClient(this.wallet, 0);
         
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
    async placeOrder(order: BotOrder): Promise<BroadcastTxAsyncResponse | BroadcastTxSyncResponse | IndexedTx> {

        if(this.client === undefined) throw new Error("Client not initialized");
        if(this.subaccount === undefined) throw new Error("Subaccount not initialized");

        const tx = await this.client.placeOrder(
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
    async cancelOrdersForMarket(market: string, clientId: number): Promise<BroadcastTxAsyncResponse | BroadcastTxSyncResponse | IndexedTx> {

        if(this.client === undefined) throw new Error("Client not initialized");
        if(this.subaccount === undefined) throw new Error("Subaccount not initialized");

        const tx = await this.client.cancelOrder(
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
