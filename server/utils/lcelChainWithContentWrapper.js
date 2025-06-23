// Compose a LangChain LCEL pipeline that ensures the parser always receives { content: ... }
// 1. prompt.pipe(llm): feeds formatted prompt to the LLM
// 2. .pipe(RunnableLambda.from(llmResult => ({ content: llmResult }))):
//    Ensures the parser always receives an object with a `content` property, regardless of LLM output shape.
//    This is necessary because some LLMs/mocks may return a string directly, but the parser expects `{ content: ... }`.
//    Prevents subtle bugs if LangChain optimizes away steps or if LLMs/mocks have inconsistent output shapes.
// 3. .pipe(RunnableLambda.from(parseLLMOutput)): parses and validates the final result.
// Usage: lcelChainWithContentWrapper(prompt, llm, parserFn)
import { RunnableLambda } from '@langchain/core/runnables';

/**
 * Compose a pipeline: prompt.pipe(llm).pipe(wrapContentForParser).pipe(parser)
 * @param {PromptTemplate} prompt - LangChain prompt
 * @param {BaseLLM} llm - LangChain LLM or mock
 * @param {function} parserFn - Function to parse { content }
 * @returns {RunnableSequence}
 */
export function lcelChainWithContentWrapper(prompt, llm, parserFn) {
  return prompt
    .pipe(llm)
    .pipe(RunnableLambda.from(llmResult => ({ content: llmResult })))
    .pipe(RunnableLambda.from(parserFn));
}
