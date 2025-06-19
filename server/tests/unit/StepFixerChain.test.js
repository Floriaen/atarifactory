const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const { createStepFixerChain } = require("../../agents/langchain/StepFixerChain");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const fs = require("fs/promises");
const { ChatOpenAI } = (() => { try { return require("@langchain/openai"); } catch { return {}; } })();

describe("StepFixerChain Pipeline Tests", () => {
  // 1. Unit test: Output parser
  describe("StringOutputParser", () => {
    it("parses string output", async () => {
      const parser = new StringOutputParser();
      const llmOutput = 'function addPlayer() {\n  player = { x: 0, y: 0 };\n}';
      const result = await parser.parse(llmOutput);
      expect(typeof result).toBe("string");
      expect(result).toMatch(/addPlayer/);
    });
  });

  // 2. Unit test: Prompt template
  describe("Prompt Template", () => {
    it("loads prompt file and checks content", async () => {
      const promptPath = path.join(__dirname, "../../agents/prompts/StepFixerAgent.prompt.md");
      const promptString = await fs.readFile(promptPath, "utf8");
      expect(promptString).toMatch(/currentCode/);
      expect(promptString).toMatch(/step/);
      expect(promptString).toMatch(/errorList/);
    });
  });

  // 3. Contract test: mock chain
  describe("Mock chain contract", () => {
    it("returns correct output shape", async () => {
      const mockChain = {
        invoke: async () => 'function addCoin() { coin = { x: 1, y: 2 }; }'
      };
      const result = await mockChain.invoke({
        currentCode: 'function addCoin() {}',
        step: 'Add coin entity',
        errorList: JSON.stringify(["coin is not defined"])
      });
      expect(typeof result).toBe("string");
      expect(result).toMatch(/addCoin/);
    });
  });

  // 4. Integration test: real chain, real LLM
  describe("Integration (real chain, real LLM)", () => {
    const hasKey = !!process.env.OPENAI_API_KEY;
    (hasKey ? it : it.skip)("runs end-to-end with real LLM", async () => {
      const chain = await createStepFixerChain();
      const currentCode = 'function addPlayer() {\n  // TODO: implement\n}';
      const step = 'Add player entity';
      const errorList = JSON.stringify(["player is not defined"]);
      const rawResult = await chain.invoke({ currentCode, step, errorList });
      const { extractJsCodeBlocks } = require('../../utils/formatter');
      const code = extractJsCodeBlocks(rawResult);
      // LLM output may vary greatly; for integration we only require non-empty code and that it mentions 'player'.
      expect(typeof code).toBe("string");
      expect(code.length).toBeGreaterThan(0);
      expect(/player/i.test(code)).toBe(true);
    });
  });
});
