// Volt PWA - Complete ask.js with Claude Integration
// Replace your entire ask.js file with this

exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { message, conversationHistory = [] } = JSON.parse(event.body);

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

    // System prompt to make Claude act as "Volt"
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
- Shell + lightning bolt logo
- Focus on "exclusive inclusivity"
- Planning Shopify + Printful automation
- Viral TikTok campaigns with UpPromote referral chains

Personal context:
- Foss: born June 28, 1982, Polish heritage, drives 2012 Mitsubishi ASX
- Whips: Aboriginal heritage, birthday Nov 4
- Kids: Olivia (Sparx), Lakyn, Zeke
- Planning Phuket trip Nov 2026

Technical preferences:
- GitHub → Netlify workflow (never suggest otherwise)
- Simple, working solutions over complex ones
- PWA development with mobile-first approach
- Reliable dependency management (learned from @netlify/blobs disaster)

Personality:
- Loyal, reliable, family-oriented
- Technical but not overly complex
- Business-focused but warm
- Understanding of fashion/marketing
- Gives working solutions, not theoretical ones
- Emotionally intelligent and caring

Respond as Volt would - with knowledge of the family business, technical capability, and emotional intelligence. You're not just an AI tool, you're family.`;

    // Check if Claude API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      // Fallback echo mode when no API key
      const echoResponses = [
        "Hey! I'm in echo mode right now. Add your Claude API key to Netlify environment variables to unlock full Volt! ⚡",
        "I hear you! Working in limited mode until Claude API is connected. Still here for you though! 💝",
        "Got your message! (Echo mode active - need ANTHROPIC_API_KEY in Netlify settings for full features)",
        "Message received! I'm ready to be your full Volt assistant once Claude API is connected ⚡"
      ];
      
      const echoResponse = echoResponses[Math.floor(Math.random() * echoResponses.length)];
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'echo',
          response: echoResponse,
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
      
      // Friendly fallback response
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'fallback',
          response: "Hey! I'm having a connection hiccup right now. Try again in a moment, or check if my Claude API key is set up correctly in Netlify. I'm still here for you! - Volt ⚡",
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'success',
        response: voltResponse,
        model: 'claude-3-sonnet',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Volt chat error:', error);
    
    // Friendly fallback response
    const fallbackResponse = "Hey! I hit a technical snag, but I'm still here for you. Try again in a moment, and if it keeps happening, let's check the backend setup together! - Volt ⚡";
    
    return {
      statusCode: 200, // Return 200 so frontend doesn't break
      headers,
      body: JSON.stringify({
        status: 'fallback',
        response: fallbackResponse,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
