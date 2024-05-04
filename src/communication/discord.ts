import { Client, ColorResolvable, EmbedBuilder, GatewayIntentBits, Message, TextChannel } from "discord.js";
import { BotOrder, Position, Input, Output, Warning } from "../bot";
import { OrderSide } from "@dydxprotocol/v4-client-js";
import { Strat } from "../strategy/strat";
import { BroadcastTxAsyncResponse, BroadcastTxSyncResponse } from "@cosmjs/tendermint-rpc";
import { IndexedTx } from "@cosmjs/stargate";

// Transaction response
type TxResponse = BroadcastTxAsyncResponse | BroadcastTxSyncResponse | IndexedTx;

/**
 * Discord interactions
 */
export class Discord {

    public client?: Client;
    public channel?: TextChannel;
    public prefix = ""; // global prefix for all messages

    // Bot reference
    public address?: string;
    public subAccount?: number;

    constructor(prefix?: string) {
        if(prefix !== undefined) this.prefix = prefix;

    }

    /**
     * Get the tx embed field
     */
    private getTxEmbedField(tx: TxResponse): {name: string, value: string, inline: boolean} {
        let hash: string;
        if (tx?.hash instanceof Uint8Array) {
            hash = Buffer.from(tx?.hash).toString('hex');
        }
        else {
            hash = tx?.hash;
        }
        hash = hash.substring(0, 7) + "...";
        return { name: `tx`, value: `${hash}`, inline: true };
    }

    private getChaoslabsUrl(address: string,subAccount: number): string {
        return `https://community.chaoslabs.xyz/dydx-v4/risk/accounts/${address}/subAccount/${subAccount}/overview`;
    }

    /**
     * Connect to discord
     * @param token discord token
     */
    public async login(token: string, address?: string, subAccount?: number) {

        // Bot reference
        this.address = address;
        this.subAccount = subAccount;

        this.client = new Client({ intents: [GatewayIntentBits.Guilds] });

        // Login to discord
        await this.client.login(token);
        this.channel = (await this.client.channels.fetch(process.env.DISCORD_CHANNEL_ID as string)) as TextChannel;

    }

    /**
     * Disconnect from discord
     */
    public async logout(): Promise<void> {
        if(this.client === undefined) throw new Error("Client not initialized");
        this.client.removeAllListeners();
        await this.client.destroy();
    }

    /**
     * Send a basic text message
     */
    public sendMessage(message: string): Promise<Message> {
        if(this.channel === undefined) throw new Error("Channel not initialized");
        if(!this.client?.isReady) throw new Error("Client not ready");
        return this.channel.send(this.prefix + message);
    }

    /**
     * Send an embed message
     */
    public sendEmbedMessage(embed: EmbedBuilder): Promise<Message> {
        if(this.channel === undefined) throw new Error("Channel not initialized");
        if(!this.client?.isReady) throw new Error("Client not ready");
        return this.channel.send({ embeds: [embed] });
    }
    
    public sendMessageClosePosition(market: string, position: Position, tx?: TxResponse): Promise<Message> {

        const embed = new EmbedBuilder()
        .setTitle(`${market}`)
        .setColor(0x404040)
        .setTimestamp();

        if(this.address !== undefined && this.subAccount !== undefined) {
            embed.setURL(this.getChaoslabsUrl(this.address,this.subAccount))
            //.setAuthor({ name: `${this.address}`})
        }

        const pnl: number = +position.realizedPnl + +position.unrealizedPnl;
        embed.addFields({ name: `pnl`, value: `${pnl}`, inline: true });
        embed.addFields({ name: `size`, value: `${position.size}`, inline: true });

        // Performance at close
        const perf = Math.round((pnl/(position.sumOpen * position.entryPrice))*100)/100;
        let perfIcon: string;
        if(perf > -0.02 && perf < 0.02) {
            perfIcon = "😑";
        }else if(perf >= 0.1) {
            perfIcon = "🚀";
        }else if(perf <= -0.05) {
            perfIcon = "😡";
        }else {
            perfIcon = "😐";
        }

        embed.setDescription(`${perfIcon} Close position at ${perf*100}%`);

        if (tx !== undefined) embed.addFields(this.getTxEmbedField(tx));

        return this.sendEmbedMessage(embed);

    }

    public sendMessageOrder(order: BotOrder, input?: Input, strategy?: Strat, tx?: TxResponse): Promise<Message> {
        
        // Color of the embed
        let color: ColorResolvable;
        if (order.side == OrderSide.BUY) {
            color = 0x00FF7F;
        } else if (order.side == OrderSide.SELL) {
            color = 0xFF0000;
        } else {
            color = 0x000000;
        }

        // size in USD
        const usdSize = Math.round((order.price*order.size)*100)/100;

        const embed = new EmbedBuilder()
        .setTitle(`${order.market}`)
        .setColor(color)
        .setDescription(`${order.side} **${order.size}** ${order.market} at limit **${order.price}**$ (${usdSize}$)\nCurrent price is ${input?.price}$`)
        .setTimestamp();

        embed.addFields({ name: `interval`, value: `${order.goodTillTime/60} min`, inline: true });

        if(this.address !== undefined && this.subAccount !== undefined) {
            embed.setURL(this.getChaoslabsUrl(this.address,this.subAccount))
            //.setAuthor({ name: `${this.address}`})
        }

        if (input !== undefined) embed.addFields({ name: `source`, value: `${input.source}`, inline: true });

        if (tx !== undefined) embed.addFields(this.getTxEmbedField(tx));
        
        return this.sendEmbedMessage(embed);
        
    }

    public sendMessageOutput(output: Output): Promise<Message> {
        const message = output.toString();
        return this.sendMessage(message);
    }

    public sendError(message: Error): Promise<Message> {
        if(message instanceof Warning) return this.sendMessage("⚠️ "+message);
        else return this.sendMessage("❌ "+message);
    }

}
