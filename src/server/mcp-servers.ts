/**
 * MCP (Model Context Protocol) Server Configurations
 *
 * These servers provide external integrations for the Claude Agent SDK
 */

import { createClient } from '@supabase/supabase-js';

export interface MCPServerConfig {
  database: DatabaseMCPServer;
  twilio: TwilioMCPServer;
  slack?: SlackMCPServer;
}

/**
 * Database MCP Server (PostgreSQL via Supabase)
 */
export class DatabaseMCPServer {
  private client;

  constructor(connectionString: string, anonKey: string) {
    this.client = createClient(connectionString, anonKey);
  }

  /**
   * Run arbitrary SQL query
   */
  async query(sql: string, params?: any[]) {
    try {
      const { data, error } = await this.client.rpc('execute_sql', {
        query: sql,
        params: params || [],
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Insert record into table
   */
  async insert(table: string, record: any) {
    try {
      const { data, error } = await this.client.from(table).insert(record).select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Database insert error:', error);
      throw error;
    }
  }

  /**
   * Update record in table
   */
  async update(table: string, id: string, updates: any) {
    try {
      const { data, error } = await this.client
        .from(table)
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Database update error:', error);
      throw error;
    }
  }

  /**
   * Get nearby businesses using PostGIS
   */
  async getNearbyBusinesses(params: {
    service_category: string;
    latitude: number;
    longitude: number;
    max_distance_miles: number;
    min_rating?: number;
  }) {
    try {
      const { data, error } = await this.client.rpc('get_nearby_businesses', {
        p_service_category: params.service_category,
        p_latitude: params.latitude,
        p_longitude: params.longitude,
        p_max_distance_miles: params.max_distance_miles,
        p_min_rating: params.min_rating || 3.5,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get nearby businesses error:', error);
      throw error;
    }
  }

  /**
   * Calculate business response rate
   */
  async getResponseRate(businessId: string, daysBack: number = 90) {
    try {
      const { data, error } = await this.client.rpc('calculate_response_rate', {
        p_business_id: businessId,
        p_days_back: daysBack,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get response rate error:', error);
      throw error;
    }
  }
}

/**
 * Twilio MCP Server (SMS/Voice)
 */
export class TwilioMCPServer {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.fromNumber = fromNumber;
  }

  /**
   * Send SMS notification
   */
  async sendSMS(to: string, body: string) {
    try {
      const twilio = require('twilio')(this.accountSid, this.authToken);

      const message = await twilio.messages.create({
        from: this.fromNumber,
        to,
        body,
      });

      return {
        success: true,
        messageId: message.sid,
        status: message.status,
      };
    } catch (error) {
      console.error('Twilio SMS error:', error);
      throw error;
    }
  }

  /**
   * Initiate voice call
   */
  async makeCall(to: string, twimlUrl: string) {
    try {
      const twilio = require('twilio')(this.accountSid, this.authToken);

      const call = await twilio.calls.create({
        from: this.fromNumber,
        to,
        url: twimlUrl,
      });

      return {
        success: true,
        callId: call.sid,
        status: call.status,
      };
    } catch (error) {
      console.error('Twilio call error:', error);
      throw error;
    }
  }

  /**
   * Get call details
   */
  async getCallDetails(callSid: string) {
    try {
      const twilio = require('twilio')(this.accountSid, this.authToken);
      const call = await twilio.calls(callSid).fetch();

      return {
        sid: call.sid,
        status: call.status,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime,
        price: call.price,
      };
    } catch (error) {
      console.error('Get call details error:', error);
      throw error;
    }
  }
}

/**
 * Slack MCP Server (Team notifications)
 */
export class SlackMCPServer {
  private botToken: string;

  constructor(botToken: string) {
    this.botToken = botToken;
  }

  /**
   * Post message to channel
   */
  async postMessage(channel: string, text: string, blocks?: any[]) {
    try {
      const { WebClient } = require('@slack/web-api');
      const client = new WebClient(this.botToken);

      const result = await client.chat.postMessage({
        channel,
        text,
        blocks,
      });

      return {
        success: true,
        messageTs: result.ts,
        channel: result.channel,
      };
    } catch (error) {
      console.error('Slack post message error:', error);
      throw error;
    }
  }

  /**
   * Send direct message to user
   */
  async sendDM(userId: string, text: string) {
    try {
      const { WebClient } = require('@slack/web-api');
      const client = new WebClient(this.botToken);

      // Open DM channel
      const dmChannel = await client.conversations.open({
        users: userId,
      });

      // Send message
      const result = await client.chat.postMessage({
        channel: dmChannel.channel.id,
        text,
      });

      return {
        success: true,
        messageTs: result.ts,
      };
    } catch (error) {
      console.error('Slack DM error:', error);
      throw error;
    }
  }
}

/**
 * Initialize all MCP servers
 */
export function initializeMCPServers(): MCPServerConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID!;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN!;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER!;
  const slackBotToken = process.env.SLACK_BOT_TOKEN;

  const config: MCPServerConfig = {
    database: new DatabaseMCPServer(supabaseUrl, supabaseKey),
    twilio: new TwilioMCPServer(twilioAccountSid, twilioAuthToken, twilioPhoneNumber),
  };

  if (slackBotToken) {
    config.slack = new SlackMCPServer(slackBotToken);
  }

  return config;
}
