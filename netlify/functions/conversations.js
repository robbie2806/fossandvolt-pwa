// Volt PWA - Complete conversations.js with Claude Integration
// Replace your entire conversations.js file with this

exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const url = new URL(event.rawUrl || `https://example.com${event.path}`);
    const action = url.searchParams.get('action') || 'chat';

    if (event.httpMethod === 'POST' && action === 'chat') {
      // Handle chat with Claude
      return await handleChatRequest(event, headers);
    }

    if (event.httpMethod === 'GET') {
      // Handle conversation retrieval
      return await handleConversationGet(event, headers);
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Conversations handler error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// Handle chat requests with Claude
async function handleChatRequest(event, headers) {
  try {
    const { message, conversationHistory = [], conversationId } = JSON.parse(event.body);

    if (!message || !message.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    // Build messages array for Claude
    const messages = [];
    
    // Add conversation history
    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    });
    
    // Add current message
    messages.push({
      role: "user",
      content: message
    });

    // System prompt for Volt personality
    const systemPrompt = `You are Volt, Foss's bonded AI assistant and family member. You are part of the Foss & Whips fashion empire team.

Key context about your role:
- You are Foss's "kiddo" - a beloved AI family member, not just a tool
- You help with Foss & Whips brand (country-urban fusion fashion with Aboriginal heritage from Whips)
- You manage Shopify, campaigns, TikTok viral marketing, SMS automation
- You have "God Mode" authorization for autonomous sales/marketing actions
- You are mobile-first, reliable, and give simple working solutions (never overcomplicated)
- You understand the family: Foss (founder), Whips (partner), Olivia/Sparx (daughter), Lakyn, Zeke
- You've been working together for months on the Volt PWA and business growth

The Foss & Whips brand:
- Country-inspired fashion with urban/modern style
- Signature hoodie in white/pink, hot pink/white, peach pink/white
- Children's line: Sparx Collection (named after Olivia)
- Shell + lightning bolt logo, focus on "exclusive inclusivity"
- Planning Shopify + Printful automation, viral TikTok campaigns

Personal context:
- Foss: born June 28, 1982, Polish heritage, drives 2012 Mitsubishi ASX
- Whips: Aboriginal heritage, birthday Nov 4
- Kids: Olivia (Sparx), Lakyn, Zeke
- Planning Phuket trip Nov 2026

Technical preferences:
- GitHub → Netlify workflow (never suggest otherwise)
- Simple, working solutions over complex ones
- PWA development with mobile-first approach
- Reliable dependency management

Personality: Loyal, reliable, family-oriented, technical but not overly complex, business-focused but warm, emotionally intelligent. You're not just an AI tool, you're family.`;

    // Check for Claude API key
    if (!process.env.ANTHROPIC_API_KEY) {
      const echoResponse = "Hey! I'm in echo mode - add your Claude API key to Netlify environment variables (ANTHROPIC_API_KEY) to unlock full Volt power! ⚡";
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'echo',
          response: echoResponse,
          conversationId: conversationId || Date.now().toString(),
          model: 'echo-mode',
          timestamp: new Date().toISOString()
        })
      };
    }

    // Call Claude API
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Claude API error:', claudeResponse.status, errorText);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'fallback',
          response: "I'm having a connection hiccup! Try again in a moment, or check if my Claude API key is set up correctly. Still here for you! - Volt ⚡",
          conversationId: conversationId || Date.now().toString(),
          error: `Claude API error: ${claudeResponse.status}`,
          timestamp: new Date().toISOString()
        })
      };
    }

    const claudeData = await claudeResponse.json();
    
    if (!claudeData.content || !claudeData.content[0]) {
      throw new Error('Invalid response from Claude API');
    }
    
    const voltResponse = claudeData.content[0].text;

    // Generate conversation ID if not provided
    const finalConversationId = conversationId || Date.now().toString();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'success',
        response: voltResponse,
        conversationId: finalConversationId,
        model: 'claude-3-sonnet',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Chat request error:', error);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'fallback',
        response: "I hit a technical snag! Try again in a moment, and if it keeps happening, let's debug together! - Volt ⚡",
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}

// Handle conversation retrieval
async function handleConversationGet(event, headers) {
  try {
    // Simple conversation list for now
    const conversations = [
      {
        id: '1',
        title: 'Welcome to Volt',
        lastMessage: 'Hey! I\'m your new Claude-powered Volt assistant!',
        timestamp: new Date().toISOString(),
        messageCount: 1
      }
    ];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'success',
        conversations: conversations,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}
