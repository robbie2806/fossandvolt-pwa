// Super Simple Memory Function (No Dependencies)
// Uses the older Netlify Functions format for maximum compatibility

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json"
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Simple in-memory storage (resets on function restart)
    const storage = {
      conversations: [],
      contextSummary: '',
      memoryBank: '',
      stats: { totalConversations: 0 }
    };

    if (event.httpMethod === 'GET') {
      // Check if it's a generate-context request
      if (event.queryStringParameters && event.queryStringParameters.action === 'generate-context') {
        const context = generateContextPrompt(storage);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'success',
            data: { context }
          })
        };
      }

      // Default GET - return storage overview
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'success',
          data: storage
        })
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      
      switch (body.type) {
        case 'context-summary':
          storage.contextSummary = body.content;
          break;
          
        case 'memory-bank':
          storage.memoryBank = body.content;
          break;
          
        case 'conversation':
          const conversation = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            title: body.title || 'Untitled',
            content: body.content || '',
            category: body.category || 'general',
            importance: body.importance || 'medium'
          };
          storage.conversations.push(conversation);
          storage.stats.totalConversations = storage.conversations.length;
          break;
          
        default:
          throw new Error('Unknown type: ' + body.type);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'success',
          message: 'Saved successfully',
          data: storage
        })
      };
    }

    // Method not allowed
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: 'Method not allowed'
      })
    };

  } catch (error) {
    console.error('Memory function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: error.message
      })
    };
  }
};

// Generate context prompt for ChatGPT
function generateContextPrompt(storage) {
  let prompt = "=== CONTEXT RESTORATION FOR CHATGPT ===\\n\\n";
  
  if (storage.contextSummary) {
    prompt += "RELATIONSHIP SUMMARY:\\n";
    prompt += storage.contextSummary + "\\n\\n";
  }
  
  if (storage.memoryBank) {
    prompt += "PERSISTENT MEMORY BANK:\\n";
    prompt += storage.memoryBank + "\\n\\n";
  }
  
  if (storage.conversations.length > 0) {
    prompt += "RECENT CONVERSATIONS:\\n";
    storage.conversations.slice(-3).forEach((conv, index) => {
      prompt += `${index + 1}. [${conv.timestamp.split('T')[0]}] ${conv.title}\\n`;
      prompt += `   ${conv.content.substring(0, 150)}...\\n\\n`;
    });
  }
  
  prompt += "Please acknowledge this context and continue our conversation as if no reset occurred.";
  
  return prompt;
}
