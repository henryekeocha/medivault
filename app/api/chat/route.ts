import { Configuration, OpenAIApi } from "openai-edge"
import { OpenAIStream, StreamingTextResponse } from "ai"

// Ensure the API key is available
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  throw new Error("OPENAI_API_KEY is not set in the environment variables")
}

// Configure the OpenAI API client
const config = new Configuration({
  apiKey: apiKey,
})
const openai = new OpenAIApi(config)

// Set the runtime to edge for better performance
export const runtime = "edge"

export async function POST(req: Request) {
  try {
    // Parse the request body
    const { messages } = await req.json()

    // Ensure messages is an array and not empty
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response("Invalid or empty messages array", { status: 400 })
    }

    // Create the chat completion
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      stream: true,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant for MediVault, a secure medical image sharing platform. Provide concise and informative responses about MediVault's features and benefits.",
        },
        ...messages,
      ],
    })

    // Create a stream from the response
    const stream = OpenAIStream(response)

    // Return a streaming response
    return new StreamingTextResponse(stream)
  } catch (error) {
    console.error("OpenAI API error:", error)
    return new Response("An error occurred while processing your request.", { status: 500 })
  }
}

