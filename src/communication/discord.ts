import { Client, ColorResolvable, EmbedBuilder, GatewayIntentBits, Message, TextChannel } from "discord.js";
import { BotOrder, Position, Input, Output, Warning, Bot } from "../bot";
import { OrderSide, OrderType } from "@dydxprotocol/v4-client-js";
import { Strat } from "../strategy/strat";
import { BroadcastTxAsyncResponse, BroadcastTxSyncResponse } from "@cosmjs/tendermint-rpc";
import { IndexedTx } from "@cosmjs/stargate";
import { Context } from "aws-lambda";

// Transaction response
type TxResponse = BroadcastTxAsyncResponse | BroadcastTxSyncResponse | IndexedTx;

/**
 * Discord interactions
 */
export class Discord {

    public client?: Client;
    public channel?: TextChannel;

    public prefix = ""; // global prefix for all messages
    private context?: Context; // AWS Context

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

    /**
     * Get the Chaoslabs url of the account
     */
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

        // Login to discord
        this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
        await this.client.login(token);
        this.channel = (await this.client.channels.fetch(process.env.BOT_DISCORD_CHANNEL_ID as string)) as TextChannel;

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
     * Set the AWS context (to display in the messages)
     */
    public setAWSContext(context: Context) {
        this.context = context;
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
     * Send a debug message
     */
    public sendDebug(message: string): Promise<Message> {
        return this.sendMessage(`⚙️ ${message}`);
    }

    /**
     * Send a error message
     */
    public sendError(message: Error): Promise<Message> {
        if(message instanceof Warning) return this.sendMessage(`⚠️ ${message} (${this.context?.logStreamName})`);
        else return this.sendMessage(`❌ ${message} (${this.context?.logStreamName})`);
    }

    /**
     * Send an embed message
     */
    public sendEmbedMessage(embed: EmbedBuilder): Promise<Message> {
        if(this.channel === undefined) throw new Error("Channel not initialized");
        if(!this.client?.isReady) throw new Error("Client not ready");
        return this.channel.send({ embeds: [embed] });
    }
    
    /**
     * Send a message when a position is closed
     */
    public sendMessageClosePosition(input: Input, order:BotOrder, position: Position, tx?: TxResponse): Promise<Message> {

        if(process.env.BOT_DEBUG === "true") this.sendDebug(`POSITION: ${JSON.stringify(position, null, 2)}`)

        let color: ColorResolvable = 0x000000;
        if (position.side === Bot.SIDE_LONG) {
            color = 0x00FF7F;
        } else if (position.side === Bot.SIDE_SHORT) {
            color = 0xFF0000;
        }
        
        const embed = new EmbedBuilder()
        .setTitle(`${input.market}`)
        .setColor(color)
        .setTimestamp();
        
        if(this.address !== undefined && this.subAccount !== undefined) {
            embed.setURL(this.getChaoslabsUrl(this.address,this.subAccount))
        }

        const pnl: number = Math.round((+position.realizedPnl + +position.unrealizedPnl)*100)/100;
        embed.addFields({ name: `in/out`, value: `${position.entryPrice}/${input.price}`, inline: true });
        embed.addFields({ name: `size`, value: `${Math.abs(position.size)}`, inline: true });
        embed.addFields({ name: `logs`, value: `${this.context?.logStreamName}`, inline: true });
        
        // Performance
        const perf = Math.round((pnl/(position.sumOpen * position.entryPrice))*10000)/10000;
        let perfIcon: string;
        if(perf > -0.01 && perf < 0.01) {
            perfIcon = "💤";
        }else if(perf <= -0.05) {
            perfIcon = "😡";
        }else if(perf <= -0.01) {
            perfIcon = "🫣";
        }else if(perf >= 0.05) {
            perfIcon = "🚀";
        }else if(perf >= 0.01) {
            perfIcon = "🙂";
        }else {
            perfIcon = "🤔";
        }

        embed.setDescription(`${perfIcon} Close ${order.type} ${position.side} position with profit of **${perf*100}**% (**${pnl}**$)`);

        if (tx !== undefined) embed.addFields(this.getTxEmbedField(tx));

        return this.sendEmbedMessage(embed);

    }

    /**
     * Send a message when an order is placed
     */
    public sendMessageOrder(order: BotOrder, input?: Input, strategy?: Strat, tx?: TxResponse): Promise<Message> {
        
        // Color of the embed
        let color: ColorResolvable;
        let description: string;

        // size in USD
        const usdSize = Math.round((order.price*order.size)*100)/100;

        // Description and color
        if(order.type === OrderType.STOP_MARKET) {
            description = `Stop ${order.side} at ${order.triggerPrice}$`;
            color = 0xCCCCCC;
        }
        else {
            description = `${order.side} **${order.size}** ${order.market} at ${order.type} **${order.price}**$ (${usdSize}$)`;
            if (order.side == OrderSide.BUY) {
                color = 0x00FF7F;
            } else if (order.side == OrderSide.SELL) {
                color = 0xFF0000;
            } else {
                color = 0x000000;
            }
        }

        const embed = new EmbedBuilder()
        .setTitle(`${order.market}`)
        .setColor(color)
        .setDescription(`${description}\nCurrent price is ${input?.price}$`)
        .setTimestamp()
        .addFields({ name: `ttl`, value: `${order.goodTillTime/60} min`, inline: true });

        if(this.address !== undefined && this.subAccount !== undefined) {
            embed.setURL(this.getChaoslabsUrl(this.address,this.subAccount))
        }

        if (input !== undefined) embed.addFields({ name: `source`, value: `${input.source}`, inline: true });

        if (tx !== undefined) embed.addFields(this.getTxEmbedField(tx));
        
        return this.sendEmbedMessage(embed);
        
    }

    /**
     * Send a message describing an output
     */
    public sendMessageOutput(output: Output): Promise<Message> {
        const message = output.toString();
        return this.sendMessage(message);
    }

}
