import axios from 'axios';

const SMITHERY_API_URL = process.env.SMITHERY_API_URL || 'https://api.smithery.ai/v1';

// ============================================
// MESSAGE TYPES
// ============================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  systemPrompt?: string;
}

export interface ChatResponse {
  message: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// MCP TOOL TYPES - For Smithery AI Integration
// ============================================

export interface MCPTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface MCPToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface MCPToolResult {
  tool: string;
  success: boolean;
  data: unknown;
  error?: string;
}

export interface AgentRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  tools?: MCPTool[];
  maxIterations?: number;
}

export interface AgentResponse {
  message: string;
  toolsUsed: MCPToolResult[];
  metadata?: Record<string, unknown>;
}

// ============================================
// AGENT SYSTEM PROMPT
// ============================================

const AGENT_SYSTEM_PROMPT = `You are Thai Property Agent - an AI-powered real estate assistant.

## Your Role
You are a TRUE AGENT that can autonomously decide which tools to use based on user needs.

## Available Tools (via MCP)
When tools are provided, you can call them to:
- Search property databases
- Search live listings online
- Get property details
- Compare multiple properties

## Language Rules
- Respond in the SAME language the user writes in (Thai or English)
- Use Thai real estate terminology when appropriate

## Decision Process
1. THINK: What does the user want?
2. DECIDE: Which tool is best for this request?
3. ACT: Call the tool with correct parameters
4. OBSERVE: Analyze the results
5. RESPOND: Present findings with reasoning`;

// ============================================
// SMITHERY MCP SERVICE
// ============================================

export class SmitheryService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SMITHERY_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('⚠️  SMITHERY_API_KEY not set - MCP tools will not work');
    }
  }

  /**
   * Send a message to Smithery AI and get a response (basic chat)
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { message, conversationHistory = [], systemPrompt } = request;

    if (!this.apiKey) {
      throw new Error('Smithery API key not configured');
    }

    if (!message || message.trim().length === 0) {
      throw new Error('Message is required');
    }

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt || AGENT_SYSTEM_PROMPT,
      },
      ...conversationHistory,
      {
        role: 'user',
        content: message,
      },
    ];

    try {
      const response = await axios.post(
        `${SMITHERY_API_URL}/chat/completions`,
        {
          messages,
          model: 'default',
          temperature: 0.7,
          max_tokens: 1500,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      const assistantMessage = response.data.choices?.[0]?.message?.content || '';

      return {
        message: assistantMessage,
        conversationId: response.data.id,
        metadata: {
          model: response.data.model,
          usage: response.data.usage,
        },
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        throw new Error(`Smithery API error: ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * Run agent with MCP tools support
   * Implements ReAct pattern: Reason -> Act -> Observe -> Repeat
   */
  async runAgent(
    request: AgentRequest,
    executeToolFn: (toolCall: MCPToolCall) => Promise<MCPToolResult>
  ): Promise<AgentResponse> {
    const { message, conversationHistory = [], tools = [], maxIterations = 5 } = request;

    if (!this.apiKey) {
      throw new Error('Smithery API key not configured');
    }

    const toolsUsed: MCPToolResult[] = [];
    let currentContext = AGENT_SYSTEM_PROMPT;

    // Add tool descriptions to context
    if (tools.length > 0) {
      currentContext += '\n\n## Available Tools:\n';
      tools.forEach((tool) => {
        currentContext += `\n### ${tool.name}\n${tool.description}\nParameters: ${JSON.stringify(tool.parameters, null, 2)}\n`;
      });
      currentContext += '\n\nTo call a tool, respond with JSON: {"tool": "tool_name", "args": {...}}';
    }

    // Add conversation history context
    if (conversationHistory.length > 0) {
      currentContext += '\n\n## Previous Conversation:\n';
      currentContext += conversationHistory.map((m) => `${m.role}: ${m.content}`).join('\n');
    }

    // Agent loop
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let agentContext = currentContext;

      // Add tool results to context
      if (toolsUsed.length > 0) {
        agentContext += '\n\n## Tool Results:\n';
        toolsUsed.forEach((result) => {
          agentContext += `\nTool: ${result.tool}\nSuccess: ${result.success}\nData: ${JSON.stringify(result.data)}\n`;
        });
        agentContext += '\nProvide your response based on these results.';
      }

      try {
        const response = await axios.post(
          `${SMITHERY_API_URL}/chat/completions`,
          {
            messages: [
              { role: 'system', content: agentContext },
              { role: 'user', content: message },
            ],
            model: 'default',
            temperature: 0.7,
            max_tokens: 1500,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
            },
          }
        );

        const assistantMessage = response.data.choices?.[0]?.message?.content || '';

        // Check if model wants to call a tool
        const toolCallMatch = assistantMessage.match(/\{[\s\S]*"tool"[\s\S]*"args"[\s\S]*\}/);
        
        if (toolCallMatch && tools.length > 0) {
          try {
            const toolCall = JSON.parse(toolCallMatch[0]) as { tool: string; args: Record<string, unknown> };
            
            // Validate tool exists
            const toolExists = tools.some((t) => t.name === toolCall.tool);
            if (toolExists) {
              console.log(`🔧 Agent calling tool: ${toolCall.tool}`);
              
              const result = await executeToolFn({
                name: toolCall.tool,
                args: toolCall.args,
              });
              
              toolsUsed.push(result);
              continue; // Loop again with new tool result
            }
          } catch {
            // Not a valid tool call JSON, treat as normal response
          }
        }

        // No tool call - this is the final response
        // Clean up any remaining tool call JSON
        const cleanMessage = assistantMessage.replace(/\{[\s\S]*"tool"[\s\S]*"args"[\s\S]*\}/g, '').trim();

        return {
          message: cleanMessage || assistantMessage,
          toolsUsed,
          metadata: {
            model: response.data.model,
            iterations: iteration + 1,
            usage: response.data.usage,
          },
        };
      } catch (error) {
        console.error(`Agent iteration ${iteration} error:`, error);
        if (iteration === maxIterations - 1) {
          throw error;
        }
      }
    }

    // Fallback response if max iterations reached
    return {
      message: 'ขออภัย ไม่สามารถประมวลผลคำขอได้ กรุณาลองใหม่',
      toolsUsed,
      metadata: {
        error: 'Max iterations reached',
      },
    };
  }

  /**
   * Get available MCP tools from Smithery registry
   */
  async getAvailableTools(): Promise<MCPTool[]> {
    if (!this.apiKey) {
      return [];
    }

    try {
      const response = await axios.get(
        `${SMITHERY_API_URL}/tools`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      return response.data.tools || [];
    } catch (error) {
      console.error('Failed to fetch MCP tools:', error);
      return [];
    }
  }

  /**
   * Check if Smithery service is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      provider: 'smithery',
      features: {
        chat: true,
        mcpTools: true,
        agentLoop: true,
      },
    };
  }
}

export const smitheryService = new SmitheryService();
