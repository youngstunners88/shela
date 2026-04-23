# 01-verify — Agent Interview

## Context
User just opened Shela. Unknown intent, unknown safety profile.

## Agent Role
Interviewer — assesses safety signals through conversation.

## Output
Safety score (0-100) + verified profile + routing decision.

## Trigger
Score ≥70 → route to 02-match
Score <70 → loop or exit

## Implementation
Hermes agent with 5-7 adaptive questions based on response patterns.

## Key
Ask questions that predict safe meets. Store outcomes to train model.
