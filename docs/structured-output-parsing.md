# LangChain Structured Output Parsing: Best Practices

This document summarizes the state-of-the-art approach for reliably parsing structured LLM output using LangChain JS/TS, especially when using `JsonOutputParser` and the LCEL `.pipe` composition.

## Best Practice Steps

1. **Prompt the LLM for a Markdown JSON Code Block**
   - Instruct the LLM to output a markdown code block with JSON, e.g.:
     ```
     Please answer in the following JSON format:
     ```json
     {
       "entities": ["foo", "bar"]
     }
     ```
     ```
2. **LLM Output**
   - The LLM returns an object: `{ content: "```json\n{ ... }\n```" }`
3. **Pipe to Extract `.content`**
   - Use a mapping step to extract the string:
     ```js
     .pipe(RunnableLambda.from(({ content }) => content))
     ```
4. **Pipe to the Parser**
   - Pass the string to `JsonOutputParser`:
     ```js
     .pipe(new JsonOutputParser())
     ```
5. **Test Mocks**
   - When mocking LLMs in tests, return a markdown code block string in `content`.

---

## Summary Table

| Step         | Best Practice                                              |
|--------------|-----------------------------------------------------------|
| Prompt       | Ask for markdown JSON code block                          |
| LLM Output   | `{ content: "```json ... ```" }`                          |
| Pipe         | `.pipe(RunnableLambda.from(({ content }) => content))`    |
| Parser       | `.pipe(new JsonOutputParser())`                           |
| Test Mocks   | Return markdown code block string in `content`            |

---

## References
- [LangChain JS Cookbook: Output Parsers](https://js.langchain.com/docs/modules/model_io/output_parsers/)
- [LangChain JS Tests](https://github.com/langchain-ai/langchainjs/tree/main/langchain/tests)
- [LangChain JS Docs: LCEL](https://js.langchain.com/docs/expression_language/)
