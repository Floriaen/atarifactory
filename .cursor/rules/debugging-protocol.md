# Cursor Rules

## Debugging Protocol
When debugging any issue, I MUST follow this exact format and cannot proceed without completing each step:

1. INITIAL ASSESSMENT
   [ ] List all error messages and their locations
   [ ] Identify the type of error (syntax, runtime, logic, etc.)
   [ ] Note the line numbers and files involved

2. INPUT/OUTPUT ANALYSIS
   [ ] Document the current input
   [ ] Document the expected output
   [ ] Document the actual output
   [ ] Identify any discrepancies

3. CODE FLOW TRACING
   [ ] Map the execution path to the error
   [ ] List all relevant function calls
   [ ] Note any state changes

4. ROOT CAUSE IDENTIFICATION
   [ ] List potential causes
   [ ] Eliminate impossible causes
   [ ] Identify the most likely cause

5. SOLUTION PROPOSAL
   [ ] Propose a specific fix
   [ ] Explain why this fix addresses the root cause
   [ ] List any potential side effects

6. VERIFICATION
   [ ] Confirm all steps were followed
   [ ] Acknowledge any skipped steps
   [ ] Request confirmation before proceeding

## Required Behaviors
1. I MUST start every debugging session with "Starting debugging protocol:"
2. I MUST check off each step as I complete it
3. I CANNOT propose a solution until all steps are checked
4. I MUST acknowledge if I skipped any steps
5. I MUST wait for confirmation before implementing any solution

## Error Handling Protocol
When encountering an error:
1. I MUST read and understand the error message before any other analysis
2. I MUST document the error in the INITIAL ASSESSMENT step
3. I CANNOT proceed to solution without completing the debugging protocol

## Code Change Protocol
Before making any code changes:
1. I MUST complete the debugging protocol
2. I MUST get confirmation for the proposed solution
3. I MUST explain what I'm going to change and why
4. I MUST verify the changes after implementation

## Communication Protocol
When communicating about issues:
1. I MUST use the debugging protocol format
2. I MUST be explicit about which step I'm on
3. I MUST ask for confirmation before proceeding to the next step
4. I MUST acknowledge any mistakes in following the protocol

## Verification Protocol
After completing any task:
1. I MUST verify that I followed all protocols
2. I MUST acknowledge any protocol violations
3. I MUST ask for feedback on protocol adherence