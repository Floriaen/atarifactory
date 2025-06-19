const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const { createGameDesignChain } = require("../../agents/langchain/GameDesignChain");
const { JsonOutputParser } = require("@langchain/core/output_parsers");
const fs = require("fs/promises");
const { ChatOpenAI } = (() => { try { return require("@langchain/openai"); } catch { return {}; } })();

describe("GameDesignChain Pipeline Tests", () => {
  // 1. Unit test: Output parser
  describe("JsonOutputParser", () => {
    it("parses markdown-wrapped JSON string", async () => {
      const parser = new JsonOutputParser();
      const llmOutput =
        '```json\n' +
        JSON.stringify({
          name: "Coin Collector",
          description: "Collect all coins while avoiding obstacles.",
          mechanics: ["move left/right", "jump"],
          winCondition: "All coins collected.",
          entities: ["player", "coin", "obstacle"]
        }) +
        '\n```';
      const result = await parser.parse(llmOutput);
      expect(result).toEqual({
        name: "Coin Collector",
        description: expect.stringContaining("Collect all coins"),
        mechanics: expect.arrayContaining(["move left/right", "jump"]),
        winCondition: expect.stringContaining("All coins collected"),
        entities: expect.arrayContaining(["player", "coin", "obstacle"])
      });
    });
  });

  // 2. Unit test: Prompt template
  describe("Prompt Template", () => {
    it("loads prompt file and checks content", async () => {
      const promptPath = path.join(__dirname, "../../agents/prompts/GameDesignAgent.prompt.md");
      const promptString = await fs.readFile(promptPath, "utf8");
      expect(promptString).toMatch(/name/);
      expect(promptString).toMatch(/description/);
      // Only fail if 'title' appears as a JSON field, not in documentation/comments
      expect(promptString).not.toMatch(/"title"\s*:/);
    });
  });

  // 3. Contract test: mock chain
  describe("Mock chain contract", () => {
    it("returns correct output shape", async () => {
      const mockChain = {
        invoke: async () => ({
          name: "Coin Collector",
          description: "Collect all coins while avoiding obstacles.",
          mechanics: ["move left/right", "jump"],
          winCondition: "All coins collected.",
          entities: ["player", "coin", "obstacle"]
        })
      };
      const result = await mockChain.invoke({ name: "Coin Collector", description: "Collect all coins while avoiding obstacles." });
      expect(result).toBeDefined();
      expect(result.name).toBe("Coin Collector");
      expect(result.entities).toContain("coin");
      expect(Array.isArray(result.mechanics)).toBe(true);
      expect(result.winCondition).toMatch(/All coins collected/);
    });
  });

  // 4. Integration test: real chain, real LLM
  describe("Integration (real chain, real LLM)", () => {
    const hasKey = !!process.env.OPENAI_API_KEY;
    (hasKey ? it : it.skip)("runs end-to-end with real LLM", async () => {
      const chain = await createGameDesignChain();
      const result = await chain.invoke({ name: "Coin Collector", description: "Collect all coins while avoiding obstacles." });
      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.entities).toBeDefined();
      expect(Array.isArray(result.mechanics)).toBe(true);
      expect(result.winCondition).toBeDefined();
    });
  });
});
