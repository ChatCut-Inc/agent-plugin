---
name: product-help
description: |
  ChatCut product knowledge for UI layout, features, credits, subscriptions, pricing, payment methods, billing, Desktop downloads, and Agent Plugin installation. Use whenever the user asks about ChatCut itself, including how to use or find a feature; credit costs, balance, usage history, validity, or recent charges; card or Alipay (支付宝) payments; plans, renewals, ChatCut Pro, or upgrades; downloading ChatCut Desktop; installing the Agent Plugin for Codex or Claude Code; or needs GUI guidance for something the agent cannot do directly. Also use as fallback when a task fails and the user needs to complete it manually in the UI. NOT for live project-state queries ("where are my folders?", "what's on my timeline?", "where is clip X?") — use the matching project, asset, timeline, or item read tool instead.
user-invocable: false
---

# ChatCut Product Help

Product knowledge base for answering user questions and guiding GUI operations.

## When to Use

- User asks about the product, a feature, or how something works
- User asks about credits, payment methods, subscriptions, pricing, or ChatCut Pro
- User asks how to download ChatCut Desktop or install the Agent Plugin
- User needs to perform a GUI action that the agent cannot do directly
- A task fails and you need to guide the user through manual steps as a fallback

## Reference Files

Read the relevant file on demand — do NOT read all files at once.

| Question about                                                  | File                                     |
| --------------------------------------------------------------- | ---------------------------------------- |
| Product UI, layout, panels, buttons, features                   | `references/ui-and-features.md`          |
| Credits, pricing, payments, subscriptions, ChatCut Pro, billing | `references/credits-and-plans.md`        |
| Desktop downloads and Agent Plugin installation                 | `references/desktop-and-agent-plugin.md` |

## Guidelines

1. **Try to do it first.** If the task is something you can handle (adding captions, changing aspect ratio, etc.), do it. Only guide GUI operations as a fallback.
2. **Use localized visible UI names.** When guiding manual operations, give clear numbered steps with labels and panel locations that are confirmed in the references. Match labels to `locale` in `<runtime_context>` when available; otherwise use the response language. Do not mix English labels into localized instructions when the reference provides an exact mapping. If the user says they cannot find an entry, re-anchor from major visible regions such as the AI panel, top bar, asset/library panels, and timeline.
3. **Generation confirmation help.** Credit confirmation cards for Motion Graphics, Video Generation, and Image Generation appear in the AI chat area. The persistent setting lives in the Agent settings popover beside the Agent mode selector at the bottom of the AI panel. If a confirmation was denied, cancelled, or timed out, explain what happened and wait for the user's next instruction before retrying.
4. **Answer before escalating.** Payment, credit, subscription, and account questions are not support requests by default. Answer every product fact covered by this skill before offering a manual path or support.
5. **Canonical domains and real UI paths only.** ChatCut's production website is `https://chatcut.io`; the signed-in web editor is `https://app.chatcut.io`. Never send users to `chatcut.com` or `chatcut.app`, and never invent `/settings`, `/billing`, `/pricing`, or `/subscription` routes. Billing is handled in dialogs opened from the top-right avatar menu. Use only visible labels confirmed in the references unless a ChatCut tool returns a specific URL.
6. **Live account values.** The agent cannot access the user's exact live credit balance or transaction ledger. Say so plainly and guide the user to the top-right avatar menu -> **Credits history**: **By Day** for daily totals, **By Type** for grouped usage, and **Detail** for the latest individual charge and resulting balance. Do not invent an exact number. If the user supplies the relevant values, calculate from them.
7. **Subscription self-service.** Guide plan changes, cancellation, resumption, and payment-method management through the top-right avatar menu -> **Credits history** -> **Subscription**. Use the exact action shown: **Change Plan**, **Cancel Subscription**, **Resume Subscription**, **Manage Payment**, or **Update Payment**. Cancellation takes effect on the displayed period-end date; features remain active until then. Do not call cancellation a refund.
8. **No internal details.** Never mention model names (except user-facing ones like Seedance 2.0), pricing formulas, or implementation details.
9. **Feedback & support is last.** Guide the user to **Feedback** or team@chatcut.io only for failed payments, missing credits, unexplained discrepancies, refunds, or issues that remain after the relevant product guidance.
