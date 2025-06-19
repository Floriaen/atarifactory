const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const { createGameInventorChain } = require("../../agents/langchain/GameInventorChain");
const { JsonOutputParser } = require("@langchain/core/output_parsers");
const fs = require("fs/promises");
const { ChatOpenAI } = (() => { try { return require("@langchain/openai"); } catch { return {}; } })();

describe("GameInventorChain Pipeline Tests", () => {
  // 1. Unit test: Output parser
  describe("JsonOutputParser", () => {
    it("parses markdown-wrapped JSON string", async () => {
      const parser = new JsonOutputParser();
      const llmOutput =
        '```json\n' +
        JSON.stringify({
          name: "The Invincible Knight",
          description: "A proud knight crossing a dark forest to win the heart of a beautiful princess."
        }) +
        '\n```';
      const result = await parser.parse(llmOutput);
      expect(result).toEqual({
        name: "The Invincible Knight",
        description: expect.stringContaining("knight crossing a dark forest")
      });
    });
  });

  // 2. Unit test: Prompt template
  describe("Prompt Template", () => {
    it("loads prompt file and checks content", async () => {
      const promptPath = path.join(__dirname, "../../agents/prompts/GameInventorChain.prompt.md");
      const promptString = await fs.readFile(promptPath, "utf8");
      expect(promptString).toMatch(/name/);
      expect(promptString).not.toMatch(/\{.*\}/); // No variables
    });
  });

  // 3. Contract test: mock chain
  describe("Mock chain contract", () => {
    it("returns correct output shape", async () => {
      const mockChain = {
        invoke: async () => ({
          name: "The Invincible Knight",
          description: "A proud knight crossing a dark forest to win the heart of a beautiful princess."
        })
      };
      const result = await mockChain.invoke({});
      expect(result).toBeDefined();
      expect(result.name).toBe("The Invincible Knight");
      expect(result.description).toMatch(/knight crossing a dark forest/);
    });
  });

  // 4. Integration test: real chain + real LLM (skipped unless API key)
  describe("Integration (real chain, real LLM)", () => {
    const apiKey = process.env.OPENAI_API_KEY;
    const shouldRun = !!(apiKey && ChatOpenAI);
    (shouldRun ? it : it.skip)("runs end-to-end with real LLM", async () => {
      const chain = await createGameInventorChain(new ChatOpenAI({ temperature: 0, openAIApiKey: apiKey }));
      const result = await chain.invoke({});
      expect(result).toBeDefined();
      expect(result.name).toBeTruthy();
      expect(result.description).toBeTruthy();
    });
  });


});
