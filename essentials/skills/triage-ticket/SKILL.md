---
name: triage-ticket
description: >
  Use when the user wants to triage a JIRA ticket, analyze a bug report or feature request,
  assess ticket readiness, scope changes, or evaluate a ticket before sprint planning.
  Triggers: triage, ticket, bug report, feature request, JIRA, scope, assess ticket,
  ticket review, sprint planning prep.
compatibility: claude-code, cursor
metadata:
  version: "1.0.0"
---

# Triage a JIRA Ticket

## Overview

Your task is to triage a ticket, which is either a bug or a feature request. The purpose of triage is
1. to determine if the ticket is sufficiently described and if it's ready to be worked on
2. help the user and their team understand the scope of the ticket and a first rough estimate of the effort required.

Do not offer time estimates, just list the scope of changes, point out risks and dependencies.

## Get the ticket Content

Every ticket has a unique identifier (JIRA ID, like `FOO-123`) and a title.
The content of the ticket is either provided by the user pasting in the text (and possibly images or paths to locally donwloaded files like attachments).
or by the user providing an ID of the ticket or a link to the ticket (contains the ID). You need to fetch the ticket content from using the Atlassian-MCP-Server.
If critical information is only in linked files (e.g. "Example Input Data File", "Example Result Data File", "Change Translations according to the linked Google Sheet"), try to download the files.
Check if the files are accessible. Even if the download succeeds, check if the files are actually usable and if not, ask the user for help.
DO NOT continue with the next steps until you have the ticket content available, if there are permissions or other technical issues, ask the user for help.

## Triage a Bug ticket

1. Read the ticket description carefully, including the comments and "actual" and "expected" behavior. Check if the ticket description is up to date with the latest comments.
2. Read the "steps to reproduce" section carefully and determine if the bug is reproducible and the steps are clear. Ask the User if the reproduction was already done, note the results if available or offer help with reproducing the bug.
3. Point out any inconsistencies or missing information and ask the user for clarification. If the open questions are critical for further steps, abort the research and just report the findings to the user so that ticket can be improved by clarifying the description, answering the questions and adding the missing information.
4. Research the bug in the codebase, try to find the root cause and propose a solution. Do not implement the solution yourself, but propose a plan of action. If it's a simple fix, propose a specific code snippet or a small change that can be made to fix the bug. For more complex fixes, propose several possible solutions with distinctive upsides and downsides for each of them so the team can make an educated decision.

## Triage a Feature ticket

1. Read the ticket description carefully, including the comments and "actual" and "expected" behavior. Check if the ticket description is up to date with the latest comments.
2. Read the "Acceptance Criteria" section carefully and determine if the feature is well defined and the criteria are clear and testable.
3. Point out any inconsistencies or missing information and ask the user for clarification. If the open questions are critical for further steps, abort the research and just report the findings to the user so that ticket can be improved by clarifying the description, answering the questions and adding the missing information.
4. Research the feature in the codebase, find pointers in the code for extension or alteration. Consult the section "Business Notes" or "Technical Notes" for an initial starting point. Consult documentation about the architecture of the system as well. Do not implement the solution yourself, but propose a plan of action. If it's a simple change, propose a specific code snippet or describe the solution. For more complex changes, propose several possible solutions with distinctive upsides and downsides for each of them so the team can make an educated decision. If you determine the feature can't be implemented, provide a list of specific questions for the team.
